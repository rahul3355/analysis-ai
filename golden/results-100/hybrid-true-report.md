# 25 Truly Hybrid Questions — Test Report

**Passed:** 20/25

| ID | Pass | Time | BQ | Doc | BQ Checks | Reply Excerpt |
|----|------|------|----|-----|-----------|---------------|
| ht-01 | ❌ | 11698ms | true | true | revenue=1540 | Based on the annual sales plan, the target gross margin for the Footwe |
| ht-02 | ❌ | 6682ms | true | true | revenue=530 | The target gross margin for the Apparel category in the annual sales p |
| ht-03 | ✅ | 12351ms | true | true | pass | Based on the FY2027 Annual Sales Plan, Nike's planned revenue target i |
| ht-04 | ✅ | 11430ms | true | true | pass | The FY2027 annual sales plan targets Adidas revenue of **GBP 1.33 bill |
| ht-05 | ✅ | 13850ms | true | true | pass | The planned revenue target for New Balance in the annual sales plan is |
| ht-06 | ✅ | 12190ms | true | true | pass | Based on the FY2027 Annual Sales Plan, the planned revenue target for  |
| ht-07 | ✅ | 5783ms | true | true | pass | Based on the annual sales plan, the target online penetration is **33. |
| ht-08 | ✅ | 7737ms | true | true | pass | Based on the annual sales plan, the target online average order value  |
| ht-09 | ✅ | 8273ms | true | true | pass | Based on the Q3 performance review, the average transaction value in s |
| ht-10 | ✅ | 6699ms | true | true | pass | Based on the Nike Framework Agreement, the expected gross margin range |
| ht-11 | ✅ | 5500ms | true | true | pass | Based on the running deep dive document, the running footwear category |
| ht-12 | ✅ | 4547ms | true | false | pass | Based on the Q3 review, no relevant data found. In BigQuery, there are |
| ht-13 | ❌ | 11765ms | true | true | actual_revenue=340 | The North West region achieved 105.2% of plan in Q3, with total revenu |
| ht-14 | ❌ | 5674ms | true | true | actual_revenue=300 | Based on the Q3 review, the top-selling product by revenue was the **N |
| ht-15 | ✅ | 17028ms | true | true | pass | According to the deep dive, the top-selling running footwear SKU by re |
| ht-16 | ✅ | 5707ms | true | true | pass | Based on the sources, the target gross margin for the Accessories cate |
| ht-17 | ✅ | 8686ms | true | true | pass | The FY2027 Annual Sales Plan states that own-brand products have a pla |
| ht-18 | ✅ | 11053ms | true | true | pass | Based on the campaign brief, the Back to School campaign revenue targe |
| ht-19 | ✅ | 11041ms | true | true | pass | The minimum annual purchase volume commitment for Nike under the Frame |
| ht-20 | ✅ | 7556ms | true | true | pass | Under the Framework Agreement, Nike caps markdown support at 3% of JD' |
| ht-21 | ✅ | 11147ms | true | true | pass | The Back to School campaign brief sets a target volume of 45,000 pairs |
| ht-22 | ✅ | 10953ms | true | true | pass | According to the running deep dive, Hoka is currently available in 85  |
| ht-23 | ✅ | 8235ms | true | true | pass | According to the campaign brief, the total media budget for the Back t |
| ht-24 | ❌ | 10011ms | true | true | actual_online_revenue=1360, actual_pct=62.96 | According to the Q3 review, online revenue was **GBP 435 million** and |
| ht-25 | ✅ | 10481ms | true | true | pass | According to the running footwear deep dive, the category's full-price |

## Failure Details

### ht-01
**Reply:** Based on the annual sales plan, the target gross margin for the Footwear category is 46.5% [1]. In BigQuery, the actual gross margin for the Footwear department is 45.45% [39].
**Missing BQ values:**
- revenue = 1540

---

### ht-02
**Reply:** The target gross margin for the Apparel category in the annual sales plan is **49.5%** [1]. The actual gross margin for the Apparel department in BigQuery is **45.28%** [39].
**Missing BQ values:**
- revenue = 530

---

### ht-13
**Reply:** The North West region achieved 105.2% of plan in Q3, with total revenue of GBP 190 million against a plan of GBP 181 million [1]. For the BigQuery query across all time, the query returned **total_revenue: null** and **total_orders: 0**, meaning no records match the criteria [39].
**Missing BQ values:**
- actual_revenue = 340

---

### ht-14
**Reply:** Based on the Q3 review, the top-selling product by revenue was the **Nike Air Force 1 Low**, with revenue of GBP 54.0 million and 540,000 pairs sold [2].

According to the BigQuery data, the total units sold for the Nike Air Force 1 Low was **1** unit, and the total revenue was **GBP 100** [39].
**Missing BQ values:**
- actual_revenue = 300

---

### ht-24
**Reply:** According to the Q3 review, online revenue was **GBP 435 million** and online penetration was **32.0%** of total revenue [1]. 

In BigQuery, the query returned no revenue data available, with all online revenue and penetration fields as null [39].
**Missing BQ values:**
- actual_online_revenue = 1360
- actual_pct = 62.96

---
