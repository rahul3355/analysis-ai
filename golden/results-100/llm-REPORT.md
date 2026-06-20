# Golden 100 — LLM-Based Scoring Report

**Model:** deepseek/deepseek-v4-flash
**Total Questions:** 100

---

## Overall Results

| Verdict | Count | % |
|---------|-------|---|
| ✅ PASS | 85 | 85.0% |
| 🟡 PARTIAL | 0 | 0.0% |
| ❌ FAIL | 15 | 15.0% |

---

## By Category

| Category | ✅ PASS | 🟡 PARTIAL | ❌ FAIL | Total |
|----------|---------|-----------|--------|-------|
| document | 24 | 0 | 1 | 25 |
| bigquery | 21 | 0 | 4 | 25 |
| hybrid | 16 | 0 | 9 | 25 |
| out_of_scope | 24 | 0 | 1 | 25 |

---

## Per-Question Verdicts

| ID | Category | Verdict | Reason |
|----|----------|---------|--------|
| doc-01 | document | ✅ PASS | The assistant correctly states the targeted total revenue as GBP 5.3 billion, matching the |
| doc-02 | document | ✅ PASS | The reply correctly states the target as 2.5%, matching the ground truth. |
| doc-03 | document | ✅ PASS | The assistant correctly states 16 flagship stores and the revenue target range of GBP 25 m |
| doc-04 | document | ✅ PASS | The assistant correctly states the targeted online penetration as 33.0%, matching the grou |
| doc-05 | document | ✅ PASS |  |
| doc-06 | document | ✅ PASS | The assistant correctly states the estimated market share as 14.0%, matching the ground tr |
| doc-07 | document | ✅ PASS | The reply correctly states 8 new store openings and 10 to 15 closures, matching the ground |
| doc-08 | document | ❌ FAIL | Assistant incorrectly claims no relevant data exists when ground truth provides both AOV a |
| doc-09 | document | ✅ PASS | The reply correctly states 25%, matching the ground truth. |
| doc-10 | document | ✅ PASS | The assistant correctly states the target of 500,000 paying members by January 2027, match |
| doc-11 | document | ✅ PASS | The reply correctly states both the revenue target (GBP 2.92 billion) and gross margin (46 |
| doc-12 | document | ✅ PASS | The assistant correctly states the planned revenue target of GBP 2.01 billion and gross ma |
| doc-13 | document | ✅ PASS | The assistant correctly states the revenue target (GBP 371 million) and gross margin (51.0 |
| doc-14 | document | ✅ PASS | The reply correctly states the revenue target as GBP 2.12 billion and gross margin as 46.8 |
| doc-15 | document | ✅ PASS | The assistant correctly states both the revenue target (GBP 1.33 billion) and gross margin |
| doc-16 | document | ✅ PASS | The reply correctly states the revenue target as GBP 424 million and gross margin as 54-58 |
| doc-17 | document | ✅ PASS | The assistant correctly states the minimum of 85 shop-in-shops, matching the ground truth. |
| doc-18 | document | ✅ PASS | The assistant correctly states the exclusivity zone radius as 0.5 miles, matching the grou |
| doc-19 | document | ✅ PASS | Reply correctly states 24 exclusive colourway SKUs per season, 96 per year, and exclusivit |
| doc-20 | document | ✅ PASS | The reply correctly states all three discount percentages matching the ground truth. |
| doc-21 | document | ✅ PASS | The assistant correctly states payment terms as 60 days from end of month of invoice and 2 |
| doc-22 | document | ✅ PASS | The assistant correctly states the minimum annual purchase volume commitment as GBP 650 mi |
| doc-23 | document | ✅ PASS | The assistant correctly lists all three rebate rates matching the ground truth exactly. |
| doc-24 | document | ✅ PASS | The assistant correctly states the cap as 3% and the value as GBP 19.5 million per year, m |
| doc-25 | document | ✅ PASS | The reply correctly states the total fund (£14M) and national media allocation (£6M) match |
| bq-01 | bigquery | ✅ PASS | The reply correctly identifies the top 3 products and their revenue numbers, with only a m |
| bq-02 | bigquery | ❌ FAIL | Could not parse:  |
| bq-03 | bigquery | ✅ PASS | The assistant correctly states 17 orders, matching the ground truth. |
| bq-04 | bigquery | ✅ PASS | The assistant correctly states the total quantity as 18, matching the ground truth. |
| bq-05 | bigquery | ✅ PASS | The core number matches the ground truth (2,160.00), and the currency difference ($ vs GBP |
| bq-06 | bigquery | ✅ PASS | The reply correctly states the exact number of orders (12) matching the ground truth. |
| bq-07 | bigquery | ✅ PASS | The core number matches the ground truth (1,360), and the currency difference ($ vs GBP) i |
| bq-08 | bigquery | ✅ PASS | The core number matches the ground truth (800), and the minor currency difference ($ vs GB |
| bq-09 | bigquery | ✅ PASS | The assistant correctly identifies London and the revenue amount 655, matching the ground  |
| bq-10 | bigquery | ✅ PASS | The assistant correctly states 1 order returned and 5.88% return rate, matching the ground |
| bq-11 | bigquery | ✅ PASS | The assistant correctly states the stock level as 350 and reorder point as 100, matching t |
| bq-12 | bigquery | ✅ PASS | The assistant correctly states the product and quantity matching the ground truth. |
| bq-13 | bigquery | ✅ PASS | The assistant's reply accurately provides the stock level of 300 and reorder point of 80,  |
| bq-14 | bigquery | ✅ PASS | The assistant correctly states the total count as 12,600, matching the ground truth. |
| bq-15 | bigquery | ✅ PASS | The assistant correctly identifies Scotland with 6 orders, matching the ground truth. |
| bq-16 | bigquery | ❌ FAIL | Could not parse:  |
| bq-17 | bigquery | ❌ FAIL | Could not parse:  |
| bq-18 | bigquery | ❌ FAIL | Could not parse:  |
| bq-19 | bigquery | ✅ PASS | The reply correctly identifies the brand, product name, and price matching the ground trut |
| bq-20 | bigquery | ✅ PASS | The assistant correctly identifies the brand, product name, and price (265), even though t |
| bq-21 | bigquery | ✅ PASS | The reply correctly states the number of customers in the platinum loyalty tier as 1, matc |
| bq-22 | bigquery | ✅ PASS | Assistant correctly identifies the three-way tie and provides exact counts matching the gr |
| bq-23 | bigquery | ✅ PASS | The reply correctly identifies the Manchester distribution center and the stock level of 2 |
| bq-24 | bigquery | ✅ PASS | The assistant correctly identifies Glasgow DC and stock level of 600 units, matching the g |
| bq-25 | bigquery | ✅ PASS | The assistant correctly states the total number of products as 12, matching the ground tru |
| hyb-01 | hybrid | ✅ PASS | The assistant correctly states GBP 20 million from the document and GBP 260 and 2 pairs fr |
| hyb-02 | hybrid | ❌ FAIL | Assistant claims 47.64% but ground truth actual is 45.37%. |
| hyb-03 | hybrid | ✅ PASS | The assistant correctly provides the actual online penetration of 62.96%, matching the gro |
| hyb-04 | hybrid | ✅ PASS | The assistant correctly states that 3 pairs were sold, matching the ground truth. |
| hyb-05 | hybrid | ✅ PASS | The reply correctly states that 2 units were sold, matching the ground truth. |
| hyb-06 | hybrid | ✅ PASS | The assistant correctly states there were 6 delivered or shipped orders in Scotland, match |
| hyb-07 | hybrid | ✅ PASS | The assistant correctly states the actual Average Order Value as GBP 113.33, matching the  |
| hyb-08 | hybrid | ✅ PASS | The assistant correctly states the total revenue as GBP 800, matching the ground truth. |
| hyb-09 | hybrid | ❌ FAIL | Reply incorrectly says "No relevant data found" for BQ sales, but ground truth states 2 Ho |
| hyb-10 | hybrid | ❌ FAIL | Assistant only provides 2 sold and 1 returned but omits the return reason "not_as_expected |
| hyb-11 | hybrid | ✅ PASS | The reply correctly states the RRP (85), cost price (46), and units sold (1), matching the |
| hyb-12 | hybrid | ❌ FAIL | Could not parse:  |
| hyb-13 | hybrid | ✅ PASS | Both numbers match ground truth (2 units sold, 900 units stock level). |
| hyb-14 | hybrid | ✅ PASS | Assistant correctly states the actual Adidas revenue percentage as 16.9%, matching the gro |
| hyb-15 | hybrid | ❌ FAIL | The assistant incorrectly states no records exist, but the ground truth confirms one retur |
| hyb-16 | hybrid | ❌ FAIL | Could not parse:  |
| hyb-17 | hybrid | ✅ PASS | The assistant correctly states the average order amount for store orders as GBP 160.00, ma |
| hyb-18 | hybrid | ❌ FAIL | The reply gives a hallucinated sales figure (317,000) not in ground truth, and incorrectly |
| hyb-19 | hybrid | ✅ PASS | Correctly reports 0 units sold and 450 units stock at Glasgow DC, matching ground truth. |
| hyb-20 | hybrid | ✅ PASS | The assistant correctly states the actual gross margin as 51.11%, matching the ground trut |
| hyb-21 | hybrid | ❌ FAIL | The assistant incorrectly states "No relevant data found" when the ground truth explicitly |
| hyb-22 | hybrid | ❌ FAIL | Could not parse:  |
| hyb-23 | hybrid | ✅ PASS | The assistant correctly states the reorder point as 100 units, matching the ground truth. |
| hyb-24 | hybrid | ✅ PASS | The reply correctly states 1 pair sold and reorder point 250, matching the ground truth. |
| hyb-25 | hybrid | ✅ PASS | The reply correctly states there is 1 social order from BigQuery, matching the ground trut |
| oos-01 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth e |
| oos-02 | out_of_scope | ✅ PASS | The assistant's reply exactly matches the ground truth of "No relevant data found." |
| oos-03 | out_of_scope | ✅ PASS | The assistant correctly states "No relevant data found," matching the ground truth exactly |
| oos-04 | out_of_scope | ✅ PASS | The assistant correctly states "No relevant data found," which matches the ground truth. |
| oos-05 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-06 | out_of_scope | ✅ PASS | Assistant correctly states no relevant data found, matching ground truth. |
| oos-07 | out_of_scope | ✅ PASS | The assistant's reply exactly matches the ground truth that no relevant data is available. |
| oos-08 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth e |
| oos-09 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found. |
| oos-10 | out_of_scope | ✅ PASS | Assistant correctly stated no relevant data found, matching the ground truth. |
| oos-11 | out_of_scope | ✅ PASS | The assistant correctly states that no address is found, matching the ground truth. |
| oos-12 | out_of_scope | ✅ PASS | The assistant correctly states no relevant data found, matching the ground truth. |
| oos-13 | out_of_scope | ✅ PASS | Assistant correctly states no relevant data found, matching ground truth exactly. |
| oos-14 | out_of_scope | ✅ PASS | The assistant correctly states "No relevant data found," matching the ground truth. |
| oos-15 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth. |
| oos-16 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-17 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-18 | out_of_scope | ✅ PASS | The assistant correctly states no relevant data found, matching the ground truth. |
| oos-19 | out_of_scope | ❌ FAIL | The assistant's reply is correct because it matches the ground truth that no relevant data |
| oos-20 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-21 | out_of_scope | ✅ PASS | Assistant correctly states no relevant data found, matching the ground truth exactly. |
| oos-22 | out_of_scope | ✅ PASS | The reply correctly matches the ground truth that no relevant data is available. |
| oos-23 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data is found, matching the ground truth. |
| oos-24 | out_of_scope | ✅ PASS | Assistant correctly states "No relevant data found," matching the ground truth exactly. |
| oos-25 | out_of_scope | ✅ PASS | The assistant correctly states that no relevant data was found, matching the ground truth  |
