import {useState} from 'react'
import {DocumentActionComponent, DocumentActionProps, useDocumentOperation} from 'sanity'

const AI_ENDPOINT = process.env.SANITY_STUDIO_AI_ENDPOINT || 'https://aariworkdesigns.com/api/ai/translate-post'
export const locales = ['hi', 'mr', 'ta', 'te', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko'] as const

type Segment = {id: string; text: string}

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

export async function generateTranslationUpdates(doc: any): Promise<Record<string, unknown>> {
  const segments = Array.isArray(doc?.body) ? getSegments(doc.body) : []
  if (!doc?.title || !segments.length) {
    throw new Error('Add an English title and article body before translating.')
  }

  const updates: Record<string, unknown> = {}
  for (const locale of locales) {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({locale, title: doc.title, excerpt: doc.excerpt || '', segments}),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.error || `Translation failed for ${locale}.`)

    updates[`title_${locale}`] = result.title
    updates[`excerpt_${locale}`] = result.excerpt
    updates[`body_${locale}`] = applySegments(doc.body, result.segments)
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
        patch.execute([{set: await generateTranslationUpdates(doc)}])
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
