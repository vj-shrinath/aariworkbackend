import {defineField, defineType} from 'sanity'

export const userSubmission = defineType({
  name: 'userSubmission',
  title: 'User Submissions',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'image', title: 'Uploaded Design', type: 'image'}),
    defineField({name: 'uploadDate', title: 'Upload Date', type: 'datetime'}),
  ],
  readOnly: true, // Prevents accidental edits in the studio
})
