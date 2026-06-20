# Trace: doc-21

**Generated:** 2026-06-20T11:26:17.642Z
**Category:** document
**Question:** What are the payment and settlement discount terms under the Nike Framework Agreement?

---

## Ground Truth

```
Payment terms: 60 days from the end of the month of invoice; Settlement discount: 2% if paid within 30 days.
```

---

## App Reply

Payment terms are 60 days from the end of the month of invoice. A 2% settlement discount applies if payment is made within 30 days of the invoice date [1].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.03978780836936238
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....

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

- Missing checkpoint: "payment terms 60 days from the end of the month of invoice settlement discount 2% if paid within 30 days"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 60 | ✅ |
| 2% | ✅ |
| 30 | ✅ |
| payment terms 60 days from the end of the month of invoice settlement discount 2% if paid within 30 days | ❌ |

---

## Raw JSON

```json
{
  "reply": "Payment terms are 60 days from the end of the month of invoice. A 2% settlement discount applies if payment is made within 30 days of the invoice date [1].",
  "citations": [
    {
      "id": "f5dec61c-adbe-4835-a108-feb03246758c",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.03978780836936238,
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
      "Missing checkpoint: \"payment terms 60 days from the end of the month of invoice settlement discount 2% if paid within 30 days\""
    ],
    "results": [
      {
        "checkpoint": "60",
        "found": true
      },
      {
        "checkpoint": "2%",
        "found": true
      },
      {
        "checkpoint": "30",
        "found": true
      },
      {
        "checkpoint": "payment terms 60 days from the end of the month of invoice settlement discount 2% if paid within 30 days",
        "found": false
      }
    ]
  }
}
```
