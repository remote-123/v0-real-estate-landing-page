import { defineField, defineType } from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      initialValue: 'NorthCapital Advisory',
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt (Meta Description)',
      type: 'text',
      rows: 3,
    }),
    // --- AEO FEATURE 1: KEY TAKEAWAYS ---
    defineField({
      name: 'keyTakeaways',
      title: 'Key Takeaways (AEO Summary)',
      description: 'Bullet points that AI engines will scrape for quick answers.',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    // --- AEO FEATURE 2: FAQ SCHEMA DATA ---
    defineField({
      name: 'faqs',
      title: 'Frequently Asked Questions (AEO)',
      description: 'Strict Q&A format. This will be injected as JSON-LD hidden code for AI bots.',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'question', type: 'string', title: 'Question' },
            { name: 'answer', type: 'text', title: 'Answer' }
          ]
        }
      ]
    }),
    defineField({
      name: 'body',
      title: 'Body Content',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    }),
    // Content type for schema variant selection (backend only — not displayed on front end)
    defineField({
      name: 'contentType',
      title: 'Content Type',
      type: 'string',
      description: 'Set automatically by AI generator. Used for HowTo schema injection.',
      options: {
        list: [
          { title: 'Investment Analysis', value: 'INVESTMENT_ANALYSIS' },
          { title: 'Market Data', value: 'MARKET_DATA' },
          { title: 'Regulatory News', value: 'REGULATORY_NEWS' },
          { title: 'Area Guide', value: 'AREA_GUIDE' },
          { title: 'How-To', value: 'HOW_TO' },
        ],
      },
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
      description: 'Original article URL if generated from a web source.',
    }),
  ],
})