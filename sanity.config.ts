import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schema} from './schemaTypes'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'lx1zrwct'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'Aari Work Designs',

  projectId,
  dataset,

  plugins: [structureTool(), visionTool()],

  schema,
})
