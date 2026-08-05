import React, {useState, useEffect} from 'react'
import {DocumentActionComponent, DocumentActionProps, useClient, useDocumentOperation} from 'sanity'
import {Card, Stack, Text, Flex, Button, Checkbox, Box, Spinner} from '@sanity/ui'

// Custom serializer to map Sanity Portable Text to clean semantic HTML
export function portableTextToHtml(blocks: any[], markDefs: any[] = []): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''
  
  let html = ''
  let inList = false
  let listType: 'ul' | 'ol' | null = null

  blocks.forEach((block) => {
    // If it's a list item, manage the list wrappers
    if (block.listItem) {
      const currentListType = block.listItem === 'number' ? 'ol' : 'ul'
      if (!inList) {
        inList = true
        listType = currentListType
        html += `<${listType}>`
      } else if (listType !== currentListType) {
        html += `</${listType}><${currentListType}>`
        listType = currentListType
      }
      
      const content = renderBlockChildren(block, markDefs)
      html += `<li>${content}</li>`
      return
    }

    // Close list if we moved out of list blocks
    if (inList && listType) {
      html += `</${listType}>`
      inList = false
      listType = null
    }

    if (block._type !== 'block') return

    const tagMap: Record<string, string> = {
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      blockquote: 'blockquote',
      normal: 'p',
    }
    const tag = tagMap[block.style || 'normal'] || 'p'
    const content = renderBlockChildren(block, markDefs)
    html += `<${tag}>${content}</${tag}>`
  })

  // Final list closing guard
  if (inList && listType) {
    html += `</${listType}>`
  }

  return html
}

function renderBlockChildren(block: any, extraMarkDefs: any[] = []): string {
  if (!Array.isArray(block.children)) return ''
  
  const blockMarkDefs = block.markDefs || []
  const allMarkDefs = [...blockMarkDefs, ...extraMarkDefs]

  return block.children
    .map((child: any) => {
      if (child._type !== 'span') return ''
      let text = child.text || ''
      
      // Escape HTML entities
      text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

      if (Array.isArray(child.marks)) {
        // Sort marks to ensure nesting structure
        child.marks.forEach((mark: string) => {
          if (mark === 'strong') {
            text = `<strong>${text}</strong>`
          } else if (mark === 'em') {
            text = `<em>${text}</em>`
          } else if (mark === 'code') {
            text = `<code>${text}</code>`
          } else {
            // Check link definition
            const linkDef = allMarkDefs.find((def) => def._key === mark && def._type === 'link')
            if (linkDef && linkDef.href) {
              text = `<a href="${linkDef.href}" target="_blank" rel="noopener noreferrer">${text}</a>`
            }
          }
        })
      }
      return text
    })
    .join('')
}

