import { StructureBuilder } from 'sanity/structure'

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Standard Post list
      S.documentTypeListItem('post').title('All Posts'),
      S.divider(),
      
      // SEO Audit Dashboard
      S.listItem()
        .title('SEO Dashboard')
        .child(
          S.list()
            .title('SEO Audit')
            .items([
              S.listItem()
                .title('Missing Meta Titles')
                .child(
                  S.documentList()
                    .title('Missing Meta Titles')
                    .filter('_type == "post" && (!defined(seo.title) || seo.title == "")')
                ),
              S.listItem()
                .title('Missing Meta Descriptions')
                .child(
                  S.documentList()
                    .title('Missing Meta Descriptions')
                    .filter('_type == "post" && (!defined(seo.description) || seo.description == "")')
                ),
              S.listItem()
                .title('Missing Alt Text (Main Image)')
                .child(
                  S.documentList()
                    .title('Missing Alt Text')
                    .filter('_type == "post" && (!defined(mainImage.alt) || mainImage.alt == "")')
                ),
            ])
        ),
      
      // AI Dashboard
      S.listItem()
        .title('AI Dashboard')
        .child(
          S.list()
            .title('AI Audit')
            .items([
              S.listItem()
                .title('Missing AI Summaries')
                .child(
                  S.documentList()
                    .title('Missing AI Summaries')
                    .filter('_type == "post" && (!defined(ai.aiSummary) || ai.aiSummary == "")')
                ),
              S.listItem()
                .title('Missing Direct Answers')
                .child(
                  S.documentList()
                    .title('Missing Direct Answers')
                    .filter('_type == "post" && (!defined(ai.directAnswer) || ai.directAnswer == "")')
                ),
            ])
        ),

      // Content Dashboard
      S.listItem()
        .title('Content Planner')
        .child(
          S.list()
            .title('Status')
            .items([
              S.listItem()
                .title('Recently Updated')
                .child(
                  S.documentList()
                    .title('Recently Updated')
                    .filter('_type == "post"')
                    .apiVersion('2023-01-01')
                    .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
                ),
            ])
        ),
      
      S.divider(),
      ...S.documentTypeListItems().filter(
        (listItem) => !['post'].includes(listItem.getId()!)
      ),
    ])
