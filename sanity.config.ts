import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schema} from './schemaTypes'
import {structure} from './structure'
import {DownloadImageAction} from './actions/DownloadImageAction'
import {ApproveToGalleryAction} from './actions/ApproveToGalleryAction'
import {DeleteSubmissionAction} from './actions/DeleteSubmissionAction'
import {GenerateSeoAiAction} from './actions/GenerateSeoAiAction'
import {GenerateTranslationsAction} from './actions/GenerateTranslationsAction'
import {IndividualArticleHealthView} from './components/IndividualArticleHealthView'
import {GenerateArticleAction} from './actions/GenerateArticleAction'

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
      defaultDocumentNode: (S, {schemaType}) => {
        if (schemaType === 'post') {
          return S.document().views([
            S.view.form(),
            S.view.component(IndividualArticleHealthView).title('SEO Health').id('seo-health'),
          ])
        }
      },
    }),
    visionTool(),
  ],

  schema,

  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'post') {
        return [GenerateArticleAction, GenerateSeoAiAction, GenerateTranslationsAction, ...prev]
      }
      if (context.schemaType === 'userSubmission') {
        return [DownloadImageAction, ApproveToGalleryAction, DeleteSubmissionAction]
      }
      return prev
    },
  },
})
