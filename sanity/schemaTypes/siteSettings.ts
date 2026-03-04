import { defineField, defineType } from 'sanity'
import { Settings } from 'lucide-react'

export const siteSettings = defineType({
    name: 'siteSettings',
    title: 'Site Settings',
    type: 'document',
    icon: Settings as any,
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            initialValue: 'Global Site Settings',
            description: 'Used internally to identify this document.'
        }),
        defineField({
            name: 'baseInterestRate',
            title: 'Base Interest Rate (%)',
            type: 'number',
            description: 'Global mortgage rate base used in the ROI calculator.',
            initialValue: 4.5
        }),
        defineField({
            name: 'avgDubaiYield',
            title: 'Average Dubai Yield (%)',
            type: 'number',
            description: 'Used as a benchmark in charts.',
            initialValue: 6.2
        }),
        defineField({
            name: 'defaultCurrency',
            title: 'Default Currency',
            type: 'string',
            initialValue: 'AED'
        }),
    ],
})
