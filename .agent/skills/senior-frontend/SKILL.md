# Senior Frontend Skill

## Overview
Expert React/Next.js frontend development with TypeScript and Tailwind CSS. Covers component architecture, performance, accessibility, and data-heavy UI patterns.

## Core Competencies
- React Server Components vs Client Components (Next.js App Router)
- TypeScript-first component design
- Performance: virtualisation, lazy loading, Suspense streaming
- Data table patterns for large datasets
- Accessibility (WCAG 2.1 AA)

## Data Table Patterns (Relevant for Community Intelligence Table)

### TanStack Table (Recommended)
- Headless UI — full styling control with Tailwind
- Built-in: sorting, filtering, pagination, column visibility
- Virtualisation via `@tanstack/react-virtual` for 500+ rows
- TypeScript generics for type-safe column definitions

### Key Column Patterns
```tsx
// Type-safe column definition
const columns: ColumnDef<Community>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} label="Community" />,
    cell: ({ row }) => <CommunityNameCell community={row.original} />,
  },
  {
    accessorKey: 'avgPricePerSqft',
    header: 'AED/sqft',
    cell: ({ getValue }) => formatCurrency(getValue<number>()),
    sortingFn: 'basic',
  },
]
```

### Sparkline / Trend Indicators
- Small inline trend charts: use `recharts` (already likely in project) or `react-sparklines`
- Color-coded delta badges: green/red for MoM change
- DexScreener-style: compact, scannable, data-dense rows

## Next.js Optimisation Principles
- Server Components for data fetching (no client-side waterfall)
- `loading.tsx` + Suspense for streaming table skeleton
- ISR (`revalidate`) for community list — doesn't need real-time
- Client Component only for: sorting, filtering, row click interactions
- `use client` boundary at the table wrapper level, not the page

## Performance for Large Tables
- Virtual scrolling for 300+ communities (`@tanstack/react-virtual`)
- Debounce search/filter inputs (300ms)
- Memoize expensive formatters with `useMemo`
- Avoid re-renders: stable column definitions outside component

## Drill-Down Page Pattern
- Dynamic route: `/terminal/communities/[slug]`
- `generateStaticParams` for pre-rendering top 50 communities at build time
- On-demand ISR for the long tail
- Recharts for price history / yield trend charts
- Tabs or collapsible sections for: Overview | Transactions | Rentals | Supply Pipeline

## Accessibility for Data Tables
- `role="table"` with proper `th scope` attributes
- Keyboard navigation: arrow keys to move between cells
- Screen reader: announce sort direction changes
- Colour is never the only differentiator (add icons/labels alongside red/green)
