import { BigQuery } from "@google-cloud/bigquery";

const KEY_PATH = "C:/Users/rahul/AppData/Local/Temp/bq-key.json";
const PROJECT_ID = "analysis-ai-499819";
const DATASET_ID = "jd_sports";

const bq = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_PATH });

async function createTables() {
  const tables = [
    {
      name: "products",
      schema: [
        { name: "product_id", type: "STRING", mode: "REQUIRED" },
        { name: "product_name", type: "STRING", mode: "REQUIRED" },
        { name: "category", type: "STRING", mode: "REQUIRED" },
        { name: "subcategory", type: "STRING" },
        { name: "brand", type: "STRING", mode: "REQUIRED" },
        { name: "department", type: "STRING", mode: "REQUIRED" },
        { name: "rrp", type: "FLOAT" },
        { name: "cost_price", type: "FLOAT" },
        { name: "vendor_id", type: "STRING" },
        { name: "is_active", type: "BOOL" },
        { name: "launched_at", type: "DATE" },
      ],
      rows: [
        { product_id: "PROD-001", product_name: "Nike Pegasus 41", category: "Running", subcategory: "Road Running", brand: "Nike", department: "Footwear", rrp: 120.0, cost_price: 65.0, vendor_id: "VEND-001", is_active: true, launched_at: "2026-01-15" },
        { product_id: "PROD-002", product_name: "Adidas Ultraboost Light", category: "Running", subcategory: "Road Running", brand: "Adidas", department: "Footwear", rrp: 140.0, cost_price: 78.0, vendor_id: "VEND-002", is_active: true, launched_at: "2026-02-01" },
        { product_id: "PROD-003", product_name: "The North Face Nuptse Jacket", category: "Outerwear", subcategory: "Insulated Jackets", brand: "The North Face", department: "Apparel", rrp: 265.0, cost_price: 145.0, vendor_id: "VEND-003", is_active: true, launched_at: "2025-09-01" },
        { product_id: "PROD-004", product_name: "Nike Air Force 1 Low", category: "Lifestyle", subcategory: "Casual Sneakers", brand: "Nike", department: "Footwear", rrp: 100.0, cost_price: 55.0, vendor_id: "VEND-001", is_active: true, launched_at: "2025-08-01" },
        { product_id: "PROD-005", product_name: "Hoka Clifton 9", category: "Running", subcategory: "Cushioned", brand: "Hoka", department: "Footwear", rrp: 130.0, cost_price: 72.0, vendor_id: "VEND-004", is_active: true, launched_at: "2026-03-01" },
        { product_id: "PROD-006", product_name: "Adidas Gazelle", category: "Lifestyle", subcategory: "Casual Sneakers", brand: "Adidas", department: "Footwear", rrp: 85.0, cost_price: 46.0, vendor_id: "VEND-002", is_active: true, launched_at: "2025-06-01" },
        { product_id: "PROD-007", product_name: "New Balance 530", category: "Lifestyle", subcategory: "Retro Runner", brand: "New Balance", department: "Footwear", rrp: 80.0, cost_price: 42.0, vendor_id: "VEND-005", is_active: true, launched_at: "2026-01-01" },
        { product_id: "PROD-008", product_name: "Nike Tech Fleece Hoodie", category: "Training", subcategory: "Fleece", brand: "Nike", department: "Apparel", rrp: 120.0, cost_price: 55.0, vendor_id: "VEND-001", is_active: true, launched_at: "2025-10-01" },
        { product_id: "PROD-009", product_name: "ASICS Gel Kayano 31", category: "Running", subcategory: "Stability", brand: "ASICS", department: "Footwear", rrp: 155.0, cost_price: 85.0, vendor_id: "VEND-006", is_active: true, launched_at: "2026-04-01" },
        { product_id: "PROD-010", product_name: "Converse Chuck Taylor", category: "Lifestyle", subcategory: "Canvas", brand: "Converse", department: "Footwear", rrp: 60.0, cost_price: 30.0, vendor_id: "VEND-007", is_active: true, launched_at: "2025-05-01" },
        { product_id: "PROD-011", product_name: "Nike Dunk Low", category: "Lifestyle", subcategory: "Casual Sneakers", brand: "Nike", department: "Footwear", rrp: 105.0, cost_price: 58.0, vendor_id: "VEND-001", is_active: true, launched_at: "2025-07-01" },
        { product_id: "PROD-012", product_name: "Under Armour Backpack", category: "Accessories", subcategory: "Bags", brand: "Under Armour", department: "Accessories", rrp: 45.0, cost_price: 22.0, vendor_id: "VEND-008", is_active: true, launched_at: "2025-04-01" },
      ],
    },
    {
      name: "users",
      schema: [
        { name: "user_id", type: "STRING", mode: "REQUIRED" },
        { name: "state", type: "STRING" },
        { name: "city", type: "STRING" },
        { name: "age_group", type: "STRING" },
        { name: "gender", type: "STRING" },
        { name: "traffic_source", type: "STRING" },
        { name: "loyalty_tier", type: "STRING" },
        { name: "acquired_at", type: "DATE" },
        { name: "is_active", type: "BOOL" },
      ],
      rows: [
        { user_id: "USR-001", state: "Scotland", city: "Glasgow", age_group: "25-34", gender: "male", traffic_source: "organic", loyalty_tier: "gold", acquired_at: "2025-06-15", is_active: true },
        { user_id: "USR-002", state: "England", city: "London", age_group: "18-24", gender: "female", traffic_source: "paid", loyalty_tier: "silver", acquired_at: "2025-08-20", is_active: true },
        { user_id: "USR-003", state: "England", city: "Manchester", age_group: "35-44", gender: "male", traffic_source: "organic", loyalty_tier: "platinum", acquired_at: "2024-11-01", is_active: true },
        { user_id: "USR-004", state: "Scotland", city: "Edinburgh", age_group: "25-34", gender: "female", traffic_source: "referral", loyalty_tier: "silver", acquired_at: "2025-09-10", is_active: true },
        { user_id: "USR-005", state: "England", city: "Birmingham", age_group: "45-54", gender: "male", traffic_source: "paid", loyalty_tier: "standard", acquired_at: "2026-01-05", is_active: true },
        { user_id: "USR-006", state: "England", city: "London", age_group: "35-44", gender: "female", traffic_source: "organic", loyalty_tier: "gold", acquired_at: "2025-03-12", is_active: true },
        { user_id: "USR-007", state: "Scotland", city: "Aberdeen", age_group: "18-24", gender: "male", traffic_source: "social", loyalty_tier: "standard", acquired_at: "2026-02-14", is_active: true },
        { user_id: "USR-008", state: "England", city: "Leeds", age_group: "25-34", gender: "female", traffic_source: "organic", loyalty_tier: "silver", acquired_at: "2025-11-20", is_active: true },
        { user_id: "USR-009", state: "Wales", city: "Cardiff", age_group: "35-44", gender: "male", traffic_source: "email", loyalty_tier: "standard", acquired_at: "2026-03-01", is_active: true },
        { user_id: "USR-010", state: "England", city: "London", age_group: "55+", gender: "female", traffic_source: "organic", loyalty_tier: "gold", acquired_at: "2024-12-01", is_active: true },
      ],
    },
    {
      name: "orders",
      schema: [
        { name: "order_id", type: "STRING", mode: "REQUIRED" },
        { name: "user_id", type: "STRING", mode: "REQUIRED" },
        { name: "status", type: "STRING", mode: "REQUIRED" },
        { name: "region", type: "STRING" },
        { name: "channel", type: "STRING" },
        { name: "store_id", type: "STRING" },
        { name: "created_at", type: "DATE", mode: "REQUIRED" },
        { name: "shipped_at", type: "DATE" },
        { name: "delivered_at", type: "DATE" },
        { name: "total_amount", type: "FLOAT" },
      ],
      rows: [
        { order_id: "ORD-001", user_id: "USR-001", status: "delivered", region: "Scotland", channel: "online", store_id: null, created_at: "2026-04-15", shipped_at: "2026-04-17", delivered_at: "2026-04-20", total_amount: 120.0 },
        { order_id: "ORD-002", user_id: "USR-002", status: "delivered", region: "London", channel: "store", store_id: "STORE-LDN-001", created_at: "2026-05-01", shipped_at: "2026-05-01", delivered_at: "2026-05-01", total_amount: 200.0 },
        { order_id: "ORD-003", user_id: "USR-003", status: "delivered", region: "North West", channel: "online", store_id: null, created_at: "2026-05-20", shipped_at: "2026-05-22", delivered_at: "2026-05-25", total_amount: 140.0 },
        { order_id: "ORD-004", user_id: "USR-004", status: "delivered", region: "Scotland", channel: "online", store_id: null, created_at: "2026-06-10", shipped_at: "2026-06-12", delivered_at: "2026-06-15", total_amount: 130.0 },
        { order_id: "ORD-005", user_id: "USR-005", status: "shipped", region: "Midlands", channel: "store", store_id: "STORE-BIR-001", created_at: "2026-06-25", shipped_at: "2026-06-27", delivered_at: null, total_amount: 265.0 },
        { order_id: "ORD-006", user_id: "USR-006", status: "delivered", region: "London", channel: "online", store_id: null, created_at: "2026-05-15", shipped_at: "2026-05-17", delivered_at: "2026-05-19", total_amount: 85.0 },
        { order_id: "ORD-007", user_id: "USR-007", status: "processing", region: "Scotland", channel: "online", store_id: null, created_at: "2026-07-01", shipped_at: null, delivered_at: null, total_amount: 105.0 },
        { order_id: "ORD-008", user_id: "USR-001", status: "delivered", region: "Scotland", channel: "store", store_id: "STORE-GLA-001", created_at: "2026-06-05", shipped_at: "2026-06-05", delivered_at: "2026-06-05", total_amount: 155.0 },
        { order_id: "ORD-009", user_id: "USR-003", status: "delivered", region: "North West", channel: "online", store_id: null, created_at: "2026-04-28", shipped_at: "2026-04-30", delivered_at: "2026-05-02", total_amount: 80.0 },
        { order_id: "ORD-010", user_id: "USR-008", status: "cancelled", region: "Yorkshire", channel: "online", store_id: null, created_at: "2026-06-20", shipped_at: null, delivered_at: null, total_amount: 120.0 },
        { order_id: "ORD-011", user_id: "USR-009", status: "delivered", region: "Wales", channel: "online", store_id: null, created_at: "2026-05-10", shipped_at: "2026-05-12", delivered_at: "2026-05-14", total_amount: 130.0 },
        { order_id: "ORD-012", user_id: "USR-010", status: "delivered", region: "London", channel: "store", store_id: "STORE-LDN-002", created_at: "2026-04-01", shipped_at: "2026-04-01", delivered_at: "2026-04-01", total_amount: 60.0 },
        { order_id: "ORD-013", user_id: "USR-002", status: "delivered", region: "London", channel: "online", store_id: null, created_at: "2026-06-15", shipped_at: "2026-06-17", delivered_at: "2026-06-19", total_amount: 45.0 },
        { order_id: "ORD-014", user_id: "USR-004", status: "shipped", region: "Scotland", channel: "online", store_id: null, created_at: "2026-07-05", shipped_at: "2026-07-07", delivered_at: null, total_amount: 100.0 },
        { order_id: "ORD-015", user_id: "USR-005", status: "delivered", region: "Midlands", channel: "online", store_id: null, created_at: "2026-05-25", shipped_at: "2026-05-27", delivered_at: "2026-05-29", total_amount: 140.0 },
        { order_id: "ORD-016", user_id: "USR-006", status: "delivered", region: "London", channel: "online", store_id: null, created_at: "2026-04-20", shipped_at: "2026-04-22", delivered_at: "2026-04-24", total_amount: 265.0 },
        { order_id: "ORD-017", user_id: "USR-003", status: "delivered", region: "North West", channel: "store", store_id: "STORE-MAN-001", created_at: "2026-06-01", shipped_at: "2026-06-01", delivered_at: "2026-06-01", total_amount: 120.0 },
        { order_id: "ORD-018", user_id: "USR-007", status: "delivered", region: "Scotland", channel: "online", store_id: null, created_at: "2026-05-05", shipped_at: "2026-05-07", delivered_at: "2026-05-09", total_amount: 80.0 },
        { order_id: "ORD-019", user_id: "USR-009", status: "processing", region: "Wales", channel: "online", store_id: null, created_at: "2026-07-10", shipped_at: null, delivered_at: null, total_amount: 155.0 },
        { order_id: "ORD-020", user_id: "USR-001", status: "delivered", region: "Scotland", channel: "online", store_id: null, created_at: "2026-04-01", shipped_at: "2026-04-03", delivered_at: "2026-04-05", total_amount: 45.0 },
      ],
    },
    {
      name: "order_items",
      schema: [
        { name: "item_id", type: "STRING", mode: "REQUIRED" },
        { name: "order_id", type: "STRING", mode: "REQUIRED" },
        { name: "product_id", type: "STRING", mode: "REQUIRED" },
        { name: "quantity", type: "INT64", mode: "REQUIRED" },
        { name: "sale_price", type: "FLOAT" },
        { name: "cost", type: "FLOAT" },
        { name: "discount_pct", type: "FLOAT" },
        { name: "returned", type: "BOOL" },
        { name: "return_reason", type: "STRING" },
        { name: "created_at", type: "DATE", mode: "REQUIRED" },
      ],
      rows: [
        { item_id: "ITEM-001", order_id: "ORD-001", product_id: "PROD-001", quantity: 1, sale_price: 120.0, cost: 65.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-04-15" },
        { item_id: "ITEM-002", order_id: "ORD-002", product_id: "PROD-004", quantity: 2, sale_price: 100.0, cost: 55.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-05-01" },
        { item_id: "ITEM-003", order_id: "ORD-003", product_id: "PROD-002", quantity: 1, sale_price: 140.0, cost: 78.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-05-20" },
        { item_id: "ITEM-004", order_id: "ORD-004", product_id: "PROD-005", quantity: 1, sale_price: 130.0, cost: 72.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-06-10" },
        { item_id: "ITEM-005", order_id: "ORD-005", product_id: "PROD-003", quantity: 1, sale_price: 265.0, cost: 145.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-06-25" },
        { item_id: "ITEM-006", order_id: "ORD-006", product_id: "PROD-006", quantity: 1, sale_price: 85.0, cost: 46.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-05-15" },
        { item_id: "ITEM-007", order_id: "ORD-007", product_id: "PROD-011", quantity: 1, sale_price: 105.0, cost: 58.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-07-01" },
        { item_id: "ITEM-008", order_id: "ORD-008", product_id: "PROD-009", quantity: 1, sale_price: 155.0, cost: 85.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-06-05" },
        { item_id: "ITEM-009", order_id: "ORD-009", product_id: "PROD-007", quantity: 1, sale_price: 80.0, cost: 42.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-04-28" },
        { item_id: "ITEM-010", order_id: "ORD-010", product_id: "PROD-008", quantity: 1, sale_price: 120.0, cost: 55.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-06-20" },
        { item_id: "ITEM-011", order_id: "ORD-011", product_id: "PROD-005", quantity: 1, sale_price: 130.0, cost: 72.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-05-10" },
        { item_id: "ITEM-012", order_id: "ORD-012", product_id: "PROD-010", quantity: 1, sale_price: 60.0, cost: 30.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-04-01" },
        { item_id: "ITEM-013", order_id: "ORD-013", product_id: "PROD-012", quantity: 1, sale_price: 45.0, cost: 22.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-06-15" },
        { item_id: "ITEM-014", order_id: "ORD-014", product_id: "PROD-004", quantity: 1, sale_price: 100.0, cost: 55.0, discount_pct: 10, returned: false, return_reason: null, created_at: "2026-07-05" },
        { item_id: "ITEM-015", order_id: "ORD-015", product_id: "PROD-002", quantity: 1, sale_price: 140.0, cost: 78.0, discount_pct: 5, returned: false, return_reason: null, created_at: "2026-05-25" },
        { item_id: "ITEM-016", order_id: "ORD-016", product_id: "PROD-003", quantity: 1, sale_price: 265.0, cost: 145.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-04-20" },
        { item_id: "ITEM-017", order_id: "ORD-017", product_id: "PROD-001", quantity: 1, sale_price: 120.0, cost: 65.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-06-01" },
        { item_id: "ITEM-018", order_id: "ORD-018", product_id: "PROD-007", quantity: 1, sale_price: 80.0, cost: 42.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-05-05" },
        { item_id: "ITEM-019", order_id: "ORD-019", product_id: "PROD-009", quantity: 1, sale_price: 155.0, cost: 85.0, discount_pct: 0, returned: false, return_reason: null, created_at: "2026-07-10" },
        { item_id: "ITEM-020", order_id: "ORD-020", product_id: "PROD-012", quantity: 1, sale_price: 45.0, cost: 22.0, discount_pct: 0, returned: true, return_reason: "not_as_expected", created_at: "2026-04-01" },
      ],
    },
    {
      name: "inventory_items",
      schema: [
        { name: "product_id", type: "STRING", mode: "REQUIRED" },
        { name: "distribution_center", type: "STRING", mode: "REQUIRED" },
        { name: "stock_level", type: "INT64" },
        { name: "reorder_point", type: "INT64" },
        { name: "lead_time_days", type: "INT64" },
        { name: "last_restocked_at", type: "DATE" },
      ],
      rows: [
        { product_id: "PROD-001", distribution_center: "Manchester", stock_level: 1200, reorder_point: 200, lead_time_days: 14, last_restocked_at: "2026-06-15" },
        { product_id: "PROD-002", distribution_center: "Manchester", stock_level: 800, reorder_point: 150, lead_time_days: 14, last_restocked_at: "2026-06-10" },
        { product_id: "PROD-003", distribution_center: "Glasgow", stock_level: 350, reorder_point: 100, lead_time_days: 21, last_restocked_at: "2026-05-20" },
        { product_id: "PROD-004", distribution_center: "Manchester", stock_level: 2000, reorder_point: 300, lead_time_days: 10, last_restocked_at: "2026-06-20" },
        { product_id: "PROD-005", distribution_center: "Glasgow", stock_level: 600, reorder_point: 100, lead_time_days: 14, last_restocked_at: "2026-06-01" },
        { product_id: "PROD-006", distribution_center: "Manchester", stock_level: 1500, reorder_point: 250, lead_time_days: 12, last_restocked_at: "2026-06-18" },
        { product_id: "PROD-007", distribution_center: "Manchester", stock_level: 900, reorder_point: 150, lead_time_days: 14, last_restocked_at: "2026-06-12" },
        { product_id: "PROD-008", distribution_center: "Glasgow", stock_level: 450, reorder_point: 100, lead_time_days: 10, last_restocked_at: "2026-06-05" },
        { product_id: "PROD-009", distribution_center: "Glasgow", stock_level: 300, reorder_point: 80, lead_time_days: 14, last_restocked_at: "2026-05-25" },
        { product_id: "PROD-010", distribution_center: "Manchester", stock_level: 2500, reorder_point: 400, lead_time_days: 10, last_restocked_at: "2026-06-22" },
        { product_id: "PROD-011", distribution_center: "Manchester", stock_level: 1200, reorder_point: 200, lead_time_days: 10, last_restocked_at: "2026-06-15" },
        { product_id: "PROD-012", distribution_center: "Glasgow", stock_level: 800, reorder_point: 150, lead_time_days: 7, last_restocked_at: "2026-06-08" },
      ],
    },
    {
      name: "events",
      schema: [
        { name: "event_id", type: "STRING", mode: "REQUIRED" },
        { name: "user_id", type: "STRING", mode: "REQUIRED" },
        { name: "session_id", type: "STRING" },
        { name: "event_type", type: "STRING", mode: "REQUIRED" },
        { name: "page", type: "STRING" },
        { name: "traffic_source", type: "STRING" },
        { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
      ],
      rows: [
        { event_id: "EVT-001", user_id: "USR-001", session_id: "SESS-001", event_type: "purchase", page: "/products/PROD-001", traffic_source: "organic", created_at: "2026-04-15 10:30:00" },
        { event_id: "EVT-002", user_id: "USR-002", session_id: "SESS-002", event_type: "page_view", page: "/products/PROD-004", traffic_source: "paid", created_at: "2026-04-28 14:15:00" },
        { event_id: "EVT-003", user_id: "USR-003", session_id: "SESS-003", event_type: "purchase", page: "/products/PROD-002", traffic_source: "organic", created_at: "2026-05-20 09:45:00" },
        { event_id: "EVT-004", user_id: "USR-004", session_id: "SESS-004", event_type: "add_to_cart", page: "/products/PROD-005", traffic_source: "referral", created_at: "2026-06-08 16:20:00" },
        { event_id: "EVT-005", user_id: "USR-005", session_id: "SESS-005", event_type: "page_view", page: "/products/PROD-003", traffic_source: "paid", created_at: "2026-06-20 11:00:00" },
        { event_id: "EVT-006", user_id: "USR-006", session_id: "SESS-006", event_type: "purchase", page: "/products/PROD-006", traffic_source: "organic", created_at: "2026-05-15 15:30:00" },
        { event_id: "EVT-007", user_id: "USR-007", session_id: "SESS-007", event_type: "search", page: "/search?q=running+shoes", traffic_source: "social", created_at: "2026-06-28 20:00:00" },
        { event_id: "EVT-008", user_id: "USR-001", session_id: "SESS-008", event_type: "page_view", page: "/products/PROD-009", traffic_source: "email", created_at: "2026-06-01 08:15:00" },
        { event_id: "EVT-009", user_id: "USR-003", session_id: "SESS-009", event_type: "purchase", page: "/products/PROD-007", traffic_source: "organic", created_at: "2026-04-28 12:00:00" },
        { event_id: "EVT-010", user_id: "USR-008", session_id: "SESS-010", event_type: "add_to_cart", page: "/products/PROD-008", traffic_source: "organic", created_at: "2026-06-18 19:30:00" },
        { event_id: "EVT-011", user_id: "USR-009", session_id: "SESS-011", event_type: "purchase", page: "/products/PROD-005", traffic_source: "email", created_at: "2026-05-10 10:00:00" },
        { event_id: "EVT-012", user_id: "USR-010", session_id: "SESS-012", event_type: "page_view", page: "/products/PROD-010", traffic_source: "organic", created_at: "2026-03-28 14:45:00" },
        { event_id: "EVT-013", user_id: "USR-002", session_id: "SESS-013", event_type: "purchase", page: "/products/PROD-012", traffic_source: "paid", created_at: "2026-06-15 11:30:00" },
        { event_id: "EVT-014", user_id: "USR-004", session_id: "SESS-014", event_type: "purchase", page: "/products/PROD-004", traffic_source: "referral", created_at: "2026-07-05 09:15:00" },
        { event_id: "EVT-015", user_id: "USR-005", session_id: "SESS-015", event_type: "purchase", page: "/products/PROD-002", traffic_source: "paid", created_at: "2026-05-25 16:00:00" },
        { event_id: "EVT-016", user_id: "USR-006", session_id: "SESS-016", event_type: "purchase", page: "/products/PROD-003", traffic_source: "organic", created_at: "2026-04-20 13:00:00" },
        { event_id: "EVT-017", user_id: "USR-003", session_id: "SESS-017", event_type: "purchase", page: "/products/PROD-001", traffic_source: "organic", created_at: "2026-06-01 10:30:00" },
        { event_id: "EVT-018", user_id: "USR-007", session_id: "SESS-018", event_type: "purchase", page: "/products/PROD-007", traffic_source: "social", created_at: "2026-05-05 17:00:00" },
        { event_id: "EVT-019", user_id: "USR-009", session_id: "SESS-019", event_type: "add_to_cart", page: "/products/PROD-009", traffic_source: "email", created_at: "2026-07-08 20:30:00" },
        { event_id: "EVT-020", user_id: "USR-001", session_id: "SESS-020", event_type: "purchase", page: "/products/PROD-012", traffic_source: "organic", created_at: "2026-04-01 09:00:00" },
      ],
    },
  ];

  for (const table of tables) {
    console.log(`\nTable: ${table.name}...`);
    const [exists] = await bq.dataset(DATASET_ID).table(table.name).exists();
    if (exists) {
      console.log(`  Table already exists, deleting...`);
      await bq.dataset(DATASET_ID).table(table.name).delete();
    }
    console.log(`  Creating...`);
    await bq.dataset(DATASET_ID).createTable(table.name, {
      schema: { fields: table.schema },
    });
    await bq.dataset(DATASET_ID).table(table.name).insert(table.rows);
    console.log(`  Created + inserted ${table.rows.length} rows`);
  }
}

async function testQueries() {
  console.log("\n\n=== TEST QUERIES ===\n");

  console.log("1. Revenue by region:");
  const [q1] = await bq.query(`
    SELECT o.region, ROUND(SUM(oi.sale_price * oi.quantity), 2) as revenue
    FROM ${DATASET_ID}.order_items oi
    JOIN ${DATASET_ID}.orders o ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY o.region ORDER BY revenue DESC
  `);
  q1.forEach(function(r) { console.log("  " + r.region + ": GBP " + r.revenue); });

  console.log("\n2. Top 5 products:");
  const [q2] = await bq.query(`
    SELECT p.product_name, p.brand, ROUND(SUM(oi.sale_price * oi.quantity), 2) as revenue
    FROM ${DATASET_ID}.order_items oi
    JOIN ${DATASET_ID}.products p ON oi.product_id = p.product_id
    JOIN ${DATASET_ID}.orders o ON oi.order_id = o.order_id
    WHERE o.status IN ('delivered', 'shipped')
    GROUP BY p.product_name, p.brand
    ORDER BY revenue DESC LIMIT 5
  `);
  q2.forEach(function(r) { console.log("  " + r.product_name + " (" + r.brand + "): GBP " + r.revenue); });

  console.log("\n3. Summary:");
  const [q3] = await bq.query(`
    SELECT COUNT(DISTINCT o.order_id) as orders,
           ROUND(SUM(oi.sale_price * oi.quantity), 2) as revenue,
           ROUND(AVG(o.total_amount), 2) as aov
    FROM ${DATASET_ID}.orders o
    JOIN ${DATASET_ID}.order_items oi ON o.order_id = oi.order_id
    WHERE o.status IN ('delivered', 'shipped')
  `);
  console.log("  Orders: " + q3[0].orders + ", Revenue: GBP " + q3[0].revenue + ", AOV: GBP " + q3[0].aov);
}

async function main() {
  console.log("=== BIGQUERY SETUP ===\n");
  console.log("Project: " + PROJECT_ID);
  console.log("Dataset: " + DATASET_ID + "\n");

  console.log("Testing connection...");
  const [datasets] = await bq.getDatasets();
  console.log("Connected. Found " + datasets.length + " datasets.\n");

  const [dsExists] = await bq.dataset(DATASET_ID).exists();
  if (!dsExists) {
    console.log("Creating dataset " + DATASET_ID + "...");
    await bq.createDataset(DATASET_ID, { location: "US" });
  } else {
    console.log("Dataset " + DATASET_ID + " exists.\n");
  }

  await createTables();
  await testQueries();
  console.log("\n=== SETUP COMPLETE ===");
}

main().catch(function(err) { console.error("FAILED:", err); process.exit(1); });
