# Trace: doc-14

**Generated:** 2026-06-20T11:25:17.816Z
**Category:** document
**Question:** What is the planned revenue target and gross margin for the Nike brand in the annual sales plan?

---

## Ground Truth

```
Target: GBP 2.12 billion; Gross margin: 46.8%.
```

---

## App Reply

TheFY2027 annual sales plan targets Nike brand revenue of **GBP 2.12 billion** with a gross margin of **46.8%** [2][12].

---

## Citations

### fy2027_annual_sales_plan.pdf

- **Source:** doc-jd-1
- **Type:** document
- **Relevance:** 0.024563088772028722
- **Confidence:** N/A
- **Document:** fy2027_annual_sales_plan.pdf
- **Excerpt:** eted at GBP 82.00, with a conversion rate of 5.0%. Click and collect is expected to account for 25% of online orders, driving additional footfall into stores. The JD Status loyalty programme, with a

...

### fy2027_annual_sales_plan.pdf

- **Source:** doc-jd-1
- **Type:** document
- **Relevance:** 0.0023231625226312826
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

- Missing checkpoint: "target gbp 2"
- Missing checkpoint: "12 billion gross margin 46"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 2.12 | ✅ |
| billion | ✅ |
| 46.8% | ✅ |
| target gbp 2 | ❌ |
| 12 billion gross margin 46 | ❌ |

---

## Raw JSON

```json
{
  "reply": "TheFY2027 annual sales plan targets Nike brand revenue of **GBP 2.12 billion** with a gross margin of **46.8%** [2][12].",
  "citations": [
    {
      "id": "2ed72724-0f69-488f-bef9-e679ef13f155",
      "sourceId": "doc-jd-1",
      "label": "fy2027_annual_sales_plan.pdf",
      "excerpt": "eted at GBP 82.00, with a conversion rate of 5.0%. Click and collect is expected to account for 25% of online orders, driving additional footfall into stores. The JD Status loyalty programme, with a\n\n...",
      "documentName": "fy2027_annual_sales_plan.pdf",
      "relevanceScore": 0.024563088772028722,
      "type": "document"
    },
    {
      "id": "f032c58a-cef1-4b05-bd90-5f758ecdeebc",
      "sourceId": "doc-jd-1",
      "label": "fy2027_annual_sales_plan.pdf",
      "excerpt": "llion, GM 48.0% Growing at 18% YoY. Premium positioning drives margins above corporate average.  The North Face (5%):   GBP 265 million, GM 50.0% Dominant outerwear brand. Peak sales in autumn/winter....",
      "documentName": "fy2027_annual_sales_plan.pdf",
      "relevanceScore": 0.0023231625226312826,
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
      "Missing checkpoint: \"target gbp 2\"",
      "Missing checkpoint: \"12 billion gross margin 46\""
    ],
    "results": [
      {
        "checkpoint": "gbp 2.12",
        "found": true
      },
      {
        "checkpoint": "billion",
        "found": true
      },
      {
        "checkpoint": "46.8%",
        "found": true
      },
      {
        "checkpoint": "target gbp 2",
        "found": false
      },
      {
        "checkpoint": "12 billion gross margin 46",
        "found": false
      }
    ]
  }
}
```
