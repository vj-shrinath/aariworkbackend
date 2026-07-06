import {ImagesIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const galleryDesign = defineType({
  name: 'galleryDesign',
  title: 'Gallery Design Templates',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Design Title',
      type: 'string',
      description: 'Used for gallery display search and alphabetical sorting.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mainImage',
      title: 'Design Image',
      type: 'image',
      options: {
        hotspot: true, // Enables cropping and focal point adjustment in the Studio
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Optional details about this design pattern.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{type: 'reference', to: {type: 'category'}}],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
    },
  },
})

export default galleryDesign
