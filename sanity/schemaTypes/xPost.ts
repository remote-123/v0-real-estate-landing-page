import { defineField, defineType } from 'sanity'

export const xPost = defineType({
  name: 'xPost',
  title: 'X Posts',
  type: 'document',
  fields: [
    defineField({
      name: 'postText',
      title: 'Post Text',
      type: 'text',
      rows: 5,
      description: 'The tweet text. Keep under 280 characters.',
      validation: (Rule) => Rule.required().max(280),
    }),
    defineField({
      name: 'imageBrief',
      title: 'Image Brief',
      type: 'text',
      rows: 3,
      description: 'What screenshot or visual to attach to this post before publishing.',
    }),
    defineField({
      name: 'suggestedHashtags',
      title: 'Suggested Hashtags',
      type: 'string',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Approved — Ready to Post', value: 'approved' },
          { title: 'Posted', value: 'posted' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'dealTitle',
      title: 'Deal: Property Title',
      type: 'string',
    }),
    defineField({
      name: 'dealLocation',
      title: 'Deal: Location',
      type: 'string',
    }),
    defineField({
      name: 'dealType',
      title: 'Deal: Property Type',
      type: 'string',
    }),
    defineField({
      name: 'dealBedrooms',
      title: 'Deal: Bedrooms',
      type: 'string',
    }),
    defineField({
      name: 'dealCurrentPrice',
      title: 'Deal: Current Price (AED)',
      type: 'number',
    }),
    defineField({
      name: 'dealOriginalPrice',
      title: 'Deal: Original Price (AED)',
      type: 'number',
    }),
    defineField({
      name: 'dealDiscountPercent',
      title: 'Deal: Discount %',
      type: 'number',
    }),
    defineField({
      name: 'dealDaysOnMarket',
      title: 'Deal: Days on Market',
      type: 'number',
    }),
    defineField({
      name: 'dealSource',
      title: 'Deal: Data Source',
      type: 'string',
      options: {
        list: [
          { title: 'PropertyFinder', value: 'pf' },
          { title: 'Bayut', value: 'bayut' },
        ],
      },
    }),
    defineField({
      name: 'dealExternalUrl',
      title: 'Deal: Listing URL',
      type: 'url',
    }),
    defineField({
      name: 'generatedAt',
      title: 'Generated At',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {
      text: 'postText',
      status: 'status',
      location: 'dealLocation',
      discount: 'dealDiscountPercent',
    },
    prepare({ text, status, location, discount }) {
      const statusEmoji = status === 'posted' ? '✅' : status === 'approved' ? '🟡' : '⚪'
      return {
        title: text?.substring(0, 70) + '...' || 'X Post Draft',
        subtitle: `${statusEmoji} ${status?.toUpperCase()} · ${location || ''} · ${discount ? `-${discount}%` : ''}`,
      }
    },
  },
})
