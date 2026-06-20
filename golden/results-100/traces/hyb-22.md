# Trace: hyb-22

**Generated:** 2026-06-20T02:59:11.508Z
**Category:** hybrid
**Question:** Nike Dunk Low targets 32,000 pairs in the campaign brief. How many pairs were sold and what is the stock level at Manchester DC?

---

## Ground Truth

```
Target: 32,000; BigQuery sold: 0 pairs (processing orders do not count as sold); Manchester DC stock level: 1,200 units.
```

---

## App Reply

No relevant data found. The sources provide the target volume of 32,000 pairs for the Nike Dunk Low in the Back to School campaign [1], but they do not contain any information on actual pairs sold or stock levels at the Manchester distribution centre.

---

## Citations

### back_to_school_2026_campaign_brief.pdf

- **Source:** doc-jd-3
- **Type:** document
- **Relevance:** 0.02816747285727831
- **Confidence:** N/A
- **Document:** back_to_school_2026_campaign_brief.pdf
- **Excerpt:** Back to School 2026 Campaign Brief  "Ready for the New Term" | Campaign Code: JD-BTS-26001  Author: Marketing Director Date: June 2026 Classification: CONFIDENTIAL - INTERNAL USE ONLY

1. Campaign Ove...

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.2 |
| Checkpoints Found | 2/7 |
| Has Citations | false |
| Confidence | high |

### Errors

- Missing checkpoint: "32000"
- Missing checkpoint: "orders"
- Missing checkpoint: "1200"
- Missing checkpoint: "units"
- Missing checkpoint: "target 32000 bigquery sold 0 pairs processing orders do not count as sold manchester dc stock level 1200 units"
- No BigQuery citation found for database/hybrid question

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 32000 | ❌ |
| 0 | ✅ |
| pairs | ✅ |
| orders | ❌ |
| 1200 | ❌ |
| units | ❌ |
| target 32000 bigquery sold 0 pairs processing orders do not count as sold manchester dc stock level 1200 units | ❌ |

---

## Raw JSON

```json
{
  "reply": "No relevant data found. The sources provide the target volume of 32,000 pairs for the Nike Dunk Low in the Back to School campaign [1], but they do not contain any information on actual pairs sold or stock levels at the Manchester distribution centre.",
  "citations": [
    {
      "id": "2486c807-a68e-4c55-b3bc-e259b6534c81",
      "sourceId": "doc-jd-3",
      "label": "back_to_school_2026_campaign_brief.pdf",
      "excerpt": "Back to School 2026 Campaign Brief  \"Ready for the New Term\" | Campaign Code: JD-BTS-26001  Author: Marketing Director Date: June 2026 Classification: CONFIDENTIAL - INTERNAL USE ONLY\n\n1. Campaign Ove...",
      "documentName": "back_to_school_2026_campaign_brief.pdf",
      "relevanceScore": 0.02816747285727831,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.2,
    "checkpointsFound": 2,
    "checkpointsTotal": 7,
    "hasCitations": false,
    "errors": [
      "Missing checkpoint: \"32000\"",
      "Missing checkpoint: \"orders\"",
      "Missing checkpoint: \"1200\"",
      "Missing checkpoint: \"units\"",
      "Missing checkpoint: \"target 32000 bigquery sold 0 pairs processing orders do not count as sold manchester dc stock level 1200 units\"",
      "No BigQuery citation found for database/hybrid question"
    ],
    "results": [
      {
        "checkpoint": "32000",
        "found": false
      },
      {
        "checkpoint": "0",
        "found": true
      },
      {
        "checkpoint": "pairs",
        "found": true
      },
      {
        "checkpoint": "orders",
        "found": false
      },
      {
        "checkpoint": "1200",
        "found": false
      },
      {
        "checkpoint": "units",
        "found": false
      },
      {
        "checkpoint": "target 32000 bigquery sold 0 pairs processing orders do not count as sold manchester dc stock level 1200 units",
        "found": false
      }
    ]
  }
}
```
