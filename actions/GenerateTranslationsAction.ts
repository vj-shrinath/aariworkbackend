import {useState} from 'react'
import {DocumentActionComponent, DocumentActionProps, useDocumentOperation} from 'sanity'

const AI_ENDPOINT = process.env.SANITY_STUDIO_AI_ENDPOINT || 'https://aariworkdesigns.com/api/ai/translate-post'
export const locales = ['hi', 'mr', 'ta', 'te', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko'] as const

type Segment = {id: string; text: string}
const SEGMENTS_PER_REQUEST = 60
const REQUEST_DELAY_MS = 5000

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function getSegments(body: any[]): Segment[] {
  const segments: Segment[] = []
  body.forEach((block, blockIndex) => {
    if (!Array.isArray(block?.children)) return
    block.children.forEach((child: any, childIndex: number) => {
      if (typeof child?.text === 'string' && child.text.trim()) {
        segments.push({id: `${blockIndex}:${childIndex}`, text: child.text})
      }
    })
  })
  return segments
}

export function applySegments(body: any[], translatedSegments: Segment[]): any[] {
  const translated = new Map(translatedSegments.map((segment) => [segment.id, segment.text]))
  return body.map((block, blockIndex) => {
    if (!Array.isArray(block?.children)) return block
    return {
      ...block,
      children: block.children.map((child: any, childIndex: number) => ({
        ...child,
        ...(translated.has(`${blockIndex}:${childIndex}`) && {text: translated.get(`${blockIndex}:${childIndex}`)}),
      })),
    }
  })
}

export async function generateTranslationUpdates(
  doc: any,
  onLocaleComplete?: (locale: string, update: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  const segments = Array.isArray(doc?.body) ? getSegments(doc.body) : []
  if (!doc?.title || !segments.length) {
    throw new Error('Add an English title and article body before translating.')
  }

  // Older posts may not have the newer top-level excerpt field. Use existing
  // SEO copy or the opening article text so translation-only still works.
  const sourceExcerpt = doc.excerpt || doc.seo?.description || segments.slice(0, 2).map((segment) => segment.text).join(' ').slice(0, 500)
  const sourceAi = doc.ai && typeof doc.ai === 'object' ? doc.ai : null

  const updates: Record<string, unknown> = {}
  for (const locale of locales) {
    const translatedSegments: Segment[] = []
    let translatedAi: Record<string, unknown> | null = null
    let translatedTitle = ''
    let translatedExcerpt = ''
    const chunks = Array.from({length: Math.ceil(segments.length / SEGMENTS_PER_REQUEST)}, (_, index) =>
      segments.slice(index * SEGMENTS_PER_REQUEST, (index + 1) * SEGMENTS_PER_REQUEST),
    )

    for (const [chunkIndex, chunk] of chunks.entries()) {
      let result: any = null
      let lastError = `Translation failed for ${locale}.`
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(AI_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              locale,
              title: doc.title,
              excerpt: sourceExcerpt,
              ai: chunkIndex === 0 ? sourceAi : undefined,
              segments: chunk,
            }),
          })
          const responseText = await response.text()
          try {
            result = responseText ? JSON.parse(responseText) : null
          } catch {
            result = null
          }
          if (response.ok && result?.segments) break
          lastError = result?.error || `Translation failed for ${locale}.`
          if (response.status !== 429 && response.status < 500) break
        } catch (error) {
          lastError = `Network error while translating ${locale}: ${(error as Error).message}`
        }
        await wait(5000 * (attempt + 1))
      }

      if (!result?.segments) throw new Error(lastError || `Translation failed for ${locale}.`)
      if (!translatedTitle) translatedTitle = result.title || ''
      if (!translatedExcerpt) translatedExcerpt = result.excerpt || ''
      if (chunkIndex === 0 && result.ai && typeof result.ai === 'object') translatedAi = result.ai
      translatedSegments.push(...result.segments)
      await wait(REQUEST_DELAY_MS)
    }

    const localeUpdate = {
      [`title_${locale}`]: translatedTitle,
      [`excerpt_${locale}`]: translatedExcerpt,
      [`body_${locale}`]: applySegments(doc.body, translatedSegments),
      ...(translatedAi ? {[`ai_${locale}`]: translatedAi} : {}),
    }
    onLocaleComplete?.(locale, localeUpdate)
    Object.assign(updates, localeUpdate)
  }
  return updates
}

export const GenerateTranslationsAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const {patch} = useDocumentOperation(props.id, props.type)

  return {
    label: isGenerating ? 'Translating all languages...' : 'Translate All Languages',
    disabled: isGenerating,
    onHandle: async () => {
      const doc = (props.draft || props.published) as any
      setIsGenerating(true)
      try {
        await generateTranslationUpdates(doc, (_locale, update) => {
          // Save one locale at a time so large legacy articles do not exceed
          // Sanity's patch payload limits.
          patch.execute([{set: update}])
        })
        alert('All language translations generated. Review them in the Translations group, then publish.')
        props.onComplete()
      } catch (error) {
        console.error('Translation generation error:', error)
        alert(`Translation failed: ${(error as Error).message}`)
      } finally {
        setIsGenerating(false)
      }
    },
  }
}
