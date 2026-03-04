import { defineField, defineType } from 'sanity'
import { FileText } from 'lucide-react'

export const thesis = defineType({
    name: 'thesis',
    title: 'Investment Thesis',
    type: 'document',
    icon: FileText as any,
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
            options: {
                source: 'title',
                maxLength: 96,
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'author',
            title: 'Author',
            type: 'string',
            initialValue: 'North Capital Research',
        }),
        defineField({
            name: 'publishedAt',
            title: 'Published at',
            type: 'datetime',
            initialValue: () => new Date().toISOString(),
        }),
        defineField({
            name: 'executiveSummary',
            title: 'Executive Summary',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'mainImage',
            title: 'Main image',
            type: 'image',
            options: {
                hotspot: true,
            },
        }),
        defineField({
            name: 'body',
            title: 'Body',
            type: 'array',
            of: [
                { type: 'block' },
                { type: 'image' },
            ],
        }),
        defineField({
            name: 'relatedProjects',
            title: 'Related Projects',
            type: 'array',
            of: [{ type: 'reference', to: { type: 'project' } }],
            description: 'Link specific projects that support or are recommended within this thesis.'
        }),
    ],
    preview: {
        select: {
            title: 'title',
            author: 'author',
            media: 'mainImage',
        },
        prepare(selection) {
            const { author } = selection
            return { ...selection, subtitle: author && `by ${author}` }
        },
    },
})
