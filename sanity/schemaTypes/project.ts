import { defineField, defineType } from 'sanity'

export const projectType = defineType({
  name: 'project',
  title: 'Real Estate Project',
  type: 'document',
  fields: [
    // --- BASIC INFO ---
    defineField({
      name: 'title',
      title: 'Project Title',
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
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'e.g., Dubai Creek Harbour',
    }),
    defineField({
      name: 'developer',
      title: 'Developer',
      type: 'string',
      description: 'e.g., Emaar',
    }),
    defineField({
      name: 'type',
      title: 'Property Type (Subtitle)',
      type: 'string',
      description: 'e.g., Waterfront Apartments',
    }),

    // --- CLASSIFICATION & METRICS (UPDATED) ---
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: ['Apartments', 'Villas', 'Townhouses', 'Penthouses'] },
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['Upcoming', 'Featured', 'Selling Now', 'Pre-Launch', 'Sold Out'] },
    }),
    
    // EXPLICIT FINANCIAL & TIMELINE FIELDS
    defineField({
      name: 'startingPrice',
      title: 'Starting Price',
      type: 'string',
      description: 'e.g., AED 1.8M',
    }),
    defineField({
      name: 'paymentPlan',
      title: 'Payment Plan Structure',
      type: 'string',
      description: 'e.g., 80/20 during construction',
    }),
    defineField({
      name: 'completion',
      title: 'Completion / Handover Date',
      type: 'string',
      description: 'e.g., Q4 2028',
    }),
    defineField({
      name: 'roi',
      title: 'Expected ROI',
      type: 'string',
      description: 'e.g., 8% Net',
    }),

    // --- MARKETING TEXT ---
    defineField({
      name: 'uniquenessTitle',
      title: 'Why invest here?',
      type: 'string',
      description: 'e.g., The Last Waterfront Plot in Creek Harbour',
    }),
    defineField({
      name: 'uniquenessDescription',
      title: 'Uniqueness Description',
      type: 'text',
    }),
    defineField({
      name: 'description',
      title: 'Main Description',
      type: 'text',
    }),

    // --- DETAILS & AMENITIES ---
    defineField({
      name: 'amenities',
      title: 'Amenities',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'details',
      title: 'Other Project Details',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Label', type: 'string', description: 'e.g., Unit Types' },
            { name: 'value', title: 'Value', type: 'string', description: 'e.g., 1, 2, 3 BR' },
          ],
        },
      ],
    }),
    defineField({
      name: 'connectivity',
      title: 'Connectivity',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'location', title: 'Location', type: 'string', description: 'e.g., Downtown Dubai' },
            { name: 'duration', title: 'Duration', type: 'string', description: 'e.g., 10 Min' },
          ],
        },
      ],
    }),

    // --- IMAGES ---
    defineField({
      name: 'image',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'gallery',
      title: 'Image Gallery',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
    defineField({
      name: 'masterplanImage',
      title: 'Masterplan Image',
      type: 'image',
    }),
    defineField({
      name: 'paymentPlanImage',
      title: 'Payment Plan Table Image',
      type: 'image',
    }),
    defineField({
      name: 'floorPlanImage',
      title: 'Floor Plan Image',
      type: 'image',
    }),
  ],
})