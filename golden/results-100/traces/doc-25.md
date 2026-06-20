# Trace: doc-25

**Generated:** 2026-06-20T11:26:44.567Z
**Category:** document
**Question:** What is the total annual co-op marketing fund provided by Nike under the agreement, and how much is allocated to national media?

---

## Ground Truth

```
Total fund: GBP 14 million per year; National media allocation: GBP 6 million (Nike contributes 70%, JD 30%).
```

---

## App Reply

Based on the agreement, Nike provides a total annual cooperative marketing fund of **GBP 14 million**. Of this, **GBP 6 million** is allocated to national media, with Nike funding 70% and JD funding 30% [1].

---

## Citations

### nike_framework_agreement_2026.pdf

- **Source:** doc-jd-2
- **Type:** document
- **Relevance:** 0.7010994973891295
- **Confidence:** N/A
- **Document:** nike_framework_agreement_2026.pdf
- **Excerpt:** of JD's core product. The remaining 30% is push allocation, where JD selects quantities upfront each season.  7. Co-op Marketing  Nike provides a cooperative marketing fund of GBP 14 million per year....

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 0.86 |
| Checkpoints Found | 6/7 |
| Has Citations | true |
| Confidence | undefined |

### Errors

- Missing checkpoint: "total fund gbp 14 million per year national media allocation gbp 6 million nike contributes 70% jd 30%"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 14 | ✅ |
| million | ✅ |
| gbp 6 | ✅ |
| 70% | ✅ |
| 30% | ✅ |
| total fund gbp 14 million per year national media allocation gbp 6 million nike contributes 70% jd 30% | ❌ |
| nike | ✅ |

---

## Raw JSON

```json
{
  "reply": "Based on the agreement, Nike provides a total annual cooperative marketing fund of **GBP 14 million**. Of this, **GBP 6 million** is allocated to national media, with Nike funding 70% and JD funding 30% [1].",
  "citations": [
    {
      "id": "e3193b6f-75f0-49e6-83b4-6a02fc84e44f",
      "sourceId": "doc-jd-2",
      "label": "nike_framework_agreement_2026.pdf",
      "excerpt": "of JD's core product. The remaining 30% is push allocation, where JD selects quantities upfront each season.  7. Co-op Marketing  Nike provides a cooperative marketing fund of GBP 14 million per year....",
      "documentName": "nike_framework_agreement_2026.pdf",
      "relevanceScore": 0.7010994973891295,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 0.86,
    "checkpointsFound": 6,
    "checkpointsTotal": 7,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"total fund gbp 14 million per year national media allocation gbp 6 million nike contributes 70% jd 30%\""
    ],
    "results": [
      {
        "checkpoint": "gbp 14",
        "found": true
      },
      {
        "checkpoint": "million",
        "found": true
      },
      {
        "checkpoint": "gbp 6",
        "found": true
      },
      {
        "checkpoint": "70%",
        "found": true
      },
      {
        "checkpoint": "30%",
        "found": true
      },
      {
        "checkpoint": "total fund gbp 14 million per year national media allocation gbp 6 million nike contributes 70% jd 30%",
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
