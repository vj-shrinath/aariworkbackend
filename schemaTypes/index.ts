import { type SchemaTypeDefinition } from 'sanity'

import {blockContentType} from './blockContentType'
import {categoryType} from './categoryType'
import {postType} from './postType'
import {authorType} from './authorType'
import {userSubmission} from './userSubmission'
import {seo} from './objects/seo'
import {aiOptimization} from './objects/aiOptimization'
import {geoOptimization} from './objects/geoOptimization'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    blockContentType,
    categoryType,
    postType,
    authorType,
    userSubmission,
    seo,
    aiOptimization,
    geoOptimization,
  ],
}
