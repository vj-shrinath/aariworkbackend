import {defineField, defineType} from 'sanity'

export const userSubmission = defineType({
  name: 'userSubmission',
  title: 'User Submissions',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'image',
      title: 'Uploaded Design',
      type: 'image',
      readOnly: true,
    }),
    defineField({
      name: 'uploadDate',
      title: 'Upload Date',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'approvedForGallery',
      title: 'Approved for Gallery',
      type: 'boolean',
      readOnly: true,
      initialValue: false,
    }),
  ],
})
