import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {WordCountInput} from '../components/WordCountInput'

const translationLocales = ['hi', 'mr', 'ta', 'te', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko'] as const

const localizedStringFields = (name: 'title' | 'excerpt') =>
  translationLocales.map((locale) =>
    defineField({
      name: `${name}_${locale}`,
      title: `${name === 'title' ? 'Title' : 'Excerpt'} (${locale.toUpperCase()})`,
      type: name === 'title' ? 'string' : 'text',
      group: 'translations',
    }),
  )

const localizedBodyFields = translationLocales.map((locale) =>
  defineField({
    name: `body_${locale}`,
    title: `Article body (${locale.toUpperCase()})`,
    type: 'blockContent',
    group: 'translations',
    components: {
      input: WordCountInput,
    }
  }),
)

const localizedAiFields = translationLocales.map((locale) =>
  defineField({
    name: `ai_${locale}`,
    title: `AI Optimization (${locale.toUpperCase()})`,
    type: 'aiOptimization',
    group: 'translations',
  }),
)

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'generationKeywords',
      title: 'Target Keywords',
      type: 'string',
      description: 'Main keywords you want the AI to target (comma separated, e.g., "aari work for beginners, simple blouse").',
      group: 'generation',
    }),
    defineField({
      name: 'generationBrief',
      title: 'Brief / Outline Summary',
      type: 'text',
      description: 'Describe what the article should be about & structured.',
      rows: 4,
      group: 'generation',
    }),
    defineField({
      name: 'generationTone',
      title: 'Tone & Custom Instructions',
      type: 'string',
      description: 'E.g. "Informative, beginner-friendy", "highly detailed and step by step".',
      initialValue: 'Informative, beginner-friendly, and engaging',
      group: 'generation',
    }),
    defineField({
      name: 'generationWordCount',
      title: 'Target Word Count',
      type: 'number',
      description: 'Desired length of the article (e.g. 500, 1000, 1500, 2000 words). Default is 1000.',
      initialValue: 1000,
      validation: (Rule) => Rule.min(300).max(4000),
      group: 'generation',
    }),
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      group: 'content',
    }),
    ...localizedStringFields('title'),
    ...localizedStringFields('excerpt'),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      options: {
        source: 'title',
      },
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: {type: 'author'},
      group: 'content',
    }),
    defineField({
      name: 'mainImage',
      type: 'image',
      options: {
        hotspot: true,
      },
      group: 'content',
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          validation: (Rule) => Rule.required(),
        })
      ]
    }),
    defineField({
      name: 'categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: {type: 'category'}})],
      group: 'content',
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      group: 'content',
    }),
    defineField({
      name: 'body',
      type: 'blockContent',
      group: 'content',
      components: {
        input: WordCountInput,
      }
    }),
    defineField({
      name: 'wordCount',
      title: 'Current Word Count',
      type: 'number',
      readOnly: true,
      description: 'Calculated word count of the main body content.',
      group: 'content',
    }),
    ...localizedBodyFields,
    ...localizedAiFields,
    defineField({
      name: 'seo',
      title: 'SEO & Social',
      type: 'seo',
      group: 'optimization',
    }),
    defineField({
      name: 'ai',
      title: 'AI Optimization',
      type: 'aiOptimization',
      group: 'optimization',
    }),
    defineField({
      name: 'geo',
      title: 'GEO (Search Entities)',
      type: 'geoOptimization',
      group: 'optimization',
    }),
    defineField({
      name: 'relatedPosts',
      title: 'Related Posts',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'post' } }],
      group: 'optimization',
    }),
    defineField({
      name: 'pillarContent',
      title: 'Is Pillar Content?',
      type: 'boolean',
      initialValue: false,
      group: 'optimization',
    }),
  ],
  groups: [
    {
      name: 'generation',
      title: 'AI Creator Brief',
    },
    {
      name: 'content',
      title: 'Article Content',
    },
    {
      name: 'optimization',
      title: 'SEO & AI Optimization',
    },
    {
      name: 'translations',
      title: 'Translations',
    },
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author && `by ${author}`}
    },
  },
})
