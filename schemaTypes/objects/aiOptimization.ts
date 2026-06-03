import { defineField, defineType } from 'sanity'

export const aiOptimization = defineType({
  name: 'aiOptimization',
  title: 'AI Search Optimization (AEO)',
  type: 'object',
  fields: [
    defineField({
      name: 'aiSummary',
      title: 'AI Summary',
      type: 'text',
      rows: 4,
      description: '50-100 words optimized for AI search engines.',
    }),
    defineField({
      name: 'tldr',
      title: 'TL;DR',
      type: 'string',
      description: 'A very short summary (1 sentence).',
    }),
    defineField({
      name: 'keyTakeaways',
      title: 'Key Takeaways',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'directAnswer',
      title: 'Direct Answer',
      type: 'text',
      rows: 3,
      description: 'A precise paragraph answering the main query of this page.',
    }),
    defineField({
      name: 'importantFacts',
      title: 'Important Facts',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'citableStatements',
      title: 'Citable Statements',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'statement', type: 'string' },
            { name: 'sourceUrl', type: 'url' },
          ],
        },
      ],
    }),
    defineField({
      name: 'references',
      title: 'References',
      type: 'array',
      of: [{ type: 'url' }],
    }),
  ],
})
