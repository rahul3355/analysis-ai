# Trace: doc-22

**Generated:** 2026-06-20T11:26:23.696Z
**Category:** document
**Question:** What is the minimum annual purchase volume commitment at wholesale cost under the Nike Framework Agreement?

---

## Ground Truth

```
GBP 650 million.
```

---

## App Reply

The minimum annual purchase commitment is GBP 650 million at wholesale cost [1][2].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.15380319590944705
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** allowance is 1.5% of units delivered. Product exceeding this defect rate is replaced by Nike at no cost to JD. JD may return unsold product to Nike, subject to a cap of 3% of annual purchase volume.

...

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.13039611610721075
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 1 |
| Checkpoints Found | 3/3 |
| Has Citations | true |
| Confidence | undefined |

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 650 | ✅ |
| million | ✅ |
| gbp 650 million | ✅ |

---

## Raw JSON

```json
{
  "reply": "The minimum annual purchase commitment is GBP 650 million at wholesale cost [1][2].",
  "citations": [
    {
      "id": "160d7acd-6439-4054-92cb-0f3d17adb36d",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "allowance is 1.5% of units delivered. Product exceeding this defect rate is replaced by Nike at no cost to JD. JD may return unsold product to Nike, subject to a cap of 3% of annual purchase volume.\n\n...",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.15380319590944705,
      "type": "document"
    },
    {
      "id": "53ce0b61-0107-437a-9579-40cfa9bac37c",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.13039611610721075,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 1,
    "checkpointsFound": 3,
    "checkpointsTotal": 3,
    "hasCitations": true,
    "errors": [],
    "results": [
      {
        "checkpoint": "gbp 650",
        "found": true
      },
      {
        "checkpoint": "million",
        "found": true
      },
      {
        "checkpoint": "gbp 650 million",
        "found": true
      }
    ]
  }
}
```
