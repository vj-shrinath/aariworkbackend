import {defineField, defineType} from 'sanity'
import {ImagesIcon} from '@sanity/icons'

export const imageGallery = defineType({
  name: 'imageGallery',
  title: 'Image Gallery',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      description: 'Drag & drop or click "Add item" to upload multiple images at once.',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
            accept: 'image/*',
            storeOriginalFilename: true,
          },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alternative text',
            }),
            defineField({
              name: 'caption',
              type: 'string',
              title: 'Caption',
            }),
          ]
        }
      ],
      options: {
        layout: 'grid',
      },
    }),
    defineField({
      name: 'display',
      title: 'Display Mode',
      type: 'string',
      description: 'Choose how to display these images on the frontend.',
      options: {
        list: [
          {title: 'Slider', value: 'slider'},
          {title: 'Grid', value: 'grid'},
          {title: 'Carousel', value: 'carousel'},
        ],
        layout: 'radio',
      },
      initialValue: 'slider',
    }),
  ],
  preview: {
    select: {
      images: 'images',
      display: 'display',
    },
    prepare(selection) {
      const {images, display} = selection
      const count = images ? images.length : 0
      return {
        title: `Image Gallery (${count} images)`,
        subtitle: `Display Mode: ${display}`,
        media: images && images.length > 0 ? images[0] : ImagesIcon,
      }
    },
  },
})
