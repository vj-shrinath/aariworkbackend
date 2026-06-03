import { defineField, defineType } from 'sanity'

export const geoOptimization = defineType({
  name: 'geoOptimization',
  title: 'GEO (Generative Engine Optimization)',
  type: 'object',
  fields: [
    defineField({
      name: 'primaryEntity',
      title: 'Primary Entity',
      type: 'string',
      description: 'The main subject of this page (e.g., "Aari Work").',
    }),
    defineField({
      name: 'relatedEntities',
      title: 'Related Entities',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'semanticKeywords',
      title: 'Semantic Keywords',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Keywords that define the context (LSI keywords).',
    }),
    defineField({
      name: 'topicCluster',
      title: 'Topic Cluster',
      type: 'string',
      description: 'The broader category this belongs to.',
    }),
    defineField({
      name: 'alternatePhrases',
      title: 'Alternate Phrases',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Different ways users might ask about this topic.',
    }),
    defineField({
      name: 'sameAs',
      title: 'SameAs URLs',
      type: 'array',
      of: [{ type: 'url' }],
      description: 'Links to official entities (Wikidata, Wikipedia, etc.).',
    }),
    defineField({
      name: 'wikidataId',
      title: 'Wikidata ID',
      type: 'string',
    }),
    defineField({
      name: 'wikipediaUrl',
      title: 'Wikipedia URL',
      type: 'url',
    }),
  ],
})