export const PushToWebsitesAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [websites, setWebsites] = useState<any[]>([])
  const [selectedSites, setSelectedSites] = useState<Record<string, boolean>>({})
  const [statusMessage, setStatusMessage] = useState('')
  const client = useClient({apiVersion: '2024-05-16'})

  useEffect(() => {
    if (showModal) {
      setLoading(true)
      setStatusMessage('')
      client.fetch(`*[_id == "serviceSettings"][0]`).then((settings) => {
        const sites = settings?.connectedWebsites || []
        setWebsites(sites)
        
        // Auto-select the targetWebsite linked to this post
        const doc = (props.draft || props.published) as any
        const initialSelected: Record<string, boolean> = {}
        
        sites.forEach((site: any) => {
          const siteId = site.siteId?.current
          if (doc?.targetWebsite && siteId === doc.targetWebsite) {
            initialSelected[siteId] = true
          } else if (!doc?.targetWebsite && sites.length === 1) {
            // Default select the only site if none set
            initialSelected[siteId] = true
          } else {
            initialSelected[siteId] = false
          }
        })
        setSelectedSites(initialSelected)
        setLoading(false)
      }).catch(err => {
        console.error("Error loading settings in action:", err)
        setLoading(false)
      })
    }
  }, [showModal, client, props.draft, props.published])

  const handleToggle = (siteId: string) => {
    setSelectedSites((prev) => ({
      ...prev,
      [siteId]: !prev[siteId],
    }))
  }

  const handlePush = async () => {
    const activeSites = websites.filter(site => selectedSites[site.siteId?.current])
    if (activeSites.length === 0) {
      alert('Please select at least one site to sync.')
      return
    }

    setLoading(true)
    setStatusMessage('Preparing post payload...')

    try {
      // Fetch full post details (resolved image URL etc.)
      const query = `*[_id == $docId][0]{
        _id,
        title,
        excerpt,
        "slug": slug.current,
        body,
        "mainImageUrl": mainImage.asset->url,
        "categories": categories[]->title,
        seo,
        ai,
        geo,
        targetWebsite
      }`
      
      const docData = await client.fetch(query, {docId: props.id})
      
      if (!docData) {
        throw new Error('Unable to retrieve latest post details from Sanity.')
      }

      // Fetch global settings for layout preferences
      const settings = await client.fetch(`*[_id == "serviceSettings"][0]`)
      const layout = settings?.layoutPreferences || {}
      
      // Start HTML rendering
      let postHtml = ''

      // 1. Image Arrangement
      if (layout.includeMainImageInBody && docData.mainImageUrl) {
        postHtml += `<p><img src="${docData.mainImageUrl}" alt="${docData.title}" class="aligncenter size-large" /></p>\n`
      }

      // 2. Body Text Serializer
      const bodyHtml = portableTextToHtml(docData.body || [])
      postHtml += bodyHtml

      // 3. FAQ Arrangement
      if (layout.faqPlacement === 'end' && docData.ai?.directAnswer) {
        postHtml += `\n<h2>Frequently Asked Questions</h2>\n`
        postHtml += `<p><strong>Question:</strong> What is the main takeaway?</p>\n`
        postHtml += `<p>${docData.ai.directAnswer}</p>\n`
        
        if (Array.isArray(docData.ai.keyTakeaways) && docData.ai.keyTakeaways.length > 0) {
          postHtml += `<p><strong>Key facts to understand:</strong></p>\n<ul>`
          docData.ai.keyTakeaways.forEach((takeaway: string) => {
            postHtml += `<li>${takeaway}</li>`
          })
          postHtml += `</ul>`
        }
      }

      // 4. CTA Arrangement
      if (layout.ctaPlacement === 'end') {
        postHtml += `\n<hr />\n<div class="blog-cta-box" style="padding: 20px; background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid #cc0000; margin-top: 30px;">`
        postHtml += `<h4 style="margin-top:0;">Enjoyed this tutorial?</h4>`
        postHtml += `<p>Let us know your thoughts in the comments below! Share this tutorial with your stitching friends to support our creative community.</p>`
        postHtml += `</div>`
      }

      // Sync across selected destinations
      for (const site of activeSites) {
        const siteId = site.siteId?.current
        setStatusMessage(`Syncing to ${site.name}...`)

        const payload = {
          sanity_id: docData._id,
          title: docData.title,
          slug: docData.slug,
          excerpt: docData.excerpt,
          body_html: postHtml,
          main_image_url: docData.mainImageUrl,
          categories: docData.categories || [],
          seo_title: docData.seo?.title || docData.title,
          seo_desc: docData.seo?.description || docData.excerpt || '',
        }

        if (site.platform === 'wordpress_plugin') {
          // Direct POST call to plugin endpoint
          const syncUrl = `${site.url.replace(/\/$/, '')}/wp-json/sanity-blog-bridge/v1/sync`
          
          const response = await fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sanity-Sync-Token': site.syncToken || '',
            },
            body: JSON.stringify(payload),
          })

          const resText = await response.text()
          let resData: any = {}
          try {
            resData = JSON.parse(resText)
          } catch {
            resData = { error: resText || 'Server returned invalid response.' }
          }

          if (!response.ok) {
            throw new Error(`[WordPress Site: ${site.name}] Sync failed: ${resData.error || response.statusText}`)
          }
        } else {
          // Webhook push
          const response = await fetch(site.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(site.syncToken ? { 'Authorization': `Bearer ${site.syncToken}` } : {}),
            },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            throw new Error(`[Webhook: ${site.name}] Post failed (HTTP ${response.status})`)
          }
        }
      }

      setStatusMessage('Sync complete!')
      alert('Post synchronized successfully to selected websites!')
      setShowModal(false)
      props.onComplete()
    } catch (err) {
      console.error('Website sync failure:', err)
      alert(`Sync failed: ${(err as Error).message}`)
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  const hasConfig = websites.length > 0

  return {
    label: 'Sync with Websites',
    onHandle: () => {
      setShowModal(true)
    },
    dialog: showModal
      ? {
          type: 'dialog',
          onClose: () => setShowModal(false),
          header: 'Publish & Sync with Connected Websites',
          content: (
            <Card padding={4}>
              <Stack space={4}>
                <Text size={1} muted>
                  Publishing updates this post on your connected websites. Select the destinations to sync:
                </Text>
                
                {loading && websites.length === 0 ? (
                  <Flex align="center" justify="center" paddingY={4} gap={2}>
                    <Spinner />
                    <Text size={1}>Loading connected websites...</Text>
                  </Flex>
                ) : !hasConfig ? (
                  <Card padding={3} tone="caution" radius={2}>
                    <Text size={1} weight="bold">No Websites Connected</Text>
                    <Text size={1} muted style={{marginTop: 6}}>
                      Connect websites in the <strong>Platform Settings</strong> menu before sending articles.
                    </Text>
                  </Card>
                ) : (
                  <Stack space={3}>
                    {websites.map((site) => {
                      const siteId = site.siteId?.current
                      return (
                        <Flex key={siteId} align="center" gap={3}>
                          <Checkbox
                            checked={!!selectedSites[siteId]}
                            onChange={() => handleToggle(siteId)}
                            id={`site-check-${siteId}`}
                            disabled={loading}
                          />
                          <Box flex={1}>
                            <label htmlFor={`site-check-${siteId}`} style={{cursor: 'pointer'}}>
                              <Text size={1} weight="semibold">{site.name}</Text>
                              <Text size={0} muted style={{display: 'block', marginTop: 2}}>{site.url}</Text>
                            </label>
                          </Box>
                        </Flex>
                      )
                    })}
                  </Stack>
                )}

                {statusMessage && (
                  <Card padding={3} tone="primary" radius={2}>
                    <Flex gap={2} align="center">
                      <Spinner />
                      <Text size={1} weight="medium">{statusMessage}</Text>
                    </Flex>
                  </Card>
                )}

                <Flex justify="flex-end" gap={2} style={{marginTop: 10}}>
                  <Button
                    text="Cancel"
                    mode="ghost"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                  />
                  <Button
                    text={loading ? 'Syncing...' : 'Sync Post'}
                    tone="positive"
                    onClick={handlePush}
                    disabled={loading || !hasConfig}
                  />
                </Flex>
              </Stack>
            </Card>
          ),
        }
      : undefined,
  }
}
