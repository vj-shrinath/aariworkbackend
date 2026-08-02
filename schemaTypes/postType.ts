import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

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
  }),
)

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    ...localizedStringFields('title'),
    ...localizedStringFields('excerpt'),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'title',
      },
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: {type: 'author'},
    }),
    defineField({
      name: 'mainImage',
      type: 'image',
      options: {
        hotspot: true,
      },
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
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
    }),
    defineField({
      name: 'body',
      type: 'blockContent',
    }),
    ...localizedBodyFields,
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
