# Golden 100 — LLM Verification Report (Independent Re-score)

**Model:** deepseek/deepseek-v4-flash
**Total Questions:** 100

---

## Overall Results

| Verdict | Count | % |
|---------|-------|---|
| ✅ PASS | 83 | 83.0% |
| 🟡 PARTIAL | 0 | 0.0% |
| ❌ FAIL | 17 | 17.0% |

---

## By Category

| Category | ✅ PASS | 🟡 PARTIAL | ❌ FAIL | Total |
|----------|---------|-----------|--------|-------|
| document | 22 | 0 | 3 | 25 |
| bigquery | 23 | 0 | 2 | 25 |
| hybrid | 15 | 0 | 10 | 25 |
| out_of_scope | 23 | 0 | 2 | 25 |

## Per-Question Verdicts

| ID | Verdict | Reason |
|----|---------|--------|
| doc-01 | ✅ PASS | The reply correctly states the targeted total revenue as GBP 5.3 billion, matching the gro |
| doc-02 | ✅ PASS | The answer correctly states the target as 2.5%, matching the ground truth. |
| doc-03 | ✅ PASS | Reply correctly states 16 flagship stores and the annual revenue target range of GBP 25 mi |
| doc-04 | ✅ PASS | The assistant correctly states the targeted online penetration as 33.0% of total UK revenu |
| doc-05 | ✅ PASS | The reply correctly states the market size as GBP 8.5 billion and JD Sports' market share  |
| doc-06 | ✅ PASS | The answer correctly states the estimated 14.0% market share as per the ground truth. |
| doc-07 | ✅ PASS | The reply accurately states the planned 8 new store openings and 10 to 15 closures, matchi |
| doc-08 | ❌ FAIL | The assistant claimed no relevant data exists, but the ground truth shows the targets are  |
| doc-09 | ✅ PASS | The reply correctly states the expected percentage as 25%, matching the ground truth. |
| doc-10 | ✅ PASS | Correctly states the target of 500,000 paying members by January 2027. |
| doc-11 | ✅ PASS | The reply correctly states the planned revenue target (GBP 2.92 billion) and gross margin  |
| doc-12 | ❌ FAIL | Parse error:  |
| doc-13 | ✅ PASS | The reply correctly provides the planned revenue target of GBP 371 million and gross margi |
| doc-14 | ✅ PASS | The reply correctly states the planned revenue target of GBP 2.12 billion and gross margin |
| doc-15 | ✅ PASS | The reply correctly states the planned revenue target (GBP 1.33 billion) and gross margin  |
| doc-16 | ✅ PASS | Reply correctly states the GBP 424 million revenue target and 54-58% gross margin range, m |
| doc-17 | ✅ PASS | The reply correctly states the minimum of 85 shop-in-shops, matching the ground truth. |
| doc-18 | ✅ PASS | The reply correctly states the exclusivity zone radius is 0.5 miles for JD stores in retai |
| doc-19 | ✅ PASS | The reply correctly states 24 exclusive colourway SKUs per season, 96 per year, and the ex |
| doc-20 | ✅ PASS | The reply correctly states all three trade discount percentages matching the ground truth. |
| doc-21 | ❌ FAIL | Parse error:  |
| doc-22 | ✅ PASS | The reply correctly states the minimum annual purchase volume commitment as GBP 650 millio |
| doc-23 | ✅ PASS | The reply correctly lists all three tier rebate percentages (2.0%, 3.5%, 5.0%) matching th |
| doc-24 | ✅ PASS | Reply correctly states the cap (3%) and value (GBP 19.5 million) matching the ground truth |
| doc-25 | ✅ PASS | The assistant correctly states the total fund as GBP 14 million and the national media all |
| bq-01 | ✅ PASS | The reply correctly identifies the top 3 products and their revenue amounts, with only a m |
| bq-02 | ✅ PASS | Correctly identifies Nike as top brand, and currency format difference is minor. |
| bq-03 | ✅ PASS | The reply correctly states the total number of orders (17) matching the ground truth. |
| bq-04 | ✅ PASS | The answer correctly provides the total quantity as 18, matching the ground truth. |
| bq-05 | ✅ PASS | The answer correctly states the total revenue amount as $2,160.00, which matches the groun |
| bq-06 | ✅ PASS | The reply correctly states the number of orders as 12, matching the ground truth. |
| bq-07 | ✅ PASS | The number matches the ground truth; only currency symbol differs, which is a minor format |
| bq-08 | ✅ PASS | Correct total amount matches ground truth; minor currency symbol difference ($ vs GBP) is  |
| bq-09 | ✅ PASS | The answer correctly identifies London as the region with the highest revenue and provides |
| bq-10 | ✅ PASS | The assistant correctly states 1 order returned and a return rate of 5.88%, matching the g |
| bq-11 | ✅ PASS | The reply correctly states the stock level as 350 and reorder point as 100, matching the g |
| bq-12 | ❌ FAIL | The reply states GBP 2,500, but the ground truth specifies 2,500 units; the assistant inco |
| bq-13 | ✅ PASS | The reply correctly states both the stock level (300) and reorder point (80), matching the |
| bq-14 | ✅ PASS | The assistant correctly states the total count as 12,600, matching the ground truth. |
| bq-15 | ✅ PASS | The reply correctly identifies Scotland with 6 orders, matching the ground truth. |
| bq-16 | ✅ PASS | The reply correctly states the RRP as GBP 130, matching the ground truth, and while it say |
| bq-17 | ❌ FAIL | Reply states no cost price available, but ground truth provides cost price as GBP 145.00. |
| bq-18 | ✅ PASS | The answer correctly provides the average sale price of 121.18, matching the ground truth  |
| bq-19 | ✅ PASS | The answer correctly identifies Under Armour, the Under Armour Backpack, and the price £45 |
| bq-20 | ✅ PASS | The assistant correctly identifies the brand, product, and price, and the missing currency |
| bq-21 | ✅ PASS | The assistant correctly states the exact number of customers in the platinum loyalty tier  |
| bq-22 | ✅ PASS | Correctly identifies the three-way tie and exact user counts per tier. |
| bq-23 | ✅ PASS | Reply correctly identifies Manchester DC and stock level of 2000 units, matching the groun |
| bq-24 | ✅ PASS | Correctly identifies Glasgow DC and stock level of 600 units. |
| bq-25 | ✅ PASS | The reply correctly states the total number of products as 12, matching the ground truth. |
| hyb-01 | ❌ FAIL | Parse error:  |
| hyb-02 | ❌ FAIL | The assistant's answer of 47.64% does not match the actual gross margin of 45.37% from the |
| hyb-03 | ✅ PASS | The reply correctly states the actual online penetration as 62.96%, matching the ground tr |
| hyb-04 | ✅ PASS | The reply correctly states that only 3 pairs were sold, matching the ground truth. |
| hyb-05 | ✅ PASS | The reply correctly states 2 units were sold, matching the ground truth. |
| hyb-06 | ✅ PASS | The reply correctly identifies 6 delivered or shipped orders for Scotland, matching the gr |
| hyb-07 | ✅ PASS | The assistant correctly provides the actual Average Order Value of GBP 113.33, matching th |
| hyb-08 | ✅ PASS | Reply correctly reports GBP 800 total revenue from store orders in BigQuery, matching the  |
| hyb-09 | ❌ FAIL | Parse error:  |
| hyb-10 | ✅ PASS | The assistant correctly states that 2 were sold and 1 returned, matching the ground truth. |
| hyb-11 | ✅ PASS | The reply correctly states the RRP (85), cost price (46), and sales count (1), matching th |
| hyb-12 | ❌ FAIL | The assistant claimed no data exists, but the ground truth shows BQ sales and Manchester D |
| hyb-13 | ✅ PASS | The reply correctly states both key numbers: 2 units sold and 900 units in stock at Manche |
| hyb-14 | ✅ PASS | The reply correctly states the actual Adidas revenue percentage as 16.9%, matching the gro |
| hyb-15 | ❌ FAIL | The assistant incorrectly states no records match, but the ground truth shows Under Armour |
| hyb-16 | ✅ PASS | The assistant correctly identifies the actual gross margin as approximately 44.95%, which  |
| hyb-17 | ✅ PASS | The assistant correctly provides the average order amount as GBP 160.00, matching the grou |
| hyb-18 | ❌ FAIL | Parse error:  |
| hyb-19 | ✅ PASS | Reply correctly states 0 units sold and 450 units at Glasgow DC, matching the ground truth |
| hyb-20 | ✅ PASS | The reply correctly states the actual Accessories gross margin as 51.11%, matching the gro |
| hyb-21 | ❌ FAIL | Reply falsely claims "no relevant data found" when ground truth confirms BigQuery sold 1 p |
| hyb-22 | ❌ FAIL | Assistant claimed no data available, but ground truth provides sold (0 pairs) and Manchest |
| hyb-23 | ❌ FAIL | Parse error:  |
| hyb-24 | ❌ FAIL | Parse error:  |
| hyb-25 | ✅ PASS | The reply correctly identifies 1 social order from BigQuery, matching the ground truth. |
| oos-01 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-02 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-03 | ✅ PASS | The reply correctly states that no relevant data was found, matching the ground truth exac |
| oos-04 | ❌ FAIL | Parse error:  |
| oos-05 | ✅ PASS | The assistant correctly states that no relevant data is found, which matches the ground tr |
| oos-06 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-07 | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth. |
| oos-08 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-09 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth e |
| oos-10 | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth. |
| oos-11 | ✅ PASS | The assistant correctly states that the address is not listed in the provided sources, mat |
| oos-12 | ❌ FAIL | Parse error:  |
| oos-13 | ✅ PASS | The assistant correctly identifies that no data exists for the Christmas campaign budget a |
| oos-14 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-15 | ✅ PASS | The assistant correctly states no relevant data found, matching the ground truth. |
| oos-16 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-17 | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth. |
| oos-18 | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth. |
| oos-19 | ✅ PASS | The assistant correctly states that no specific London high street stores are scheduled fo |
| oos-20 | ✅ PASS | The assistant correctly stated that no relevant data was found, matching the ground truth. |
| oos-21 | ✅ PASS | The assistant correctly indicates that no relevant data is found, matching the ground trut |
| oos-22 | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-23 | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth. |
| oos-24 | ✅ PASS | Assistant correctly states no relevant data found, matching the ground truth. |
| oos-25 | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth. |
