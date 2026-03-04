import { defineField, defineType, defineArrayMember } from 'sanity'
import { LayoutDashboard } from 'lucide-react'

export const terminalCategory = defineType({
    name: 'terminalCategory',
    title: 'Terminal Category',
    type: 'document',
    icon: LayoutDashboard as any,
    fields: [
        defineField({
            name: 'title',
            title: 'Category Title',
            type: 'string',
            validation: (Rule) => Rule.required(),
            description: 'e.g., Economic Foundations'
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
            description: 'URL path for this category (e.g., economic)'
        }),
        defineField({
            name: 'icon',
            title: 'Icon Name',
            type: 'string',
            options: {
                list: [
                    { title: 'TrendingUp (Chart)', value: 'TrendingUp' },
                    { title: 'Plane (Infrastructure)', value: 'Plane' },
                    { title: 'Users (Society)', value: 'Users' },
                    { title: 'Ship (Logistics)', value: 'Ship' },
                    { title: 'Hotel (Hospitality)', value: 'Hotel' },
                    { title: 'Database (System Health)', value: 'Database' },
                ],
            },
            validation: (Rule) => Rule.required(),
            description: 'Select the Lucide icon to display on the dashboard.'
        }),
        defineField({
            name: 'order',
            title: 'Display Order',
            type: 'number',
            description: 'Controls the order of this category card on the dashboard (1-6).',
            initialValue: 0
        }),
        defineField({
            name: 'description',
            title: 'Category Description',
            type: 'text',
            rows: 3,
            description: 'A brief overview of this category for the drilldown page.'
        }),
        defineField({
            name: 'strategicVerdict',
            title: 'Strategic Verdict (Curation)',
            type: 'object',
            fields: [
                defineField({
                    name: 'title',
                    title: 'Verdict Title',
                    type: 'string',
                    description: 'e.g., The Macro Thesis'
                }),
                defineField({
                    name: 'content',
                    title: 'Verdict Content',
                    type: 'text',
                    rows: 5,
                    description: 'The deep analytical insight for this category.'
                }),
            ],
            description: 'The sidebar "Strategic Verdict" section on the drilldown page.'
        }),
        defineField({
            name: 'metrics',
            title: 'Category Metrics',
            type: 'array',
            of: [
                defineArrayMember({
                    type: 'object',
                    name: 'metric',
                    title: 'Metric',
                    fields: [
                        defineField({
                            name: 'label',
                            title: 'Metric Label',
                            type: 'string',
                            validation: (Rule) => Rule.required(),
                            description: 'e.g., GDP Forecast 2026'
                        }),
                        defineField({
                            name: 'value',
                            title: 'Primary Value',
                            type: 'string',
                            validation: (Rule) => Rule.required(),
                            description: 'e.g., +4.8%'
                        }),
                        defineField({
                            name: 'trend',
                            title: 'Secondary Trend Text',
                            type: 'string',
                            description: 'e.g., Strong'
                        }),
                        defineField({
                            name: 'trendDir',
                            title: 'Trend Direction',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Up (Positive/Green)', value: 'up' },
                                    { title: 'Down (Negative/Red)', value: 'down' },
                                    { title: 'Neutral (Gray)', value: 'neutral' },
                                ],
                            },
                            validation: (Rule) => Rule.required(),
                        }),
                        defineField({
                            name: 'description',
                            title: 'Analysis Description',
                            type: 'text',
                            rows: 2,
                            description: 'Short analytical text explaining the metric.'
                        }),
                        defineField({
                            name: 'historicalData',
                            title: 'Historical Data (Drilldown)',
                            type: 'array',
                            description: 'Time-series data for analysis charts (e.g., Year vs Value).',
                            of: [
                                defineArrayMember({
                                    type: 'object',
                                    name: 'dataPoint',
                                    title: 'Data Point',
                                    fields: [
                                        defineField({
                                            name: 'year',
                                            title: 'Year / Period',
                                            type: 'string',
                                            validation: (Rule) => Rule.required(),
                                            description: 'e.g., 2023, Q1 2024, etc.'
                                        }),
                                        defineField({
                                            name: 'value',
                                            title: 'Value',
                                            type: 'number',
                                            validation: (Rule) => Rule.required(),
                                            description: 'Numeric value for charting.'
                                        }),
                                    ],
                                    preview: {
                                        select: {
                                            title: 'year',
                                            subtitle: 'value',
                                        },
                                    },
                                }),
                            ],
                        }),
                    ],
                    preview: {
                        select: {
                            title: 'label',
                            subtitle: 'value',
                        },
                    },
                }),
            ],
            description: 'Add the individual stats that belong to this category.'
        }),
    ],
    preview: {
        select: {
            title: 'title',
            subtitle: 'metrics.length',
        },
        prepare(selection) {
            const { title, subtitle } = selection
            return {
                title: title,
                subtitle: subtitle ? `${subtitle} metrics configured` : 'No metrics configured',
            }
        },
    },
})
