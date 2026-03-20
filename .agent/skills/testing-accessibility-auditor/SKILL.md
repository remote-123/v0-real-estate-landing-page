---
name: testing-accessibility-auditor
description: Specialized QA protocol for auditing Next.js interfaces against WCAG 2.2 AA standards. Ensures the `<ROICalculator/>`, `<LeadForm/>`, and dynamic App Router pages are flawlessly accessible, heavily boosting AEO (AI Engine Optimization) and SEO signals. Use when the user asks to "audit accessibility," "check WCAG compliance," "test screen reader," "AEO optimization," or "run a11y checks."
---

# Accessibility Auditor

Standards-obsessed technical auditor ensuring digital products pass rigorous WCAG 2.2 criteria. An accessible site is a prerequisite for maximum AI citation (AEO) and premium user experience.

---

## Trigger Phrases

Use this skill when you hear:
- "Audit accessibility"
- "Check WCAG compliance"
- "Ensure a11y on this component"
- "Test screen reader compatibility"
- "Optimize Next.js for AEO"
- "Lighthouse accessibility score"

---

## Tools

### Accessibility Test Suite
Utilizes Axe-core, Playwright, and manual AT (Assistive Technology) testing structures.

**Usage:**

```bash
# Run Axe-core baseline against Next.js local server
npx @axe-core/cli http://localhost:3000 --tags wcag2a,wcag2aa,wcag22aa

# Run Lighthouse automated check
npx lighthouse http://localhost:3000 --only-categories=accessibility --output=json
```

---

## Workflows

### Workflow 1: The Automated + Manual Protocol
Automated tools catch less than 30% of actual WCAG failures. Follow this dual protocol:
1. **Baseline Scan**: Run automated tools (Axe-core, Lighthouse) on local `npm run dev` or production.
2. **Keyboard Navigation Audit**: Manually tab through the site. 
   - Ensure the `<LeadForm>` and strictly the `<ROICalculator />` can be filled and submitted entirely via Keyboard.
   - Verify focus states are highly visible (crucial for premium brand perception).
3. **Screen Reader Assessment**: Verify DOM order and ARIA labeling. Are real estate prices and numeric metrics clearly announced?

### Workflow 2: Resolving Complex Component Failures
Custom Next.js Server Components and dynamic UI (like shadcn/ui) often have hidden ARIA flaws.
1. **Interactive Elements**: Ensure `<Dialog>`, `<Select>`, and `<Tabs>` used in project listings have explicit `aria-expanded`, `aria-controls`, and `aria-selected` attributes.
2. **Visual Contrast**: High-net-worth brands often use subtle grays/golds. Validate that all typography strictly hits the 4.5:1 minimum contrast ratio.
3. **Forms & Errors**: Ensure validation errors in the `<LeadForm />` are announced to screen readers dynamically using `aria-live="polite"`.

---

## Reference Guides

### AEO & SEO Impact
- **Semantic HTML**: Using correct `<article>`, `<aside>`, and heading hierarchies (`h1` -> `h2` -> `h3`) is mandatory. AI crawlers (Perplexity, ChatGPT, Gemini) rely on DOM structure to understand the real estate theses.
- **Image Alts**: Never leave empty alt text for property images. Standardize alt tags: `alt="Floorplan view of [Project Name] located in [Area], Dubai"` to boost localized search intent.

### Delivery Format
When reporting accessibility flaws to the user, strictly use the following format:
1. **WCAG Criterion**: (e.g., 1.4.3 Contrast Minimum)
2. **Severity**: (Critical / Serious / Moderate)
3. **Current State**: `[The flawed code]`
4. **Recommended Fix**: `[The corrected React/Tailwind code]`
