/**
 * LinkedIn UGC Posts API helper.
 *
 * Required env vars:
 *   LINKEDIN_ACCESS_TOKEN  — OAuth 2.0 token with w_member_social scope (expires 60 days)
 *   LINKEDIN_AUTHOR_URN    — e.g. "urn:li:person:ABC123" or "urn:li:organization:123456"
 */

export interface LinkedInPostResult {
  success: boolean
  id?: string
  error?: string
}

export async function postToLinkedIn(text: string): Promise<LinkedInPostResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const authorUrn = process.env.LINKEDIN_AUTHOR_URN

  if (!token || !authorUrn) {
    return { success: false, error: 'LINKEDIN_ACCESS_TOKEN or LINKEDIN_AUTHOR_URN not configured — skipping auto-post' }
  }

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  try {
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: `LinkedIn API ${res.status}: ${errText.slice(0, 300)}` }
    }

    const data = await res.json()
    return { success: true, id: data.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
