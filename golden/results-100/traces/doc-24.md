# Trace: doc-24

**Generated:** 2026-06-20T11:26:39.064Z
**Category:** document
**Question:** What is the cap on Nike markdown support as a percentage of JD's annual Nike purchases, and what is the value at planned purchase volumes?

---

## Ground Truth

```
Cap: 3% of annual purchases; Value: GBP 19.5 million per year.
```

---

## App Reply

The cap on Nike markdown support is 3% of JD's annual Nike purchases. At the planned purchase volume of GBP 650 million, the cap value is GBP 19.5 million per year [1][2].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.8654516767364072
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** illion, the rebate rate is 2.0% of total purchases, paid retrospectively to the first pound. At GBP 650 million to GBP 699 million, the rate is 3.5%. At GBP 700 million and above, the rate increases

...

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.050424069043413594
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** allowance is 1.5% of units delivered. Product exceeding this defect rate is replaced by Nike at no cost to JD. JD may return unsold product to Nike, subject to a cap of 3% of annual purchase volume.

...

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

- Missing checkpoint: "cap 3% of annual purchases value gbp 19"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 3% | ✅ |
| gbp 19.5 | ✅ |
| million | ✅ |
| cap 3% of annual purchases value gbp 19 | ❌ |
| 5 million per year | ✅ |

---

## Raw JSON

```json
{
  "reply": "The cap on Nike markdown support is 3% of JD's annual Nike purchases. At the planned purchase volume of GBP 650 million, the cap value is GBP 19.5 million per year [1][2].",
  "citations": [
    {
      "id": "7208dd1c-d7dd-403e-b90e-225694e8bc6b",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "illion, the rebate rate is 2.0% of total purchases, paid retrospectively to the first pound. At GBP 650 million to GBP 699 million, the rate is 3.5%. At GBP 700 million and above, the rate increases\n\n...",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.8654516767364072,
      "type": "document"
    },
    {
      "id": "57dc9505-68a9-4850-9688-2d6aaa65c9af",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "allowance is 1.5% of units delivered. Product exceeding this defect rate is replaced by Nike at no cost to JD. JD may return unsold product to Nike, subject to a cap of 3% of annual purchase volume.\n\n...",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.050424069043413594,
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
      "Missing checkpoint: \"cap 3% of annual purchases value gbp 19\""
    ],
    "results": [
      {
        "checkpoint": "3%",
        "found": true
      },
      {
        "checkpoint": "gbp 19.5",
        "found": true
      },
      {
        "checkpoint": "million",
        "found": true
      },
      {
        "checkpoint": "cap 3% of annual purchases value gbp 19",
        "found": false
      },
      {
        "checkpoint": "5 million per year",
        "found": true
      }
    ]
  }
}
```
