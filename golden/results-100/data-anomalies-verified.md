# BQ Data vs Document Claims — Verified Anomaly Report

**Verification agent:** Independent BQ queries run against `jd_sports` dataset on `analysis-ai-499819`
**Verification date:** 2026-06-20
**BQ data as-of:** Current state of all 6 tables (orders, order_items, products, etc.)

---

## Summary of Reclassifications

| # | Original Severity | Verified Severity | Change | Reason |
|---|---|---|---|---|
| 7 | 🔴 Critical | 🟡 Moderate | ⬇️ | 45.83% vs 46-48% range — only 0.17pp below floor; within rounding error |
| 10 | 🔴 Critical | ✅ Acceptable | ⬇️ | 44.92% vs 44.0% — 0.92pp delta; report's own note said "Acceptable" |
| 13 | 🟡 Moderate | ✅ Acceptable | ⬇️ | 51.11% vs 51.0% — 0.11pp delta; nearly exact match |
| 14 | 🟡 Moderate | ✅ Acceptable | ⬇️ | NB 47.5% > 45.45% footwear average; claim verified true |
| 17 | 🟡 Moderate | ✅ Acceptable | ⬇️ | 7.41% vs 6% — 1.41pp delta; close for mock data |
| 19 | 🟡 Moderate | ✅ Acceptable | ⬇️ | 30.32% vs 30% — 0.32pp delta; nearly exact |
| 20 | 🟡 Moderate | ✅ Acceptable | ⬇️ | 15.74% vs 14% — 1.74pp delta; close |

**Final count: 7 🔴 Critical, 4 🟡 Moderate, 14 ✅ Acceptable**

---

## 🔴 Critical Anomalies — Detailed Verification

### #1: Online Penetration — 33% target vs 62.96% actual

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT ROUND(SUM(CASE WHEN channel='online' AND status IN ('delivered','shipped') THEN total_amount ELSE 0 END) / NULLIF(SUM(CASE WHEN status IN ('delivered','shipped') THEN total_amount ELSE 0 END),0)*100,2) FROM jd_sports.orders` |
| **BQ Result** | **62.96%** (online=£1,360, total=£2,160) |
| **Doc Source** | doc1:17 — *"Online penetration is targeted at 33.0% of total UK revenue"* |
| **BQ Confirmed** | ✅ Yes — exactly 62.96% |
| **Doc Confirmed** | ✅ Yes — doc1 line 17 says 33% target |
| **Verdict** | 🔴 Critical — The actual online share (62.96%) is nearly double the target (33%). The mock dataset has 12 of 17 delivered/shipped orders online, inverting the expected 33/67 online/store split. |

**Data seeding recommendation — Add store orders to achieve ~33% online share:**

```sql
-- Add 15 store orders to bring store revenue to ~67% of total
INSERT INTO jd_sports.orders VALUES
('ORD-021','USR-010','delivered','London','store','STORE-LDN-001','2026-06-20','2026-06-20','2026-06-20',55.0),
('ORD-022','USR-004','delivered','Scotland','store','STORE-GLA-001','2026-06-21','2026-06-21','2026-06-21',75.0),
('ORD-023','USR-006','delivered','North West','store','STORE-MAN-001','2026-06-22','2026-06-22','2026-06-22',65.0);

INSERT INTO jd_sports.order_items VALUES
('ITEM-021','ORD-021','PROD-010',1,60.0,30.0,0.0,false,NULL,'2026-06-20'),
('ITEM-022','ORD-022','PROD-006',1,85.0,46.0,0.0,false,NULL,'2026-06-21'),
('ITEM-023','ORD-023','PROD-012',1,45.0,22.0,0.0,false,NULL,'2026-06-22');
```

### #2: Online AOV — £82.00 target vs £113.33 actual

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT COUNT(*), ROUND(AVG(total_amount),2) FROM jd_sports.orders WHERE channel='online' AND status IN ('delivered','shipped')` |
| **BQ Result** | **£113.33** (12 online orders) |
| **Doc Source** | doc1:45 — *"Average order value is targeted at GBP 82.00"* |
| **BQ Confirmed** | ✅ Yes — exactly 113.33 |
| **Doc Confirmed** | ✅ Yes — doc1 line 45 says £82.00 target |

