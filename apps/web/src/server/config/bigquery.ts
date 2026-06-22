export const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || "";
export const BQ_DATASET_ID = process.env.BQ_DATASET_ID || "jd_sports";
export const BQ_KEY_FILE = process.env.BQ_KEY_FILE || "";

export interface ColumnDef {
  name: string;
  type: string;
  description: string;
  allowedValues?: string[];
}

export interface TableSchema {
  table: string;
  columns: ColumnDef[];
  joins: Array<{ to: string; via: string; type: string; description: string }>;
  businessQuestions: string[];
}

export const BQ_TABLE_SCHEMAS: TableSchema[] = [
  {
    table: "products",
    columns: [
      { name: "product_id", type: "STRING", description: "Unique product identifier" },
      { name: "product_name", type: "STRING", description: "Product display name" },
      { name: "category", type: "STRING", description: "Product category", allowedValues: ["Running", "Lifestyle", "Outerwear", "Training", "Accessories"] },
      { name: "subcategory", type: "STRING", description: "More detailed category" },
      { name: "brand", type: "STRING", description: "Brand name", allowedValues: ["Nike", "Adidas", "Hoka", "ASICS", "New Balance", "The North Face", "Converse", "Under Armour"] },
      { name: "department", type: "STRING", description: "Department", allowedValues: ["Footwear", "Apparel", "Accessories"] },
      { name: "rrp", type: "FLOAT", description: "Recommended retail price in GBP" },
      { name: "cost_price", type: "FLOAT", description: "Wholesale cost in GBP" },
      { name: "vendor_id", type: "STRING", description: "Supplier identifier" },
      { name: "is_active", type: "BOOL", description: "Whether product is currently sold" },
      { name: "launched_at", type: "DATE", description: "Product launch date" },
    ],
    joins: [
      { to: "order_items", via: "product_id", type: "one_to_many", description: "Each product appears in many order line items" },
      { to: "inventory_items", via: "product_id", type: "one_to_many", description: "Each product has inventory at multiple DCs" },
    ],
    businessQuestions: ["top selling products", "revenue by brand", "category performance"],
  },
  {
    table: "orders",
    columns: [
      { name: "order_id", type: "STRING", description: "Unique order identifier" },
      { name: "user_id", type: "STRING", description: "Customer who placed the order" },
      { name: "status", type: "STRING", description: "Order status", allowedValues: ["pending", "processing", "shipped", "delivered", "cancelled"] },
      { name: "region", type: "STRING", description: "UK region", allowedValues: ["Scotland", "London", "North West", "Midlands", "Yorkshire", "Wales"] },
      { name: "channel", type: "STRING", description: "Sales channel", allowedValues: ["online", "store", "b2b"] },
      { name: "store_id", type: "STRING", description: "Store identifier if in-store purchase" },
      { name: "created_at", type: "DATE", description: "Order date" },
      { name: "shipped_at", type: "DATE", description: "Date shipped" },
      { name: "delivered_at", type: "DATE", description: "Date delivered" },
      { name: "total_amount", type: "FLOAT", description: "Total order value in GBP" },
    ],
    joins: [
      { to: "order_items", via: "order_id", type: "one_to_many", description: "Each order contains multiple line items" },
      { to: "users", via: "user_id", type: "many_to_one", description: "Each order belongs to one customer" },
    ],
    businessQuestions: ["revenue by region", "orders by channel", "monthly sales trends", "YoY comparison"],
  },
  {
    table: "order_items",
    columns: [
      { name: "item_id", type: "STRING", description: "Unique line item identifier" },
      { name: "order_id", type: "STRING", description: "Order this item belongs to" },
      { name: "product_id", type: "STRING", description: "Product purchased" },
      { name: "quantity", type: "INT64", description: "Number of units purchased" },
      { name: "sale_price", type: "FLOAT", description: "Price paid per unit in GBP" },
      { name: "cost", type: "FLOAT", description: "Cost per unit in GBP" },
      { name: "discount_pct", type: "FLOAT", description: "Discount percentage applied" },
      { name: "returned", type: "BOOL", description: "Whether item was returned by the customer. Use COUNTIF(returned = true) with a JOIN to orders to compute return rates." },
      { name: "return_reason", type: "STRING", description: "Reason for return if applicable" },
      { name: "created_at", type: "DATE", description: "Order date" },
    ],
    joins: [
      { to: "orders", via: "order_id", type: "many_to_one", description: "Each line item belongs to one order" },
      { to: "products", via: "product_id", type: "many_to_one", description: "Each line item is one product" },
    ],
    businessQuestions: ["revenue calculation", "units sold", "return rate", "average discount"],
  },
  {
    table: "users",
    columns: [
      { name: "user_id", type: "STRING", description: "Unique customer identifier" },
      { name: "state", type: "STRING", description: "UK nation", allowedValues: ["England", "Scotland", "Wales", "Northern Ireland"] },
      { name: "city", type: "STRING", description: "Customer city" },
      { name: "age_group", type: "STRING", description: "Age bracket", allowedValues: ["18-24", "25-34", "35-44", "45-54", "55+"] },
      { name: "gender", type: "STRING", description: "Customer gender" },
      { name: "traffic_source", type: "STRING", description: "Acquisition channel", allowedValues: ["organic", "paid", "referral", "social", "email", "direct"] },
      { name: "loyalty_tier", type: "STRING", description: "JD Status loyalty tier", allowedValues: ["standard", "silver", "gold", "platinum"] },
      { name: "acquired_at", type: "DATE", description: "Customer signup date" },
      { name: "is_active", type: "BOOL", description: "Whether customer account is active" },
    ],
    joins: [
      { to: "orders", via: "user_id", type: "one_to_many", description: "Each customer places many orders" },
      { to: "events", via: "user_id", type: "one_to_many", description: "Each customer generates many events" },
    ],
    businessQuestions: ["customer count by region", "new user acquisition", "traffic source analysis", "loyalty tier breakdown"],
  },
  {
    table: "inventory_items",
    columns: [
      { name: "product_id", type: "STRING", description: "Product identifier" },
      { name: "distribution_center", type: "STRING", description: "Warehouse location", allowedValues: ["Manchester", "Glasgow"] },
      { name: "stock_level", type: "INT64", description: "Current units in stock" },
      { name: "reorder_point", type: "INT64", description: "Minimum stock before reorder triggered" },
      { name: "lead_time_days", type: "INT64", description: "Days to restock from supplier" },
      { name: "last_restocked_at", type: "DATE", description: "Date of last restock" },
    ],
    joins: [
      { to: "products", via: "product_id", type: "many_to_one", description: "Each inventory record is for one product" },
    ],
    businessQuestions: ["stock levels by product", "low stock alerts", "inventory by distribution center"],
  },
  {
    table: "events",
    columns: [
      { name: "event_id", type: "STRING", description: "Unique event identifier" },
      { name: "user_id", type: "STRING", description: "Customer who triggered the event" },
      { name: "session_id", type: "STRING", description: "Browser session identifier" },
      { name: "event_type", type: "STRING", description: "Event type", allowedValues: ["page_view", "add_to_cart", "purchase", "search", "wishlist_add"] },
      { name: "page", type: "STRING", description: "URL path of the event" },
      { name: "traffic_source", type: "STRING", description: "Traffic source", allowedValues: ["organic", "paid", "referral", "social", "email", "direct"] },
      { name: "created_at", type: "TIMESTAMP", description: "Event timestamp" },
    ],
    joins: [
      { to: "users", via: "user_id", type: "many_to_one", description: "Each event is by one user" },
    ],
    businessQuestions: ["conversion funnel", "traffic source analysis", "popular pages"],
  },
];

export const BQ_RELATIONSHIPS = [
  { from: "order_items", to: "orders", via: "order_id", type: "many_to_one", description: "Each line item belongs to one order" },
  { from: "order_items", to: "products", via: "product_id", type: "many_to_one", description: "Each line item is one product SKU" },
  { from: "orders", to: "users", via: "user_id", type: "many_to_one", description: "Each order is placed by one customer" },
  { from: "inventory_items", to: "products", via: "product_id", type: "many_to_one", description: "Inventory tracked per product per DC" },
  { from: "events", to: "users", via: "user_id", type: "many_to_one", description: "Each event is by one user" },
];

export function getBigQueryConfig() {
  if (!GOOGLE_PROJECT_ID) throw new Error("GOOGLE_PROJECT_ID is not set in .env.local");
  if (!BQ_KEY_FILE && !process.env.BQ_KEY_CONTENT) {
    throw new Error("BigQuery credentials not configured. Set BQ_KEY_CONTENT or BQ_KEY_FILE in .env.local");
  }
  return { projectId: GOOGLE_PROJECT_ID, datasetId: BQ_DATASET_ID, keyFile: BQ_KEY_FILE };
}
