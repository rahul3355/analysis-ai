# Trace: doc-17

**Generated:** 2026-06-20T11:25:37.949Z
**Category:** document
**Question:** How many shop-in-shops does JD Sports commit to operate for Nike by the end of year two of the framework agreement?

---

## Ground Truth

```
A minimum of 85 shop-in-shops.
```

---

## App Reply

JD Sports commits to operate a minimum of 85 Nike shop-in-shops across the territory by the end of year two [1].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.9309620718252101
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** Nike Framework Agreement 2026-2029  JD Sports UK & Ireland | Tier 0 Partnership Agreement  Author: Head of Buying / Legal Date: February 2026 Classification: HIGHLY RESTRICTED - COMMERCIALLY SENSITIVE...

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 0.5 |
| Checkpoints Found | 1/2 |
| Has Citations | true |
| Confidence | undefined |

### Errors

- Missing checkpoint: "a minimum of 85 shopinshops"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 85 | ✅ |
| a minimum of 85 shopinshops | ❌ |

---

## Raw JSON

```json
{
  "reply": "JD Sports commits to operate a minimum of 85 Nike shop-in-shops across the territory by the end of year two [1].",
  "citations": [
    {
      "id": "67d690bc-5284-46ff-ae88-bdce67c2e41d",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "Nike Framework Agreement 2026-2029  JD Sports UK & Ireland | Tier 0 Partnership Agreement  Author: Head of Buying / Legal Date: February 2026 Classification: HIGHLY RESTRICTED - COMMERCIALLY SENSITIVE...",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.9309620718252101,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 0.5,
    "checkpointsFound": 1,
    "checkpointsTotal": 2,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"a minimum of 85 shopinshops\""
    ],
    "results": [
      {
        "checkpoint": "85",
        "found": true
      },
      {
        "checkpoint": "a minimum of 85 shopinshops",
        "found": false
      }
    ]
  }
}
```