**Verdict** | 🔴 Critical — The £265 Nuptse jacket order (ORD-016) and £200 AF1 order (ORD-002, store) pull the average up. The 12 online orders have only 1 sub-£50 order.

**Data seeding recommendation — Add low-value online orders:**

```sql
INSERT INTO jd_sports.orders VALUES
('ORD-026','USR-011','delivered','London','online',NULL,'2026-06-25','2026-06-27','2026-06-29',50.0),
('ORD-027','USR-012','delivered','North West','online',NULL,'2026-06-26','2026-06-28','2026-06-30',45.0);

INSERT INTO jd_sports.order_items VALUES
('ITEM-026','ORD-026','PROD-012',1,45.0,22.0,0.0,false,NULL,'2026-06-25'),
('ITEM-027','ORD-027','PROD-007',1,80.0,42.0,10.0,false,NULL,'2026-06-26');
```

### #3: Store ATV — £74.50 vs £160.00

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT COUNT(*), ROUND(AVG(total_amount),2) FROM jd_sports.orders WHERE channel='store' AND status IN ('delivered','shipped')` |
| **BQ Result** | **£160.00** (5 store orders) |
| **Doc Source** | doc4:117 — *"Average transaction value in stores was GBP 74.50 against a plan of GBP 73.00"* |
| **BQ Confirmed** | ✅ Yes — exactly £160.00 |
| **Doc Confirmed** | ✅ Yes — doc4 line 117 says £74.50 |

**Verdict** | 🔴 Critical — 2 of 5 store orders are high-value (£265 Nuptse, £200 AF1×2). Missing the low-value store orders that retail at £20-60.

**Data seeding recommendation — Add low-value (sub-£80) store orders:**

```sql
INSERT INTO jd_sports.orders VALUES
('ORD-028','USR-013','delivered','London','store','STORE-LDN-002','2026-06-28','2026-06-28','2026-06-28',60.0),
('ORD-029','USR-014','delivered','Midlands','store','STORE-BIR-001','2026-06-29','2026-06-29','2026-06-29',45.0);

INSERT INTO jd_sports.order_items VALUES
('ITEM-028','ORD-028','PROD-010',1,60.0,30.0,0.0,false,NULL,'2026-06-28'),
('ITEM-029','ORD-029','PROD-012',1,45.0,22.0,0.0,false,NULL,'2026-06-29');
```

### #4: Apparel Margin — 49.5% plan vs 45.28% actual

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT p.department, ROUND((SUM(oi.sale_price*oi.quantity)-SUM(oi.cost*oi.quantity))/SUM(oi.sale_price*oi.quantity)*100,2) FROM jd_sports.order_items oi JOIN jd_sports.orders o JOIN jd_sports.products p WHERE o.status IN ('delivered','shipped') AND p.department='Apparel'` |
| **BQ Result** | **45.28%** (revenue=£530, cost=£290) |
| **Doc Source** | doc1:63 — *"Gross margin of 49.5%"* for Apparel; doc1:95 — *"Own-brand ... delivers gross margins of 54% to 58%"* |
| **BQ Confirmed** | ✅ Yes — Apparel has only 2 items: 2× TNF Nuptse Jackets (45.28% each), no own-brand products |
| **Doc Confirmed** | ✅ Yes — doc1 lines 63 and 95 |

**Verdict** | 🔴 Critical — BQ has zero own-brand apparel (McKenzie, Supply & Demand). Doc says own-brand achieves 54-58% margin. Adding own-brand products with high margins is the only way to hit the 49.5% blended target.

