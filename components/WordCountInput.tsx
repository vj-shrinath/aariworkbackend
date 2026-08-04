import React from 'react'
import {Stack, Card, Text} from '@sanity/ui'

export function WordCountInput(props: any) {
  const {value} = props

  // Compute word count from portable text blocks
  const countWords = (blocks: unknown) => {
    let count = 0
    if (Array.isArray(blocks)) {
      blocks.forEach((block) => {
        if (Array.isArray(block.children)) {
          block.children.forEach((child: any) => {
            if (typeof child.text === 'string') {
              count += child.text.trim().split(/\s+/).filter(Boolean).length
            }
          })
        }
      })
    }
    return count
  }

  const wordCount = countWords(value)

  return (
    <Stack space={2}>
      <Card 
        padding={3} 
        tone={wordCount > 0 ? "positive" : "transparent"} 
        radius={2} 
        border 
        style={{ 
          display: 'inline-block',
          alignSelf: 'flex-start',
          marginBottom: '2px' 
        }}
      >
        <Text size={1} weight="semibold">
          💡 Word Count: {wordCount} words
        </Text>
      </Card>
      {/* Render the default Portable Text Editor */}
      {props.renderDefault(props)}
    </Stack>
  )
}
