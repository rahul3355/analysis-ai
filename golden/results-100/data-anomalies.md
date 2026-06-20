# BQ Data vs Document Claims — Anomaly Report

## Methodology
All numerical claims extracted from 5 documents. All BQ data queried from 6 tables. Every claim compared against corresponding BQ value.

---

## 🔴 Critical Anomalies (BQ data contradicts documents)

| # | Document Claim | Doc Source | BQ Actual | Delta | Impact |
|---|---------------|-----------|-----------|-------|--------|
| 1 | Online revenue is 33% of total (target) | doc1:17 | **62.96%** (£1,360 of £2,160) | +30pp | Hybrid test ht-07 expects both figures: 33% target vs 62.96% actual. The huge gap is fine for "plan vs actual" but the actual is unrealistic. |
| 2 | Online AOV target: GBP 82.00 | doc1:45 | **£113.33** | +38% | BQ has only 12 cheap online orders, average is pulled up by the £265 Nuptse jacket order. |
| 3 | Store ATV (Q3): GBP 74.50 | doc4:117 | **£160.00** | +115% | 2 of 5 store orders are high-value (£265 Nuptse, £200 AF1). No low-value store orders. |
| 4 | Apparel gross margin: **49.5%** (plan) | doc1:63 | **45.28%** | -4.2pp | Apparel includes only The North Face Nuptse Jacket (45.28% margin). No own-brand apparel with higher margins exists in BQ. |
| 5 | Adidas gross margin: **47.5%** (plan) | doc1:83 | **44.66%** | -2.8pp | Adidas has Ultraboost (44.29%) and Gazelle (45.88%). Both below plan. |
| 6 | Nike Lifestyle margin: **48-50%** (expected) | doc2:122 | **45.0%** | -3 to -5pp | Nike AF1 Low has 45.0% margin. Doc expects 48-50% for lifestyle. |
| 7 | Nike Running margin: **46-48%** (expected) | doc2:124 | **45.83%** | -0.2 to -2.2pp | Nike Pegasus 41 has 45.83%. Slightly below the 46-48% range. |
| 8 | The North Face = **5%** of revenue | doc1:89 | **24.5%** (£530 of £2,160) | +19.5pp | BQ has 2 TNF orders generating £530. This dominates the small dataset. Should be ~£108 at 5%. |
| 9 | Return rate (Q3): **22.8%** | doc4:121 | **5.88%** (1/17) | -16.9pp | Only 1 returned item out of 17. Document says 22.8% return rate (28.5% online, 4.5% in-store). BQ doesn't have enough returns. |
| 10 | Running category H1 GM: **44.0%** | doc5:19 | **44.92%** | +0.9pp | Close — within 1pp. Acceptable. |

---

## 🟡 Moderate Anomalies (document vs BQ somewhat inconsistent)

| # | Document Claim | Doc Source | BQ Actual | Delta | Notes |
|---|---------------|-----------|-----------|-------|-------|
| 11 | Nike actual GM: **46.8%** planned | doc1:79 | **45.37%** | -1.4pp | Moderate gap. Nike AF1 Low (45%), Pegasus (45.83%). Blended = 45.37%. |
| 12 | Footwear GM: **46.5%** target | doc1:55 | **45.45%** | -1.0pp | Close. Running products drag margin down. |
| 13 | Accessories GM: **51.0%** target | doc1:69 | **51.11%** | +0.1pp | **Nearly exact.** Only UA Backpack exists. Its margin is 51.11%. ✅ |
| 14 | New Balance GM: **"higher margins than average"** | doc1:87 | **47.5%** | — | NB margin is 47.5%, above the 45.45% footwear average. Claim is true. ✅ |
| 15 | Adidas revenue: **25%** of total | doc1:81 | **16.9%** (£365/£2,160) | -8.1pp | Adidas should be ~£540 at 25%. Currently £365. |
| 16 | Nike revenue: **40%** of total | doc1:77 | **25%** (£540/£2,160) | -15pp | Nike should be ~£864 at 40%. Currently £540. |
| 17 | New Balance revenue: **6%** | doc1:85 | **7.4%** (£160/£2,160) | +1.4pp | Close. Acceptable. |
| 18 | Scotland revenue: **10%** of total = £530M | doc1:111 | **29%** (£630/£2,160) | +19pp | Scotland has disproportionate orders (6 of 17). Bias towards Scotland. |
| 19 | London & SE: **30%** of revenue | doc1:107 | **30.3%** (£655/£2,160) | +0.3pp | **Nearly exact.** ✅ |
| 20 | North West: **14%** of revenue | doc1:109 | **15.7%** (£340/£2,160) | +1.7pp | Close. ✅ |

---

## ✅ Acceptable / Minor Delta

| # | Claim | BQ | Verdict |
|---|-------|-----|---------|
| 21 | Online: 12 orders of 17 = 70.6% (doc expects 33%) | 12 online, 5 store | The split doesn't match 68/33 but this is a small mock dataset |
| 22 | BTS target 45,000 AF1 | 3 sold in BQ | Scale difference is fine (mock data) |
| 23 | BTS target 38,000 Gazelle | 1 sold | Same |
| 24 | Hoka: 52% YoY growth | N/A (single year data) | Can't verify |
| 25 | Hoka: 85 stores | N/A (no store table in BQ) | Can't verify |

---

## Summary for Data Seeding

To make BQ data consistent with documents, the following changes are needed:

| Priority | Change | Reason |
|----------|--------|--------|
| **P0** | Add **apparel products** (McKenzie, Supply & Demand) with 49-55% margins | Current BQ has no apparel products with margins matching doc claims |
| **P0** | Add more **store orders** (currently only 5 of 17) | Store penetration should be ~68%, currently 29% |
| **P1** | Add **own-brand products** with 54-58% margins | Doc claims own-brand at 8% of revenue with 54-58% GM; BQ has zero own-brand products |
| **P1** | Reduce **Scotland** order share (6 of 17 = 35%) | Should be ~10% of revenue per doc |
| **P1** | Increase **Nike revenue share** from 25% to ~40% | Doc says Nike = 40% of revenue; BQ has 25% |
| **P1** | Increase **Adidas revenue share** from 17% to ~25% | Doc says Adidas = 25%; BQ has 17% |
| **P2** | Reduce **The North Face** share from 24.5% to ~5% | Doc says TNF = 5%; BQ has 24.5% |
| **P2** | Add 3-4 more returned items to match ~22% return rate | Doc Q3 review says 22.8% return rate; BQ has 5.88% |
| **P2** | Add **Vans, Puma, On Running** products to BQ | Doc1 mentions these brands; BQ has none |
| **P2** | Add more **low-value store orders** (£20-60) | Store AOV should be ~£74.50 per doc; BQ AOV is £160 |
| **P3** | Add **Wales, Yorkshire, Midlands** regions to orders | Doc mentions 11 UK regions; BQ only has Scotland, London, North West, Midlands, Wales |
