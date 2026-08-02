import {useState} from 'react'
import {DocumentActionComponent, DocumentActionProps, useDocumentOperation} from 'sanity'
import {generateTranslationUpdates} from './GenerateTranslationsAction'

const AI_ENDPOINT = process.env.SANITY_STUDIO_AI_ENDPOINT || 'https://aariworkdesigns.com/api/ai/generate-post-metadata'

function portableTextToPlainText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((block: any) => {
      if (block?._type !== 'block' || !Array.isArray(block.children)) return ''
      return block.children.map((child: any) => child?.text || '').join('')
    })
    .filter(Boolean)
    .join('\n\n')
}

export const GenerateSeoAiAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const {patch} = useDocumentOperation(props.id, props.type)

  return {
    label: isGenerating ? 'Generating SEO, AI & translations...' : 'Generate SEO, AI & translations',
    disabled: isGenerating,
    onHandle: async () => {
      const doc = (props.draft || props.published) as any
      if (!doc?.title || !doc?.body?.length) {
        alert('Add a title and article body before generating metadata.')
        return
      }

      setIsGenerating(true)
      try {
        const response = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            title: doc.title,
            excerpt: doc.excerpt || '',
            body: portableTextToPlainText(doc.body),
            slug: doc.slug?.current || '',
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result?.error || 'Generation failed.')

        const seo = {
          ...(doc.seo || {}),
          ...result.seo,
        }
        const ai = {
          ...(doc.ai || {}),
          ...result.ai,
        }
        const geo = {
          ...(doc.geo || {}),
          ...result.geo,
        }

        const translationUpdates = await generateTranslationUpdates(doc)
        patch.execute([{set: {seo, ai, geo, ...translationUpdates}}])
        alert('SEO, AI, GEO, and all language translations generated. Review them, then publish the post.')
        props.onComplete()
      } catch (error) {
        console.error('SEO/AI generation error:', error)
        alert(`Generation failed: ${(error as Error).message}`)
      } finally {
        setIsGenerating(false)
      }
    },
  }
}
