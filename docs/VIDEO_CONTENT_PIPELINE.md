# AI Video Content Pipeline — North Capital DXB

Goal: Drive users to the terminal via automated short-form video published to Instagram Reels, TikTok, YouTube Shorts, and LinkedIn — at ~$3.60/video, 10 videos/week.

---

## Stack

| Role | Tool | Cost |
|---|---|---|
| Script | Gemini 2.0 Flash (`GEMINI_DISTRESS_API_KEY`) | $0 |
| Voiceover | ElevenLabs API — Creator plan | $22/mo |
| Chart animation | Remotion + `@remotion/lambda` → S3 | ~$0.03/render |
| B-roll footage | Pexels API (free, royalty-free) | $0 |
| Video composition | Shotstack (already integrated) | ~$20/mo |
| Approval | Telegram bot (already built) | $0 |
| Publishing | Ayrshare Premium | $99/mo |
| Scheduler | cron-job.org (already used) | $0 |

**Total: ~$144/month for 40 videos → $3.60/video across 4 platforms**

---

## End-to-End Flow

```
cron-job.org
    │
    ▼
/api/cron/generate-video?type=yield_ranking
    │
    ├─ Step 1: Query Neon (~1s)
    │   SELECT community, avg_yield, mom_pct, txn_count
    │   FROM mv_txn_monthly ORDER BY avg_yield DESC LIMIT 10
    │
    ├─ Step 2: Generate Script — Gemini Flash (~3s, $0)
    │   Input: data JSON + video_type
    │   Output: { title, narration, caption, hashtags }
    │
    ├─ Step 3: Voiceover — ElevenLabs (~5s, ~$0.02)
    │   POST /v1/text-to-speech/{voice_id}
    │   Model: eleven_turbo_v2_5
    │   Output: MP3 → Vercel Blob → public URL
    │
    ├─ Step 4: Chart Animation — Remotion Lambda (~30s, ~$0.03)
    │   renderMediaOnLambda({ composition: 'YieldRanking', inputProps: { data } })
    │   Output: MP4 (5–8s animated chart) → S3 URL
    │
    ├─ Step 5: Final Composition — Shotstack (~90s, ~$0.10)
    │   Timeline:
    │     Track 1: Pexels B-roll (15s, zoomIn)
    │     Track 2: Remotion chart clip (overlay, seconds 3–8)
    │     Track 3: HTML overlay (brand + title + CTA)
    │     Track 4: ElevenLabs MP3 audio
    │   Output: 1080×1920 MP4 → S3 URL
    │
    ├─ Step 6: Human Review via Telegram (optional gate)
    │   Send MP4 + caption to private Telegram group
    │   Inline buttons: [✅ Approve & Publish] [❌ Reject] [✏️ Edit Caption]
    │   Auto-publish after 4h if no response
    │
    └─ Step 7: Publish — Ayrshare (~5s, amortised $2.48)
        POST /api/post
        {
          post: caption + hashtags,
          mediaUrls: [shotstackMp4Url],
          platforms: ["instagram", "tiktok", "linkedin", "youtube"],
          scheduleDate: "optimal posting time"
        }
```

**Total pipeline time: ~2.5 minutes per video**

---

## Content Types & Cadence

| Video | Data source | Cadence |
|---|---|---|
| Top 10 communities by rental yield | `mv_txn_monthly` | Monthly |
| Fastest rising areas by price momentum | `mv_txn_monthly` | Monthly |
| Distress deal of the week | PropertyFinder API (existing) | Weekly |
| Transaction volume pulse | `mv_txn_monthly` | Weekly |
| New supply pipeline this quarter | `dld_projects` | Quarterly |
| Service charge benchmarks | `dld_service_charges` | Quarterly |
| Which developer delivers on time? | `dld_projects` | Quarterly |

---

## What Is Fully Automated vs. Needs Human Review

| Step | Automated? | Notes |
|---|---|---|
| Data query | ✅ Yes | Deterministic |
| Script generation | ✅ Yes | LLM stable for structured data |
| Voiceover | ✅ Yes | One API call |
| Chart animation | ✅ Yes | Remotion is code-driven |
| Video composition | ✅ Yes | Shotstack JSON templated |
| Caption + hashtags | ⚠️ Review recommended | LLM occasionally hallucinates |
| Publish scheduling | ✅ Yes | Ayrshare handles timing |
| Content approval | ⚠️ Recommended | 5-min Telegram check catches errors |

---

## Build Order

1. **`/api/video-generator`** — generic route accepting `video_type` param; extends existing `/api/distress-video` pattern
2. **ElevenLabs voiceover** — single POST, MP3 to Vercel Blob, return public URL
3. **Pexels B-roll** — keyword search → first result URL → Shotstack asset (no download, direct URL)
4. **Remotion compositions** — build 2–3 chart templates (`YieldRanking`, `PriceMomentum`, `VolumePulse`); deploy to Lambda
5. **Ayrshare publish step** — POST after Telegram approval (reuse existing webhook infrastructure)
6. **Cron entries** — one per video type on cadence above

---

## What to Skip in V1

- **AI avatars** (HeyGen, Synthesia) — adds $1–6/video, not needed for data content
- **Runway / generative video** — hallucination risk for factual data
- **CapCut** — no API
- **Platform-specific OAuth** (Meta, TikTok, LinkedIn) — use Ayrshare instead

---

## New Environment Variables Required

```
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
PEXELS_API_KEY=
AYRSHARE_API_KEY=
AWS_REMOTION_BUCKET=       # S3 bucket for Remotion Lambda renders
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
```

---

## Cost Model at Scale

| Videos/week | Monthly videos | ElevenLabs | Shotstack | Ayrshare | AWS | Total/mo | Per video |
|---|---|---|---|---|---|---|---|
| 10 | 40 | $22 | $20 | $99 | ~$3 | ~$144 | $3.60 |
| 20 | 80 | $22 | $40 | $99 | ~$6 | ~$167 | $2.09 |
| 40 | 160 | $99 (Pro) | $80 | $99 | ~$12 | ~$290 | $1.81 |

Comparable professional video production: $200–500/video. This pipeline is a **50–130× cost reduction**.

---

*Last updated: 2026-03-23*
