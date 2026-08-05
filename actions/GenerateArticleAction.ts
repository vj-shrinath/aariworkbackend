import {useState} from 'react'
import {DocumentActionComponent, DocumentActionProps, useDocumentOperation} from 'sanity'

// Dynamically construct endpoint from the environment if present
const AI_ENDPOINT = (() => {
  const envEndpoint = process.env.SANITY_STUDIO_AI_ENDPOINT
  if (envEndpoint) {
    const clean = envEndpoint.trim().replace(/\/$/, '')
    if (clean.includes('/api/ai/')) {
      const base = clean.replace(/\/api\/ai\/.*$/, '')
      return `${base}/api/ai/generate-post-body`
    }
    return `${clean}/api/ai/generate-post-body`
  }
  // Dynamic fallback for local development vs production website backend
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3000/api/ai/generate-post-body'
  }
  return 'https://aariworkdesigns.com/api/ai/generate-post-body'
})()

export const GenerateArticleAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const {patch} = useDocumentOperation(props.id, props.type)

  return {
    label: isGenerating ? 'Generating Article...' : 'Generate AI Article',
    disabled: isGenerating,
    onHandle: async () => {
      const doc = (props.draft || props.published) as any
      if (!doc?.generationBrief && !doc?.generationKeywords) {
        alert('Please fill out the Target Keywords or Brief/Outline Summary under the "AI Creator Brief" tab first.')
        return
      }

      setIsGenerating(true)
      try {
        const response = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            title: doc.title || '',
            keywords: doc.generationKeywords || '',
            brief: doc.generationBrief || '',
            tone: doc.generationTone || '',
            wordCount: doc.generationWordCount || 1000,
          }),
        })
        const responseText = await response.text()
        let result: any = null
        try {
          result = responseText ? JSON.parse(responseText) : null
        } catch {
          result = null
        }

        if (!response.ok) {
          if (response.status === 504 || response.status === 502) {
            throw new Error(`Server Timeout (HTTP ${response.status}). The AI generation exceeded Vercel's serverless execution limit.\n\nTips:\n- Try lowering the Target Word Count (e.g. 500-800 words).\n- Ensure maxDuration is configured in your Vercel API route.`)
          }
          throw new Error(result?.error || `Server returned error (HTTP ${response.status}): ${responseText.slice(0, 150) || 'Empty response'}`)
        }

        if (!result || !Array.isArray(result.body)) {
          throw new Error(result?.error || 'Invalid article body format received from generator.')
        }

        // Generate unique _key for every block and child span
        const generateKey = () => Math.random().toString(36).substring(2, 11)
        const keyedBody = result.body.map((block: any) => ({
          ...block,
          _key: block._key || generateKey(),
          children: Array.isArray(block.children)
            ? block.children.map((child: any) => ({
                ...child,
                _key: child._key || generateKey(),
              }))
            : [],
        }))

        // Calculate word count
        let wordCount = 0
        keyedBody.forEach((block: any) => {
          if (Array.isArray(block.children)) {
            block.children.forEach((child: any) => {
              if (typeof child.text === 'string') {
                wordCount += child.text.trim().split(/\s+/).filter(Boolean).length
              }
            })
          }
        })

        const updates: Record<string, any> = {
          body: keyedBody,
          wordCount: wordCount,
        }

        // Set title if empty
        if (result.title && (!doc.title || doc.title.trim() === '')) {
          updates.title = result.title
        }

        // Set SEO meta description if returned by AI
        if (result.metaDescription && typeof result.metaDescription === 'string') {
          updates['seo.description'] = result.metaDescription.slice(0, 160)
        }

        patch.execute([{set: updates}])
        alert(`Article generated successfully!\n\n📝 ${wordCount} words\n📋 Meta description ${result.metaDescription ? 'auto-filled' : 'not generated'}`)
        props.onComplete()
      } catch (error) {
        console.error('Article generation error:', error)
        const errMsg = (error as Error).message
        if (errMsg === 'Failed to fetch') {
          alert(`Generation failed: Could not connect to the backend AI endpoint (${AI_ENDPOINT}).\n\nPossible causes:\n1. If running locally, ensure your Next.js server is running on http://localhost:3000.\n2. Check your network connection or CORS settings on the API server.`)
        } else {
          alert(`Generation failed: ${errMsg}`)
        }
      } finally {
        setIsGenerating(false)
      }
    },
  }
}