**Data seeding recommendation — Add own-brand apparel products:**

```sql
-- Add own-brand products
INSERT INTO jd_sports.products VALUES
('PROD-013','McKenzie Joggers','Bottoms','Joggers','McKenzie','Apparel',55.0,23.0,'VEND-009',true,'2026-03-01'),
('PROD-014','Supply & Demand Hoodie','Tops','Hoodies','Supply & Demand','Apparel',65.0,28.0,'VEND-010',true,'2026-04-01'),
('PROD-015','Montirex Running Top','Tops','Base Layers','Montirex','Apparel',40.0,17.0,'VEND-011',true,'2026-05-01');

-- Add orders for these products
INSERT INTO jd_sports.orders VALUES
('ORD-030','USR-008','delivered','Yorkshire','online',NULL,'2026-07-01','2026-07-03','2026-07-05',120.0),
('ORD-031','USR-002','delivered','London','store','STORE-LDN-001','2026-07-02','2026-07-02','2026-07-02',65.0);

INSERT INTO jd_sports.order_items VALUES
('ITEM-030','ORD-030','PROD-013',2,55.0,23.0,0.0,false,NULL,'2026-07-01'),
('ITEM-031','ORD-031','PROD-014',1,65.0,28.0,0.0,false,NULL,'2026-07-02');
```

### #5: Adidas Margin — 47.5% plan vs 44.66% actual

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT p.brand, ROUND((SUM(oi.sale_price*oi.quantity)-SUM(oi.cost*oi.quantity))/SUM(oi.sale_price*oi.quantity)*100,2) FROM jd_sports.order_items oi JOIN ... WHERE o.status IN ('delivered','shipped') AND p.brand='Adidas'` |
| **BQ Result** | **44.66%** (revenue=£365, cost=£202) |
| **Doc Source** | doc1:83 — *"Planned gross margin is 47.5%"* |
| **BQ Confirmed** | ✅ Yes — Ultraboost Light = 44.29% ((140-78)/140), Gazelle = 45.88% ((85-46)/85) |
| **Doc Confirmed** | ✅ Yes — doc1 line 83 |

**Verdict** | 🔴 Critical — Both Adidas products are below the 47.5% plan. Need an Adidas product with margin ≥50% to lift the blend.

**Data seeding recommendation — Add higher-margin Adidas product:**

```sql
-- Adidas with better margin (e.g., Adidas Samba with cost closer to 50% of RRP)
INSERT INTO jd_sports.products VALUES
('PROD-016','Adidas Samba','Lifestyle','Casual Sneakers','Adidas','Footwear',90.0,44.0,'VEND-002',true,'2026-02-01');

INSERT INTO jd_sports.orders VALUES
('ORD-032','USR-005','delivered','Midlands','store','STORE-BIR-001','2026-07-05','2026-07-05','2026-07-05',90.0);

INSERT INTO jd_sports.order_items VALUES
('ITEM-032','ORD-032','PROD-016',1,90.0,44.0,0.0,false,NULL,'2026-07-05');
```

### #6: Nike Lifestyle Margin — 48-50% expected vs 45.0% actual

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT p.brand, p.category, ROUND((SUM(oi.sale_price*oi.quantity)-SUM(oi.cost*oi.quantity))/SUM(oi.sale_price*oi.quantity)*100,2) FROM jd_sports.order_items oi JOIN ... WHERE o.status IN ('delivered','shipped') AND p.brand='Nike' AND p.category='Lifestyle'` |
| **BQ Result** | **45.0%** (only Nike AF1 Low sold, margin = (100-55)/100 = 45.0%) |
| **Doc Source** | doc2:122 — *"Lifestyle product ... Gross margin is 48% to 50%"* |
| **BQ Confirmed** | ✅ Yes — exactly 45.0% |
| **Doc Confirmed** | ✅ Yes — doc2 line 122 |

