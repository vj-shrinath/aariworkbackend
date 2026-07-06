import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schema} from './schemaTypes'
import {structure} from './structure'
import {DownloadImageAction} from './actions/DownloadImageAction'
import {DeleteSubmissionAction} from './actions/DeleteSubmissionAction'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'lx1zrwct'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'Aari Work Designs',

  projectId,
  dataset,

  plugins: [
    structureTool({
      structure,
    }),
    visionTool(),
  ],

  schema,

  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'userSubmission') {
        return [
          DownloadImageAction(context),
          DeleteSubmissionAction(context),
        ]
      }
      return prev
    },
  },
})
