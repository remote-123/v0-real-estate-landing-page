import { defineField, defineType } from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Post Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: ['Market Trends', 'Investment Guide', 'Investment Tips', 'Market Guides', 'News'],
      },
    }),
    defineField({
      name: 'excerpt',
      title: 'Short Excerpt',
      type: 'text',
      description: 'A 1-2 sentence summary for the blog card.',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      initialValue: 'NorthCapital Advisory',
    }),
    defineField({
      name: 'readTime',
      title: 'Read Time',
      type: 'string',
      description: 'e.g., 6 min read',
    }),
    defineField({
      name: 'date',
      title: 'Publish Date',
      type: 'date',
      options: { dateFormat: 'MMMM D, YYYY' },
    }),
    defineField({
      name: 'image',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
    }),
    // THIS IS THE MAGIC FIELD - It creates a Rich Text Editor in Sanity
    defineField({
      name: 'content',
      title: 'Blog Content',
      type: 'array',
      of: [
        { type: 'block' }, // Standard text (paragraphs, headings, lists)
        { type: 'image', options: { hotspot: true } } // Allows you to drop images in the middle of a post
      ],
    }),
  ],
})