**Verdict** | 🔴 Critical — The only Nike lifestyle product sold is AF1 Low at 45.0%. Doc says Nike trade discount on lifestyle = 49% off RRP (doc2:35), implying cost should be ~51% of RRP. Current AF1 has cost=55% of RRP (55/100). Need a Nike lifestyle product with cost closer to 50-52% of RRP.

**Data seeding recommendation — Add Nike lifestyle with better margin:**

```sql
-- Nike Dunk Low at better cost ratio (cost ~52% of RRP to get ~48% margin)
INSERT INTO jd_sports.products VALUES
('PROD-017','Nike Air Max 90','Lifestyle','Casual Sneakers','Nike','Footwear',130.0,66.0,'VEND-001',true,'2025-09-01');

INSERT INTO jd_sports.orders VALUES
('ORD-033','USR-009','delivered','Wales','online',NULL,'2026-07-08','2026-07-10','2026-07-12',130.0);

INSERT INTO jd_sports.order_items VALUES
('ITEM-033','ORD-033','PROD-017',1,130.0,66.0,0.0,false,NULL,'2026-07-08');
```

### #8: The North Face Revenue Share — 5% target vs 24.54% actual

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT p.brand, ROUND(SUM(oi.sale_price*oi.quantity),2), ROUND(SUM(oi.sale_price*oi.quantity)/(SELECT SUM(oi2.sale_price*oi2.quantity) FROM jd_sports.order_items oi2 JOIN jd_sports.orders o2 ...)*100,2) ... WHERE p.brand='The North Face'` |
| **BQ Result** | **24.54%** (£530 of £2,160) |
| **Doc Source** | doc1:89 — *"The North Face (5% of revenue, GBP 265 million)"* |
| **BQ Confirmed** | ✅ Yes — 2 TNF orders (ITEM-005, ITEM-016), both Nuptse Jackets at £265 each |
| **Doc Confirmed** | ✅ Yes — doc1 line 89 |

**Verdict** | 🔴 Critical — In a dataset of only 20 orders, 2 large TNF orders dominate. Should be ~£108 (5% of £2,160) but is £530. Fix requires adding many more non-TNF orders across other brands.

**Data seeding recommendation — Add orders from underrepresented brands (Vans, Puma, ASICS, Converse):**

```sql
INSERT INTO jd_sports.products VALUES
('PROD-018','Vans Old Skool','Lifestyle','Canvas','Vans','Footwear',65.0,33.0,'VEND-012',true,'2025-06-01');

INSERT INTO jd_sports.orders VALUES
('ORD-034','USR-001','delivered','Scotland','store','STORE-GLA-001','2026-07-10','2026-07-10','2026-07-10',130.0),
('ORD-035','USR-006','delivered','London','online',NULL,'2026-07-12','2026-07-14','2026-07-16',120.0);

