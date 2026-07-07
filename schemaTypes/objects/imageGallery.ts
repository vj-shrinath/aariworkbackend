import {defineField, defineType} from 'sanity'
import {ImagesIcon} from '@sanity/icons'
import {BulkUploadInput} from '../../components/BulkUploadInput'

export const imageGallery = defineType({
  name: 'imageGallery',
  title: 'Image Gallery',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      description: 'Drag & drop or Click "Select & Upload Multiple Images" to upload multiple images at once.',
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
            defineField({
              name: 'isDesignTrace',
              type: 'boolean',
              title: 'Is Design Trace?',
              description: 'Check this if the image is a black design on white paper (trace/sketch). Checked images appear in the Gallery and Trace Tool.',
              initialValue: false,
            }),
          ]
        }
      ],
      options: {
        layout: 'grid',
      },
      components: {
        input: BulkUploadInput,
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
    defineField({
      name: 'allImagesAreTrace',
      title: '✏️ All images are Design Traces',
      type: 'boolean',
      description: 'Enable this to mark every image in this gallery as a Design Trace — shows the "Open in Tracing Tool" button on all of them. No need to tick each image individually.',
      initialValue: false,
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
