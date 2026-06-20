# Trace: hyb-21

**Generated:** 2026-06-20T02:58:44.605Z
**Category:** hybrid
**Question:** ASICS Gel Kayano 31 generated GBP 5.6 million in H1 deep dive. How many pairs were sold in BQ, and what is its stock level at Glasgow DC?

---

## Ground Truth

```
Deep dive: GBP 5.6M across ~36,000 pairs; BigQuery sold: 1 pair; Glasgow DC stock level: 300 units.
```

---

## App Reply

No relevant data found. The sources state that the ASICS Gel Kayano 31 generated GBP 5.6 million in revenue from 36,000 pairs [1][3], but they do not provide sales data for "BQ" or stock levels at the Glasgow DC.

---

## Citations

### running_footwear_category_deep_dive_h1_2026.pdf

- **Source:** doc-jd-5
- **Type:** document
- **Relevance:** 0.006413163741325347
- **Confidence:** N/A
- **Document:** running_footwear_category_deep_dive_h1_2026.pdf
- **Excerpt:** BP 8.2 million, 68,000 pairs. The most consistent seller in the running category, appealing to both casual and serious runners. 2. ASICS Gel Kayano 31 (GBP 155). Revenue GBP 5.6 million, 36,000 pairs....

### running_footwear_category_deep_dive_h1_2026.pdf

- **Source:** doc-jd-5
- **Type:** document
- **Relevance:** 0.0011740822246468028
- **Confidence:** N/A
- **Document:** running_footwear_category_deep_dive_h1_2026.pdf
- **Excerpt:** unity exists to expand distribution.  New Balance (7.7% of category - GBP 17.5 million)  Growth of 18.0% versus prior year. The Fresh Foam X 1080v13 is the top seller. Strong momentum in the premium

...

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.31 |
| Checkpoints Found | 4/9 |
| Has Citations | false |
| Confidence | high |

### Errors

- Missing checkpoint: "36000"
- Missing checkpoint: "300"
- Missing checkpoint: "units"
- Missing checkpoint: "deep dive gbp 5"
- Missing checkpoint: "6m across 36000 pairs bigquery sold 1 pair glasgow dc stock level 300 units"
- No BigQuery citation found for database/hybrid question

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 5.6 | ✅ |
| 36000 | ❌ |
| pairs | ✅ |
| 1 | ✅ |
| pair | ✅ |
| 300 | ❌ |
| units | ❌ |
| deep dive gbp 5 | ❌ |
| 6m across 36000 pairs bigquery sold 1 pair glasgow dc stock level 300 units | ❌ |

---

## Raw JSON

```json
{
  "reply": "No relevant data found. The sources state that the ASICS Gel Kayano 31 generated GBP 5.6 million in revenue from 36,000 pairs [1][3], but they do not provide sales data for \"BQ\" or stock levels at the Glasgow DC.",
  "citations": [
    {
      "id": "f1120fd1-3f37-45f2-b519-a47fee68e52c",
      "sourceId": "doc-jd-5",
      "label": "running_footwear_category_deep_dive_h1_2026.pdf",
      "excerpt": "BP 8.2 million, 68,000 pairs. The most consistent seller in the running category, appealing to both casual and serious runners. 2. ASICS Gel Kayano 31 (GBP 155). Revenue GBP 5.6 million, 36,000 pairs....",
      "documentName": "running_footwear_category_deep_dive_h1_2026.pdf",
      "relevanceScore": 0.006413163741325347,
      "type": "document"
    },
    {
      "id": "ed290ba6-f3e6-41f7-97d4-2554767c27f9",
      "sourceId": "doc-jd-5",
      "label": "running_footwear_category_deep_dive_h1_2026.pdf",
      "excerpt": "unity exists to expand distribution.  New Balance (7.7% of category - GBP 17.5 million)  Growth of 18.0% versus prior year. The Fresh Foam X 1080v13 is the top seller. Strong momentum in the premium\n\n...",
      "documentName": "running_footwear_category_deep_dive_h1_2026.pdf",
      "relevanceScore": 0.0011740822246468028,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.31,
    "checkpointsFound": 4,
    "checkpointsTotal": 9,
    "hasCitations": false,
    "errors": [
      "Missing checkpoint: \"36000\"",
      "Missing checkpoint: \"300\"",
      "Missing checkpoint: \"units\"",
      "Missing checkpoint: \"deep dive gbp 5\"",
      "Missing checkpoint: \"6m across 36000 pairs bigquery sold 1 pair glasgow dc stock level 300 units\"",
      "No BigQuery citation found for database/hybrid question"
    ],
    "results": [
      {
        "checkpoint": "gbp 5.6",
        "found": true
      },
      {
        "checkpoint": "36000",
        "found": false
      },
      {
        "checkpoint": "pairs",
        "found": true
      },
      {
        "checkpoint": "1",
        "found": true
      },
      {
        "checkpoint": "pair",
        "found": true
      },
      {
        "checkpoint": "300",
        "found": false
      },
      {
        "checkpoint": "units",
        "found": false
      },
      {
        "checkpoint": "deep dive gbp 5",
        "found": false
      },
      {
        "checkpoint": "6m across 36000 pairs bigquery sold 1 pair glasgow dc stock level 300 units",
        "found": false
      }
    ]
  }
}
```