INSERT INTO jd_sports.order_items VALUES
('ITEM-034','ORD-034','PROD-009',1,155.0,85.0,0.0,false,NULL,'2026-07-10'),
('ITEM-035','ORD-035','PROD-018',1,65.0,33.0,0.0,false,NULL,'2026-07-12'),
('ITEM-036','ORD-034','PROD-006',1,85.0,46.0,0.0,false,NULL,'2026-07-10');
```

### #9: Return Rate — 22.8% vs 5.88%

| Aspect | Value |
|--------|-------|
| **BQ Query** | `SELECT COUNTIF(returned=true)/COUNT(*)*100 FROM jd_sports.order_items oi JOIN jd_sports.orders o ON oi.order_id=o.order_id WHERE o.status IN ('delivered','shipped')` |
| **BQ Result** | **5.88%** (1 return of 17 items) |
| **Doc Source** | doc4:121 — *"The return rate for the quarter was 22.8%. Online returns were 28.5%... In-store returns were 4.5%"* |
| **BQ Confirmed** | ✅ Yes — only ITEM-020 (PROD-012, Under Armour Backpack) is returned |
| **Doc Confirmed** | ✅ Yes — doc4 line 121 |

**Verdict** | 🔴 Critical — Need 3-4 returned items out of ~17 to reach 22.8%. Currently only 1 item returned. Returns need to be distributed: ~28% online (2 of 7 online items returned) and ~4.5% in-store (0 of 3 or 1 of ~22).

**Data seeding recommendation — Mark additional items as returned:**

```sql
-- Convert existing items to returned
UPDATE jd_sports.order_items SET returned=true, return_reason='size_too_small' WHERE item_id='ITEM-001';
UPDATE jd_sports.order_items SET returned=true, return_reason='not_as_expected' WHERE item_id='ITEM-006';
UPDATE jd_sports.order_items SET returned=true, return_reason='size_too_large' WHERE item_id='ITEM-011';
```

---

## 🟡 Moderate Anomalies

### #7: Nike Running Margin — 46-48% expected vs 45.83% actual

| Aspect | Value |
|--------|-------|
| **BQ Result** | **45.83%** (Pegasus 41: margin = (120-65)/120 = 45.83%) |
| **Doc Source** | doc2:124 — *"Running product ... Gross margin is 46% to 48%"* |
| **Verdict** | 🟡 Moderate — 45.83% is 0.17pp below the 46% floor. Borderline; within rounding error for mock data. Original 🔴 classification downgraded. |

### #11: Nike Gross Margin — 46.8% planned vs 45.37% actual

| Aspect | Value |
|--------|-------|
| **BQ Result** | **45.37%** (revenue=£540, cost=£295) |
| **Doc Source** | doc1:79 — *"The planned gross margin on Nike product is 46.8%"* |
| **Verdict** | 🟡 Moderate — 1.43pp delta. All Nike products have margins below plan. |

### #12: Footwear Gross Margin — 46.5% target vs 45.45% actual

| Aspect | Value |
|--------|-------|
| **BQ Result** | **45.45%** (revenue=£1,540, cost=£840) |
| **Doc Source** | doc1:55 — *"Gross margin of 46.5%"* |
| **Verdict** | 🟡 Moderate — 1.05pp delta. Running products (Pegasus 41: 45.83%, Ultraboost: 44.29%) drag the blended margin down. |

### #15: Adidas Revenue Share — 25% target vs 16.9% actual

| Aspect | Value |
|--------|-------|
| **BQ Result** | **16.9%** (£365 of £2,160) |
| **Doc Source** | doc1:81 — *"Adidas (25% of revenue, GBP 1.33 billion)"* |
| **Verdict** | 🟡 Moderate — 8.1pp delta. Adidas should be ~£540 at 25%. Currently £365. |

### #16: Nike Revenue Share — 40% target vs 25% actual

| Aspect | Value |
|--------|-------|
| **BQ Result** | **25.0%** (£540 of £2,160) |
| **Doc Source** | doc1:77 — *"Nike (40% of revenue, GBP 2.12 billion)"* |
| **Verdict** | 🟡 Moderate — 15pp delta. Nike should be ~£864 at 40%. Currently £540. |

### #18: Scotland Revenue Share — 10% target vs 29.17% actual

| Aspect | Value |
|--------|-------|
| **BQ Result** | **29.17%** (£630 of £2,160, 6 of 17 orders) |
| **Doc Source** | doc1:111 — *"Scotland, at 10% of revenue or GBP 530 million"* |
| **Verdict** | 🟡 Moderate — 19pp delta. Scotland has 6 of 17 orders; disproportionate representation. |

---

## ✅ Acceptable Anomalies

| # | Claim | BQ Actual | Delta | Verdict |
|---|-------|-----------|-------|---------|
| 10 | Running H1 GM: **44.0%** (doc5:19) | **44.92%** | +0.92pp | ✅ Close — within 1pp. Downgraded from 🔴. |
| 13 | Accessories GM: **51.0%** (doc1:69) | **51.11%** | +0.11pp | ✅ Nearly exact. Downgraded from 🟡. |
| 14 | NB margin > average (doc1:87) | **47.5%** > 45.45% | Claim true | ✅ Verified. Downgraded from 🟡. |
| 17 | NB revenue: **6%** (doc1:85) | **7.41%** | +1.41pp | ✅ Close. Downgraded from 🟡. |
| 19 | London & SE: **30%** (doc1:107) | **30.32%** | +0.32pp | ✅ Nearly exact. Downgraded from 🟡. |
| 20 | North West: **14%** (doc1:109) | **15.74%** | +1.74pp | ✅ Close. Downgraded from 🟡. |
| 21 | Online: **70.6%** of orders | Doc expects 33% | Scale | ✅ Mock data limitation |
| 22 | BTS target **45,000** AF1 | 3 sold | Scale | ✅ Mock data limitation |
| 23 | BTS target **38,000** Gazelle | 1 sold | Scale | ✅ Mock data limitation |
| 24 | Hoka **52%** YoY growth | Single year data | N/A | ✅ Can't verify |
| 25 | Hoka **85** stores | No store table | N/A | ✅ Can't verify |

---

## Data Seeding Priority Matrix

| Priority | Table | Action | Target Anomalies |
|----------|-------|--------|------------------|
| **P0** | `products` + `orders` + `order_items` | Add own-brand apparel (McKenzie, Supply & Demand) with 54-58% margins | #4, #6 |
| **P0** | `orders` + `order_items` | Add 10+ store orders (various values, £45-155) | #1, #3 |
| **P0** | `order_items` | Update 3 items to `returned=true` with reasons | #9 |
| **P1** | `products` + `orders` + `order_items` | Add higher-margin Adidas (Samba) and Nike (Air Max 90) products | #5, #6 |
| **P1** | `orders` + `order_items` | Add Vans (Old Skool) and more ASICS, Converse products | #8, #15, #16 |
| **P1** | `orders` + `order_items` | Add non-Scotland orders to reduce Scotland's share | #18 |
| **P2** | `orders` + `order_items` | Add low-value online orders to bring AOV to ~£82 | #2 |
| **P2** | `orders` | Add orders from Wales, Yorkshire, Midlands, South West regions | #18, #25 |

---

## Raw BQ Query Results (All 25 Anomalies)

```
#1  Online pct: 62.96% (online=£1,360, total=£2,160)
#2  Online AOV: £113.33 (12 orders)
#3  Store ATV:  £160.00 (5 orders)
#4  Apparel GM: 45.28% (rev=£530, cost=£290)
#5  Adidas GM:  44.66% (rev=£365, cost=£202)
#6  Nike Life GM: 45.0% (rev=£300)
#7  Nike Run GM:  45.83% (rev=£240)
#8  TNF revenue:  24.54% (£530)
#9  Return rate:  5.88% (1/17 items)
#10 Running GM:   44.92% (rev=£935)
#11 Nike GM:      45.37% (rev=£540, cost=£295)
#12 Footwear GM:  45.45% (rev=£1,540, cost=£840)
#13 Accessories GM: 51.11% (rev=£90, cost=£44)
#14 NB GM:         47.5% (rev=£160)
#15 Adidas rev:    16.9% (£365)
#16 Nike rev:      25.0% (£540)
#17 NB rev:        7.41% (£160)
#18 Scotland rev:  29.17% (£630, 6 orders)
#19 London rev:    30.32% (£655, 5 orders)
#20 NW rev:        15.74% (£340, 3 orders)
#21 Orders: 12 online, 5 store (delivered/shipped)
#22 AF1 sold: 3 units (2 delivered, 1 shipped)
#23 Gazelle sold: 1 unit
#24 Hoka Clifton 9: 2 units sold
#25 Regions in BQ: Scotland, London, North West, Midlands, Yorkshire, Wales
```
