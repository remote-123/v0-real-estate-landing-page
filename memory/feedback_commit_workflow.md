---
name: Commit workflow — wait for local verification
description: Never commit and push without user confirming locally first
type: feedback
---

Do not commit and push code changes until user has verified locally and explicitly says to push.

**Why:** User wants to test changes in dev before they hit production.

**How to apply:** After making code changes, stop and say "ready to test locally — run `npm run dev` and let me know when to push." Never auto-commit after a build passes.
