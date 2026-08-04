import React, {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {Card, Stack, Text, Flex, Box, Badge} from '@sanity/ui'

interface PostHealth {
  _id: string
  title: string
  wordCount: number
  hasMetaTitle: boolean
  hasMetaDesc: boolean
  hasAltText: boolean
  hasBody: boolean
  hasFaq: boolean
  hasListItems: boolean
  hasH2: boolean
  headingCount: number
  hasStepByStep: boolean
  hasCta: boolean
  longParagraphsCount: number
  keywordStuffing: boolean
  zeroKeywords: boolean
  score: number
}

function computeScore(post: Omit<PostHealth, 'score'>): number {
  let score = 0
  const maxScore = 10

  if (post.wordCount >= 600) score += 2
  else if (post.wordCount >= 300) score += 1

  if (post.hasMetaTitle) score += 1
  if (post.hasMetaDesc) score += 1
  if (post.hasAltText) score += 0.5
  if (post.hasBody) score += 1
  if (post.hasFaq) score += 1.5
  if (post.hasStepByStep) score += 1.5
  if (post.hasCta) score += 1
  if (!post.keywordStuffing && !post.zeroKeywords) score += 1
  if (post.longParagraphsCount === 0) score += 0.5

  return Math.min(Math.round((score / maxScore) * 100) / 10, 10)
}

function getScoreColor(score: number): 'positive' | 'caution' | 'critical' {
  if (score >= 7.5) return 'positive'
  if (score >= 5) return 'caution'
  return 'critical'
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Excellent'
  if (score >= 7.5) return 'Good'
  if (score >= 5) return 'Fair'
  return 'Needs Work'
}

function HealthBar({value, max = 10}: {value: number; max?: number}) {
  const percentage = Math.min((value / max) * 100, 100)
  const color = percentage >= 75 ? '#22c55e' : percentage >= 50 ? '#eab308' : '#ef4444'
  return (
    <div style={{width: '100%', background: '#1c1917', borderRadius: 6, height: 8, overflow: 'hidden'}}>
      <div style={{width: `${percentage}%`, background: color, height: '100%', borderRadius: 6, transition: 'width 0.3s ease'}} />
    </div>
  )
}

function CheckItem({label, flagType}: {label: string; flagType: 'pass' | 'warning' | 'fail'}) {
  const icon = flagType === 'pass' ? '✅' : flagType === 'warning' ? '⚠️' : '❌'
  return (
    <Flex align="center" gap={2} paddingY={1}>
      <Text size={1}>{icon}</Text>
      <Text size={1} muted={flagType !== 'pass'} style={{fontWeight: flagType === 'pass' ? 'normal' : '500'}}>
        {label}
      </Text>
    </Flex>
  )
}

function PostHealthCard({post}: {post: PostHealth}) {
  const flagWordCount = post.wordCount >= 600 ? 'pass' : post.wordCount >= 300 ? 'warning' : 'fail'
  const flagKeywords = (!post.keywordStuffing && !post.zeroKeywords) ? 'pass' : 'warning'
  const flagParagraphLength = post.longParagraphsCount === 0 ? 'pass' : 'warning'
  
  return (
    <Card border padding={3} radius={2} style={{marginBottom: 8}}>
      <Flex justify="space-between" align="center">
        <Box flex={1}>
          <Text size={1} weight="bold" style={{marginBottom: 4, display: 'block'}}>
            {post.title || 'Untitled Post'}
          </Text>
          <HealthBar value={post.score} />
        </Box>
        <Box style={{marginLeft: 12, textAlign: 'center', minWidth: 60}}>
          <Badge tone={getScoreColor(post.score)} fontSize={1} padding={2}>
            {post.score}/10
          </Badge>
          <Text size={0} muted style={{marginTop: 2, display: 'block'}}>
            {getScoreLabel(post.score)}
          </Text>
        </Box>
      </Flex>
      <Box style={{marginTop: 8}}>
        <Flex wrap="wrap" gap={3}>
          <Box style={{minWidth: '45%'}}>
            <CheckItem label={`Words: ${post.wordCount}`} flagType={flagWordCount} />
            <CheckItem label="Meta Title" flagType={post.hasMetaTitle ? 'pass' : 'fail'} />
            <CheckItem label="Meta Alt Text" flagType={post.hasAltText ? 'pass' : 'fail'} />
            <CheckItem label="Keywords OK" flagType={flagKeywords} />
          </Box>
          <Box style={{minWidth: '45%'}}>
            <CheckItem label="FAQ Section" flagType={post.hasFaq ? 'pass' : 'fail'} />
            <CheckItem label="Step-by-Step" flagType={post.hasStepByStep ? 'pass' : 'fail'} />
            <CheckItem label="Closing CTA" flagType={post.hasCta ? 'pass' : 'fail'} />
            <CheckItem label="Short Paragraphs" flagType={flagParagraphLength} />
          </Box>
        </Flex>
      </Box>
    </Card>
  )
}

export function ArticleHealthDashboard() {
  const client = useClient({apiVersion: '2024-05-16'})
  const [posts, setPosts] = useState<PostHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'wordCount'>('score')

  useEffect(() => {
    const query = `*[_type == "post"] | order(_updatedAt desc) [0...50] {
      _id,
      title,
      wordCount,
      generationKeywords,
      "hasMetaTitle": defined(seo.title) && seo.title != "",
      "hasMetaDesc": defined(seo.description) && seo.description != "",
      "hasAltText": defined(mainImage.alt) && mainImage.alt != "",
      "hasBody": defined(body) && count(body) > 0,
      "bodyBlocks": body
    }`

    client.fetch(query).then((results: any[]) => {
      const healthData: PostHealth[] = results.map((post) => {
        const blocks = post.bodyBlocks || []
        let wordCount = post.wordCount || 0
        let hasFaq = false
        let hasListItems = false
        let hasH2 = false
        let headingCount = 0
        let hasStepByStep = false
        let longParagraphsCount = 0

        // Analyze blocks
        blocks.forEach((block: any) => {
          // Count words if wordCount not pre-calculated
          let blockWords = 0
          if (Array.isArray(block?.children)) {
            block.children.forEach((child: any) => {
              if (typeof child?.text === 'string') {
                blockWords += child.text.trim().split(/\s+/).filter(Boolean).length
              }
            })
          }
          if (!post.wordCount) {
            wordCount += blockWords
          }

          if (block.style === 'normal' || !block.style) {
            if (blockWords > 150) {
              longParagraphsCount++
            }
          }

          // Check heading structure
          if (block.style === 'h2' || block.style === 'h3' || block.style === 'h4') {
            headingCount++
            if (block.style === 'h2') hasH2 = true

            // Check for FAQ heading
            const headingText = block.children
              ?.map((c: any) => c.text || '')
              .join('')
              .toLowerCase() || ''
            if (headingText.includes('faq') || headingText.includes('frequently asked') || headingText.includes('common question')) {
              hasFaq = true
            }
          }

          // Check for list items
          if (block.listItem === 'bullet' || block.listItem === 'number') {
            hasListItems = true
          }
          if (block.listItem === 'number') {
            hasStepByStep = true
          }
        })

        // Keyword analysis
        let keywordStuffing = false
        let zeroKeywords = false
        const rawKeywords = post.generationKeywords || ''
        const hasBody = blocks.length > 0

        if (rawKeywords && hasBody) {
          const kwList = rawKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
          const fullText = blocks.map((b: any) => 
            Array.isArray(b.children) ? b.children.map((c: any) => c.text || '').join('') : ''
          ).join(' ').toLowerCase()

          kwList.forEach((kw: string) => {
            const kwLower = kw.toLowerCase()
            let count = 0
            let pos = fullText.indexOf(kwLower)
            while (pos !== -1) {
              count++
              pos = fullText.indexOf(kwLower, pos + kwLower.length)
            }
            if (count > 8) {
              keywordStuffing = true
            }
            if (count === 0) {
              zeroKeywords = true
            }
          })
        }

        // CTA analysis
        let hasCta = false
        if (hasBody) {
          const hasExternalLinks = blocks.some((block: any) => 
            Array.isArray(block.children) && block.children.some((child: any) => 
              Array.isArray(child.marks) && child.marks.length > 0
            )
          )
          const closingBlocks = blocks.slice(-8)
          const closingText = closingBlocks.map((b: any) => 
            b.children?.map((c: any) => c.text || '').join('') || ''
          ).join(' ').toLowerCase()

          const ctaIndicators = [
            'subscribe', 'download', 'stencil', 'pattern', 'visit', 'explore', 'contact', 'check out', 
            'comment below', 'happy stitching', 'share your', 'your thoughts', 'let me know', 'conclusion', 
            'final thoughts', 'wrap up', 'pin this', 'save this', 'stitching journey', 'embroidery journey', 'get started'
          ]
          const hasCtaKeywords = ctaIndicators.some(indicator => closingText.includes(indicator))
          hasCta = hasExternalLinks || hasCtaKeywords
        }

        const postHealth: PostHealth = {
          _id: post._id,
          title: post.title || 'Untitled',
          wordCount,
          hasMetaTitle: post.hasMetaTitle,
          hasMetaDesc: post.hasMetaDesc,
          hasAltText: post.hasAltText,
          hasBody: post.hasBody,
          hasFaq,
          hasListItems,
          hasH2,
          headingCount,
          hasStepByStep,
          hasCta,
          longParagraphsCount,
          keywordStuffing,
          zeroKeywords,
          score: 0,
        }
        postHealth.score = computeScore(postHealth)
        return postHealth
      })

      // Sort
      healthData.sort((a, b) => {
        if (sortBy === 'score') return a.score - b.score
        return a.wordCount - b.wordCount
      })

      setPosts(healthData)
      setLoading(false)
    })
  }, [client, sortBy])

  // Compute aggregate stats
  const avgScore = posts.length > 0 ? Math.round((posts.reduce((sum, p) => sum + p.score, 0) / posts.length) * 10) / 10 : 0
  const excellent = posts.filter((p) => p.score >= 8).length
  const needsWork = posts.filter((p) => p.score < 5).length
  const missingFaq = posts.filter((p) => !p.hasFaq).length
  const missingMeta = posts.filter((p) => !p.hasMetaDesc).length

  if (loading) {
    return (
      <Card padding={5}>
        <Text align="center" muted>Loading article health data...</Text>
      </Card>
    )
  }

  return (
    <Card padding={4} style={{maxHeight: '100vh', overflowY: 'auto'}}>
      <Stack space={4}>
        {/* Dashboard Header */}
        <Text size={3} weight="bold">📊 Article Health Dashboard</Text>

        {/* Summary Cards */}
        <Flex gap={3} wrap="wrap">
          <Card border padding={3} radius={2} style={{flex: '1 1 140px', textAlign: 'center'}}>
            <Text size={4} weight="bold" style={{display: 'block'}}>{posts.length}</Text>
            <Text size={1} muted>Total Articles</Text>
          </Card>
          <Card border padding={3} radius={2} tone={avgScore >= 7.5 ? 'positive' : 'caution'} style={{flex: '1 1 140px', textAlign: 'center'}}>
            <Text size={4} weight="bold" style={{display: 'block'}}>{avgScore}/10</Text>
            <Text size={1} muted>Avg Health Score</Text>
          </Card>
          <Card border padding={3} radius={2} tone="positive" style={{flex: '1 1 140px', textAlign: 'center'}}>
            <Text size={4} weight="bold" style={{display: 'block'}}>{excellent}</Text>
            <Text size={1} muted>Excellent (8+)</Text>
          </Card>
          <Card border padding={3} radius={2} tone="critical" style={{flex: '1 1 140px', textAlign: 'center'}}>
            <Text size={4} weight="bold" style={{display: 'block'}}>{needsWork}</Text>
            <Text size={1} muted>Needs Work (&lt;5)</Text>
          </Card>
        </Flex>

        {/* Quick Issues */}
        <Card border padding={3} radius={2} tone="caution">
          <Text size={1} weight="bold" style={{marginBottom: 6, display: 'block'}}>⚠️ Editorial Gaps Detected</Text>
          <Stack space={2}>
            <Text size={1}>• {missingMeta} posts missing meta descriptions</Text>
            <Text size={1}>• {missingFaq} posts missing FAQ sections (rich snippets lost)</Text>
            <Text size={1}>• {posts.filter((p) => !p.hasStepByStep).length} posts missing step-by-step guides (featured snippets lost)</Text>
            <Text size={1}>• {posts.filter((p) => !p.hasCta).length} posts missing Call-to-actions/closing links</Text>
            <Text size={1}>• {posts.filter((p) => p.keywordStuffing).length} posts triggering Keyword Stuffing warnings (&gt;8 repetitions)</Text>
            <Text size={1}>• {posts.filter((p) => p.longParagraphsCount > 0).length} posts with blocks exceeding 150 words</Text>
          </Stack>
        </Card>

        {/* Sort Controls */}
        <Flex gap={2} align="center">
          <Text size={1} muted style={{marginRight: 4}}>Sort by:</Text>
          <Badge
            tone={sortBy === 'score' ? 'primary' : 'default'}
            style={{cursor: 'pointer'}}
            onClick={() => setSortBy('score')}
          >
            Health Score ↑
          </Badge>
          <Badge
            tone={sortBy === 'wordCount' ? 'primary' : 'default'}
            style={{cursor: 'pointer'}}
            onClick={() => setSortBy('wordCount')}
          >
            Word Count ↑
          </Badge>
        </Flex>

        {/* Post List */}
        <Stack space={2}>
          {posts.map((post) => (
            <PostHealthCard key={post._id} post={post} />
          ))}
        </Stack>
      </Stack>
    </Card>
  )
}
