# Trace: doc-23

**Generated:** 2026-06-20T11:26:31.968Z
**Category:** document
**Question:** What are the rebate rates under the Nike Framework Agreement for the different purchase volume tiers?

---

## Ground Truth

```
GBP 600M - GBP 649M: 2.0%; GBP 650M - GBP 699M: 3.5%; GBP 700M and above: 5.0%.
```

---

## App Reply

Under the Nike Framework Agreement, the rebate rates based on annual purchase volume are as follows:

- **GBP 600 million to GBP 649 million**: 2.0% of total purchases, paid retrospectively to the first pound [2].
- **GBP 650 million to GBP 699 million**: 3.5% [2].
- **GBP 700 million and above**: 5.0% [2].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.10557884359159042
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 0.73 |
| Checkpoints Found | 8/11 |
| Has Citations | true |
| Confidence | undefined |

### Errors

- Missing checkpoint: "gbp 600m  gbp 649m 2"
- Missing checkpoint: "0% gbp 650m  gbp 699m 3"
- Missing checkpoint: "5% gbp 700m and above 5"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 600 | ✅ |
| gbp 649 | ✅ |
| 2.0% | ✅ |
| gbp 650 | ✅ |
| gbp 699 | ✅ |
| 3.5% | ✅ |
| gbp 700 | ✅ |
| 5.0% | ✅ |
| gbp 600m  gbp 649m 2 | ❌ |
| 0% gbp 650m  gbp 699m 3 | ❌ |
| 5% gbp 700m and above 5 | ❌ |

---

## Raw JSON

```json
{
  "reply": "Under the Nike Framework Agreement, the rebate rates based on annual purchase volume are as follows:\n\n- **GBP 600 million to GBP 649 million**: 2.0% of total purchases, paid retrospectively to the first pound [2].\n- **GBP 650 million to GBP 699 million**: 3.5% [2].\n- **GBP 700 million and above**: 5.0% [2].",
  "citations": [
    {
      "id": "46d3133a-7527-4932-8a16-05157b6d4da5",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "wned stores without restriction. JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.  3....",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.10557884359159042,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 0.73,
    "checkpointsFound": 8,
    "checkpointsTotal": 11,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"gbp 600m  gbp 649m 2\"",
      "Missing checkpoint: \"0% gbp 650m  gbp 699m 3\"",
      "Missing checkpoint: \"5% gbp 700m and above 5\""
    ],
    "results": [
      {
        "checkpoint": "gbp 600",
        "found": true
      },
      {
        "checkpoint": "gbp 649",
        "found": true
      },
      {
        "checkpoint": "2.0%",
        "found": true
      },
      {
        "checkpoint": "gbp 650",
        "found": true
      },
      {
        "checkpoint": "gbp 699",
        "found": true
      },
      {
        "checkpoint": "3.5%",
        "found": true
      },
      {
        "checkpoint": "gbp 700",
        "found": true
      },
      {
        "checkpoint": "5.0%",
        "found": true
      },
      {
        "checkpoint": "gbp 600m  gbp 649m 2",
        "found": false
      },
      {
        "checkpoint": "0% gbp 650m  gbp 699m 3",
        "found": false
      },
      {
        "checkpoint": "5% gbp 700m and above 5",
        "found": false
      }
    ]
  }
}
```
