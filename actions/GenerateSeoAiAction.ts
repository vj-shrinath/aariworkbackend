import {useState} from 'react'
import {DocumentActionComponent, DocumentActionProps, useDocumentOperation} from 'sanity'

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
    label: isGenerating ? 'Generating SEO & AI...' : 'Generate SEO & AI',
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
        const responseText = await response.text()
        let result: any = null
        try {
          result = responseText ? JSON.parse(responseText) : null
        } catch {
          result = null
        }
        if (!response.ok) throw new Error(result?.error || `Server error (HTTP ${response.status}): ${responseText.slice(0, 150) || 'Empty response'}`)

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

        const excerpt = doc.excerpt || result.excerpt || result.seo?.description || ''
        patch.execute([{set: {excerpt, seo, ai, geo}}])
        alert('SEO, AI, and GEO fields generated. Review them, then publish the post.')
        props.onComplete()
      } catch (error) {
        console.error('SEO/AI generation error:', error)
        const errMsg = (error as Error).message
        if (errMsg === 'Failed to fetch') {
          alert(`Generation failed: Could not connect to the backend AI endpoint (${AI_ENDPOINT}).\n\nPlease ensure your backend API server (e.g. Next.js on localhost:3000) is running and accessible.`)
        } else {
          alert(`Generation failed: ${errMsg}`)
        }
      } finally {
        setIsGenerating(false)
      }
    },
  }
}
