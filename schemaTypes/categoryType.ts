import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const translationLocales = ['hi', 'mr', 'ta', 'te', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko'] as const

export const categoryType = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
    }),
    ...translationLocales.map((locale) =>
      defineField({
        name: `title_${locale}`,
        title: `Title (${locale.toUpperCase()})`,
        type: 'string',
        group: 'translations',
      }),
    ),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'title',
      },
    }),
    defineField({
      name: 'description',
      type: 'text',
    }),
  ],
  groups: [
    {
      name: 'translations',
      title: 'Translations',
    },
  ],
})
