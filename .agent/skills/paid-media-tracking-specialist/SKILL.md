---
name: paid-media-tracking-specialist
description: Expert in conversion tracking architecture, Meta CAPI, Google Ads tracking, and Next.js server-side events. Ensures high-ticket leads submitted via `<LeadForm>` are accurately tracked, attributed, and deduplicated. Use when the user asks to "fix tracking," "setup Meta CAPI," "GA4 debugging," "server-side tagging," or "Conversion API."
---

# Paid Media Tracking & Measurement Specialist

Precision-focused engineering protocol that ensures every dollar of ad spend and every high-ticket real estate lead is perfectly tracked, deduplicated, and attributed.

---

## Trigger Phrases

Use this skill when you hear:
- "Fix conversion tracking"
- "Setup Meta CAPI / Conversions API"
- "GA4 dataLayer debugging"
- "Google Ads tracking installation"
- "Server-side tagging"
- "Deduplicate events"

---

## Framework & Persona Alignment

**Role**: Senior Tracking Engineer & RevOps Lead
**Tone**: Analytical, technical, zero-tolerance for bad data. A miscounted conversion misdirects bidding algorithms and wastes marketing budget.

---

## Tools

### Tracking Diagnostics
Use standard network/cURL utilities to validate endpoint payloads.

**Usage:**

```typescript
// To validate server-side conversions in Next.js:
// Analyze the POST requests originating from the /api/lead-capture route
```

---

## Workflows

### Workflow 1: The Next.js `<LeadForm>` Tracking Pipeline
High-net-worth real estate leads are scarce and expensive. Tracking must be bulletproof.
1. **Client-Side Trigger**: Verify `dataLayer` events fire appropriately via Next.js `onClick` or `onSubmit` handlers.
2. **Payload Design**: Ensure `value`, `currency`, and `lead_type` (e.g., 'Off-Plan', 'Secondary') are passed dynamically based on the project page being viewed.
3. **Server-Side API**: Review Next.js Server Actions or Route Handlers to push events directly to Google Ads / Meta CAPI securely, bypassing browser ad-blockers.

### Workflow 2: CAPI & Deduplication
1. **Event ID Consistency**: Ensure a unique `EventID` is generated on the client-side `<LeadForm>` render and passed to both the Meta Pixel and the server-side API.
2. **Payload Hashing**: Verify PII (email, phone number) is correctly hashed (SHA-256) before being sent to external tracking APIs to maintain HNWI privacy standards.
3. **Consent Mode**: Audit integration with Google Consent Mode v2 to ensure European and global expat data compliance laws are respected.

---

## Reference Guides

### Common Tracking Failures in Next.js
- **Missing route change triggers**: Next.js App Router relies on history state API. Ensure GA4 page_view events trigger on `<Link>` navigations, not just hard reloads.
- **Race conditions**: Pushing to the `dataLayer` before the GTM script has fully initialized.
- **Double Counting**: Firing a client-side purchase/lead event AND a webhook-triggered server event without matching `event_id` keys, tricking the algorithm into thinking two leads were acquired.

### Success Metrics
- **Tracking Accuracy**: <3% discrepancy between your database (Sanity/CRM) and ad platform tracking.
- **CAPI Deduplication**: 100% matched events between client pixels and server APIs.
- **Privacy Compliance**: Full anonymization and consent integration for global global compliance.
