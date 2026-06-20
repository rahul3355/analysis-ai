# Trace: doc-18

**Generated:** 2026-06-20T11:25:47.360Z
**Category:** document
**Question:** What is the exclusivity zone radius for JD stores in retail parks and high streets under the Nike agreement?

---

## Ground Truth

```
0.5 miles (no other Nike multi-brand retailer may be located within 0.5 miles).
```

---

## App Reply

Under the Nike Framework Agreement, JD Sports has exclusive rights to sell Nike product in designated retail park and high street catchments, meaning no other Nike multi-brand retailer may be located within **0.5 miles** of a JD store in those locations [1].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.27904196480095
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** Nike Framework Agreement 2026-2029  JD Sports UK & Ireland | Tier 0 Partnership Agreement  Author: Head of Buying / Legal Date: February 2026 Classification: HIGHLY RESTRICTED - COMMERCIALLY SENSITIVE...

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 0.67 |
| Checkpoints Found | 2/3 |
| Has Citations | true |
| Confidence | undefined |

### Errors

- Missing checkpoint: "5 miles no other nike multibrand retailer may be located within 0"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 0.5 | ✅ |
| 5 miles no other nike multibrand retailer may be located within 0 | ❌ |
| nike | ✅ |

---

## Raw JSON

```json
{
  "reply": "Under the Nike Framework Agreement, JD Sports has exclusive rights to sell Nike product in designated retail park and high street catchments, meaning no other Nike multi-brand retailer may be located within **0.5 miles** of a JD store in those locations [1].",
  "citations": [
    {
      "id": "1b03b7bf-7711-44ce-baa6-979212282614",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "Nike Framework Agreement 2026-2029  JD Sports UK & Ireland | Tier 0 Partnership Agreement  Author: Head of Buying / Legal Date: February 2026 Classification: HIGHLY RESTRICTED - COMMERCIALLY SENSITIVE...",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.27904196480095,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 0.67,
    "checkpointsFound": 2,
    "checkpointsTotal": 3,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"5 miles no other nike multibrand retailer may be located within 0\""
    ],
    "results": [
      {
        "checkpoint": "0.5",
        "found": true
      },
      {
        "checkpoint": "5 miles no other nike multibrand retailer may be located within 0",
        "found": false
      },
      {
        "checkpoint": "nike",
        "found": true
      }
    ]
  }
}
```
