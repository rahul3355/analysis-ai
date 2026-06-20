# Trace: doc-19

**Generated:** 2026-06-20T11:26:03.508Z
**Category:** document
**Question:** How many exclusive colourway SKUs is JD granted per season under the Nike Framework Agreement, and what is the exclusivity period?

---

## Ground Truth

```
24 exclusive colourway SKUs per season (96 per year); exclusivity period ranges from 6 to 12 months.
```

---

## App Reply

JD Sports is granted **24 exclusive colourway SKUs per season** under the Nike Framework Agreement, totaling 96 exclusive SKUs per year. The exclusivity periods range from **6 to 12 months from first delivery**[1][2].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.9980276642592362
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** Nike Framework Agreement 2026-2029  JD Sports UK & Ireland | Tier 0 Partnership Agreement  Author: Head of Buying / Legal Date: February 2026 Classification: HIGHLY RESTRICTED - COMMERCIALLY SENSITIVE...

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.9920311850466846
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 0.8 |
| Checkpoints Found | 4/5 |
| Has Citations | true |
| Confidence | undefined |

### Errors

- Missing checkpoint: "24 exclusive colourway skus per season 96 per year exclusivity period ranges from 6 to 12 months"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 24 | ✅ |
| 96 | ✅ |
| 6 | ✅ |
| 12 | ✅ |
| 24 exclusive colourway skus per season 96 per year exclusivity period ranges from 6 to 12 months | ❌ |

---

## Raw JSON

```json
{
  "reply": "JD Sports is granted **24 exclusive colourway SKUs per season** under the Nike Framework Agreement, totaling 96 exclusive SKUs per year. The exclusivity periods range from **6 to 12 months from first delivery**[1][2].",
  "citations": [
    {
      "id": "bb3d8e44-42fa-4bfa-811b-2bfc54dff8b1",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "Nike Framework Agreement 2026-2029  JD Sports UK & Ireland | Tier 0 Partnership Agreement  Author: Head of Buying / Legal Date: February 2026 Classification: HIGHLY RESTRICTED - COMMERCIALLY SENSITIVE...",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.9980276642592362,
      "type": "document"
    },
    {
      "id": "192e06a9-27ac-4c56-9764-9a7cf6facefb",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.9920311850466846,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 0.8,
    "checkpointsFound": 4,
    "checkpointsTotal": 5,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"24 exclusive colourway skus per season 96 per year exclusivity period ranges from 6 to 12 months\""
    ],
    "results": [
      {
        "checkpoint": "24",
        "found": true
      },
      {
        "checkpoint": "96",
        "found": true
      },
      {
        "checkpoint": "6",
        "found": true
      },
      {
        "checkpoint": "12",
        "found": true
      },
      {
        "checkpoint": "24 exclusive colourway skus per season 96 per year exclusivity period ranges from 6 to 12 months",
        "found": false
      }
    ]
  }
}
```
