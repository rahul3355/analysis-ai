# Trace: doc-20

**Generated:** 2026-06-20T11:26:09.975Z
**Category:** document
**Question:** What are the trade discounts granted by Nike to JD for core lifestyle, running, and Jordan Brand products?

---

## Ground Truth

```
Core lifestyle: 49% off RRP; Running: 47% off RRP; Premium and Jordan Brand: 44% off RRP.
```

---

## App Reply

Nike grants JD a trade discount of 49% off the recommended retail price (RRP) on core lifestyle product (including Air Force 1, Air Max, and Dunk franchises), 47% off RRP on running product, and 44% off RRP on premium and Jordan Brand product [1][2].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.9885803853543514
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.9492005402963102
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** allowance is 1.5% of units delivered. Product exceeding this defect rate is replaced by Nike at no cost to JD. JD may return unsold product to Nike, subject to a cap of 3% of annual purchase volume.

...

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 0.75 |
| Checkpoints Found | 3/4 |
| Has Citations | true |
| Confidence | undefined |

### Errors

- Missing checkpoint: "core lifestyle 49% off rrp running 47% off rrp premium and jordan brand 44% off rrp"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 49% | ✅ |
| 47% | ✅ |
| 44% | ✅ |
| core lifestyle 49% off rrp running 47% off rrp premium and jordan brand 44% off rrp | ❌ |

---

## Raw JSON

```json
{
  "reply": "Nike grants JD a trade discount of 49% off the recommended retail price (RRP) on core lifestyle product (including Air Force 1, Air Max, and Dunk franchises), 47% off RRP on running product, and 44% off RRP on premium and Jordan Brand product [1][2].",
  "citations": [
    {
      "id": "508d1b14-7b5b-4287-a229-91dc665cfe92",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.9885803853543514,
      "type": "document"
    },
    {
      "id": "c57e27fb-93b9-4927-a810-a9f42a14dac2",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "allowance is 1.5% of units delivered. Product exceeding this defect rate is replaced by Nike at no cost to JD. JD may return unsold product to Nike, subject to a cap of 3% of annual purchase volume.\n\n...",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.9492005402963102,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 0.75,
    "checkpointsFound": 3,
    "checkpointsTotal": 4,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"core lifestyle 49% off rrp running 47% off rrp premium and jordan brand 44% off rrp\""
    ],
    "results": [
      {
        "checkpoint": "49%",
        "found": true
      },
      {
        "checkpoint": "47%",
        "found": true
      },
      {
        "checkpoint": "44%",
        "found": true
      },
      {
        "checkpoint": "core lifestyle 49% off rrp running 47% off rrp premium and jordan brand 44% off rrp",
        "found": false
      }
    ]
  }
}
```
