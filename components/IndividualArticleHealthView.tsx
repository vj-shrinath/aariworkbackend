import React from 'react'
import {Card, Stack, Text, Flex, Box, Badge} from '@sanity/ui'

function CheckItem({label, flagType}: {label: string; flagType: 'pass' | 'warning' | 'fail'}) {
  const icon = flagType === 'pass' ? '✅' : flagType === 'warning' ? '⚠️' : '❌'
  const isMuted = flagType === 'warning' || flagType === 'fail'
  return (
    <Flex align="center" gap={2} paddingY={1}>
      <Text size={2}>{icon}</Text>
      <Text size={2} muted={false} style={{fontWeight: flagType === 'pass' ? 'normal' : '500'}}>
        {label}
      </Text>
    </Flex>
  )
}

interface KeywordCount {
  keyword: string
  count: number
}

export function IndividualArticleHealthView(props: any) {
  const doc = props.document?.displayed

  if (!doc) {
    return (
      <Card padding={4}>
        <Text muted>No document content available.</Text>
      </Card>
    )
  }

  const title = doc.title || ''
  const body = doc.body || []
  
  // ── ANALYSIS LOGIC ──
  let computedWords = 0
  let hasFaq = false
  let hasListItems = false
  let hasH2 = false
  let headingCount = 0
  let hasStepByStep = false
  let longParagraphsCount = 0
  const paragraphs: {index: number; wordCount: number}[] = []

  if (Array.isArray(body)) {
    body.forEach((block: any, idx: number) => {
      // 1. Calculate word counts
      let blockWords = 0
      if (Array.isArray(block.children)) {
        block.children.forEach((child: any) => {
          if (typeof child.text === 'string') {
            blockWords += child.text.trim().split(/\s+/).filter(Boolean).length
          }
        })
      }
      computedWords += blockWords

      // Track individual paragraph word counts to audit readability size limits
      if (block.style === 'normal' || !block.style) {
        paragraphs.push({index: idx, wordCount: blockWords})
        if (blockWords > 150) {
          longParagraphsCount++
        }
      }

      // 2. Headings Audit
      if (block.style === 'h2' || block.style === 'h3' || block.style === 'h4') {
        headingCount++
        if (block.style === 'h2') hasH2 = true

        const headingText = block.children?.map((c: any) => c.text || '').join('').toLowerCase() || ''
        if (headingText.includes('faq') || headingText.includes('frequently asked') || headingText.includes('common question')) {
          hasFaq = true
        }
      }

      // 3. Lists Audit
      if (block.listItem === 'bullet' || block.listItem === 'number') {
        hasListItems = true
      }
      if (block.listItem === 'number') {
        hasStepByStep = true
      }
    })
  }

  const finalWordCount = doc.wordCount || computedWords
  const hasMetaTitle = !!doc.seo?.title
  const hasMetaDesc = !!doc.seo?.description
  const hasAltText = !!doc.mainImage?.alt
  const hasBody = Array.isArray(body) && body.length > 0

  // 4. Keyword count and over-optimization check
  const keywordStats: KeywordCount[] = []
  let keywordStuffingWarning = false
  let zeroKeywordsWarning = false
  const rawKeywords = doc.generationKeywords || ''

  if (rawKeywords && hasBody) {
    const kwList = rawKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
    const fullText = body.map((b: any) => 
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
      keywordStats.push({keyword: kw, count})
      if (count > 8) {
        keywordStuffingWarning = true
      }
      if (count === 0) {
        zeroKeywordsWarning = true
      }
    })
  }

  // 5. Call-To-Action (CTA) Detection
  let hasCta = false
  if (hasBody) {
    // Audit for external links inside blocks
    const hasExternalLinks = body.some((block: any) => 
      Array.isArray(block.children) && block.children.some((child: any) => 
        Array.isArray(child.marks) && child.marks.length > 0
      )
    )

    // Audit for CTA verbs in closing block contents (checking last 8 blocks to scan both pre-FAQ and post-FAQ zones)
    const closingBlocks = body.slice(-8)
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

  // Determine individual metric flags
  const flagWordCount = finalWordCount >= 600 ? 'pass' : finalWordCount >= 300 ? 'warning' : 'fail'
  const flagMetaTitle = hasMetaTitle ? 'pass' : 'fail'
  const flagMetaDesc = hasMetaDesc ? 'pass' : 'fail'
  const flagAltText = hasAltText ? 'pass' : 'warning'
  const flagFaq = hasFaq ? 'pass' : 'fail'
  const flagStepByStep = hasStepByStep ? 'pass' : 'fail'
  const flagCta = hasCta ? 'pass' : 'fail'
  const flagKeywords = (keywordStats.length > 0 && !keywordStuffingWarning && !zeroKeywordsWarning) ? 'pass' : 'warning'
  const flagParagraphLength = longParagraphsCount === 0 ? 'pass' : 'warning'

  // Compute final aggregate health score
  let score = 0
  if (flagWordCount === 'pass') score += 2
  else if (flagWordCount === 'warning') score += 1

  if (hasMetaTitle) score += 1
  if (hasMetaDesc) score += 1
  if (hasAltText) score += 0.5
  if (hasFaq) score += 1.5
  if (hasStepByStep) score += 1.5
  if (hasCta) score += 1
  if (flagKeywords === 'pass') score += 1
  if (flagParagraphLength === 'pass') score += 0.5

  const finalScore = Math.min(Math.round((score / 10) * 100) / 10, 10)

  const getScoreColor = (s: number) => {
    if (s >= 7.5) return 'positive'
    if (s >= 5) return 'caution'
    return 'critical'
  }

  const getScoreLabel = (s: number) => {
    if (s >= 9) return 'Excellent'
    if (s >= 7.5) return 'Good'
    if (s >= 5) return 'Fair'
    return 'Needs Work'
  }

  return (
    <Card padding={4} style={{boxSizing: 'border-box', height: '100%', overflowY: 'auto'}}>
      <Stack space={4}>
        <Box>
          <Text size={3} weight="bold">📝 Live SEO & Content Health Report</Text>
          <Text size={1} muted style={{marginTop: 4, display: 'block'}}>
            This analysis evaluates the current edit state of your draft in real-time.
          </Text>
        </Box>

        {/* Global Rating Card */}
        <Card border padding={4} radius={3}>
          <Flex justify="space-between" align="center">
            <Box flex={1}>
              <Text size={1} weight="bold">
                {title || 'Untitled Post'}
              </Text>
              <div style={{width: '100%', background: '#1c1917', borderRadius: 6, height: 12, overflow: 'hidden', marginTop: 8}}>
                <div style={{
                  width: `${finalScore * 10}%`, 
                  background: finalScore >= 7.5 ? '#22c55e' : finalScore >= 5 ? '#eab308' : '#ef4444', 
                  height: '100%', 
                  borderRadius: 6, 
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </Box>
            <Box style={{marginLeft: 24, textAlign: 'center', minWidth: 80}}>
              <Badge tone={getScoreColor(finalScore)} fontSize={2} padding={3}>
                {finalScore}/10
              </Badge>
              <Text size={0} muted style={{marginTop: 6, display: 'block'}}>
                {getScoreLabel(finalScore)}
              </Text>
            </Box>
          </Flex>
        </Card>

        {/* ❌ CRITICAL SEO ISSUES CARD */}
        {(flagFaq === 'fail' || flagStepByStep === 'fail' || flagCta === 'fail' || keywordStuffingWarning || longParagraphsCount > 0) && (
          <Card border padding={3} radius={3} tone="critical">
            <Text size={1} weight="bold" style={{color: '#ef4444', marginBottom: 12, display: 'block'}}>
              🚨 SEO Errors & Editorial Warnings
            </Text>
            <Stack space={3}>
              {keywordStuffingWarning && (
                <Text size={1}>
                  🔴 <strong>Keyword Stuffing Warning:</strong> One or more primary keywords are repeated more than 8 times in the text. This triggers Google's spam filters. Use synonyms (LSI terms) instead.
                </Text>
              )}
              {zeroKeywordsWarning && (
                <Text size={1}>
                  ⚠️ <strong>Missing Target Keywords:</strong> Your specified keywords are not found in the article body. Integrate them naturally.
                </Text>
              )}
              {flagFaq === 'fail' && (
                <Text size={1}>
                  🔴 <strong>No FAQ Section:</strong> High-value opportunity missed. Add an H2 section named "Frequently Asked Questions" containing 3-5 Q&A blocks to get eligible for Google's FAQ Schema snippets.
                </Text>
              )}
              {flagStepByStep === 'fail' && (
                <Text size={1}>
                  🔴 <strong>No Step-by-Step Guide:</strong> Adding a numbered instruction list helps capture Google Featured Snippets and increases user engagement.
                </Text>
              )}
              {flagCta === 'fail' && (
                <Text size={1}>
                  🔴 <strong>No Call to Action (CTA):</strong> The article lacks closing links or engaging queries (e.g., "leave a comment", "download tracing papers"). Add a CTA paragraph to the end.
                </Text>
              )}
              {longParagraphsCount > 0 && (
                <Text size={1}>
                  ⚠️ <strong>{longParagraphsCount} Paragraphs are too long (150+ words):</strong> Long blocks of text reduce readability on mobile devices. Break them down into smaller 2-3 sentence chunks.
                </Text>
              )}
            </Stack>
          </Card>
        )}

        {/* Audit Details */}
        <Card border padding={3} radius={3} tone="transparent">
          <Text size={1} weight="bold" style={{marginBottom: 12, display: 'block'}}>Detailed Checklist Results</Text>
          <Stack space={2}>
            <CheckItem 
              label={`Word Count: ${finalWordCount} words (Target: 600+)`} 
              flagType={flagWordCount} 
            />
            <CheckItem 
              label="Standard Body Text Filled" 
              flagType={hasBody ? 'pass' : 'fail'} 
            />
            <CheckItem 
              label="Meta Title Configured" 
              flagType={flagMetaTitle} 
            />
            <CheckItem 
              label="SEO Meta Description Configured" 
              flagType={flagMetaDesc} 
            />
            <CheckItem 
              label="Image Alt Text set" 
              flagType={flagAltText} 
            />
            <CheckItem 
              label="Keyword Density Validated" 
              flagType={flagKeywords} 
            />
            <CheckItem 
              label="FAQ Section mapped" 
              flagType={flagFaq} 
            />
            <CheckItem 
              label="Step-by-Step List present" 
              flagType={flagStepByStep} 
            />
            <CheckItem 
              label="Call to Action / Links active" 
              flagType={flagCta} 
            />
            <CheckItem 
              label="Paragraph lengths under 150 words" 
              flagType={flagParagraphLength} 
            />
          </Stack>
        </Card>

        {/* Keywords breakdown */}
        {keywordStats.length > 0 && (
          <Card border padding={3} radius={3}>
            <Text size={1} weight="bold" style={{marginBottom: 12, display: 'block'}}>🔑 Target Keyword Analysis</Text>
            <Stack space={2}>
              {keywordStats.map((k) => (
                <Flex key={k.keyword} justify="space-between" align="center" paddingY={1}>
                  <Text size={1}>"{k.keyword}"</Text>
                  <Badge tone={k.count > 8 ? 'critical' : k.count >= 2 ? 'positive' : 'caution'}>
                    {k.count} {k.count > 8 ? 'stuffed' : 'occurs'}
                  </Badge>
                </Flex>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
}
