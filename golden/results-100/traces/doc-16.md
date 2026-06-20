# Trace: doc-16

**Generated:** 2026-06-20T11:25:30.323Z
**Category:** document
**Question:** What is the planned revenue target and gross margin for own-brand products in the annual sales plan?

---

## Ground Truth

```
Target: GBP 424 million; Gross margin: 54% to 58%.
```

---

## App Reply

The planned revenue target for own-brand products is **GBP 424 million**, with a gross margin target of **54–58%** [5].

---

## Citations

### fy2027_annual_sales_plan.pdf

- **Source:** doc-jd-1
- **Type:** document
- **Relevance:** 0.008061991528271641
- **Confidence:** N/A
- **Document:** fy2027_annual_sales_plan.pdf
- **Excerpt:** llion, GM 48.0% Growing at 18% YoY. Premium positioning drives margins above corporate average.  The North Face (5%):   GBP 265 million, GM 50.0% Dominant outerwear brand. Peak sales in autumn/winter....

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 0.6 |
| Checkpoints Found | 3/5 |
| Has Citations | true |
| Confidence | undefined |

### Errors

- Missing checkpoint: "54%"
- Missing checkpoint: "target gbp 424 million gross margin 54% to 58%"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 424 | ✅ |
| million | ✅ |
| 54% | ❌ |
| 58% | ✅ |
| target gbp 424 million gross margin 54% to 58% | ❌ |

---

## Raw JSON

```json
{
  "reply": "The planned revenue target for own-brand products is **GBP 424 million**, with a gross margin target of **54–58%** [5].",
  "citations": [
    {
      "id": "349c44b2-88c7-449b-a605-4b4764592bf9",
      "sourceId": "doc-jd-1",
      "label": "fy2027_annual_sales_plan.pdf",
      "excerpt": "llion, GM 48.0% Growing at 18% YoY. Premium positioning drives margins above corporate average.  The North Face (5%):   GBP 265 million, GM 50.0% Dominant outerwear brand. Peak sales in autumn/winter....",
      "documentName": "fy2027_annual_sales_plan.pdf",
      "relevanceScore": 0.008061991528271641,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 0.6,
    "checkpointsFound": 3,
    "checkpointsTotal": 5,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"54%\"",
      "Missing checkpoint: \"target gbp 424 million gross margin 54% to 58%\""
    ],
    "results": [
      {
        "checkpoint": "gbp 424",
        "found": true
      },
      {
        "checkpoint": "million",
        "found": true
      },
      {
        "checkpoint": "54%",
        "found": false
      },
      {
        "checkpoint": "58%",
        "found": true
      },
      {
        "checkpoint": "target gbp 424 million gross margin 54% to 58%",
        "found": false
      }
    ]
  }
}
```
