import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../frontend/public/mock-docs");

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Colour scheme
const COLORS = {
  primary: [0, 48, 135], // Deep navy
  accent: [200, 16, 46], // JD red
  text: [33, 33, 33], // Near black
  muted: [100, 100, 100], // Grey
  light: [240, 242, 245], // Light grey bg
  white: [255, 255, 255],
  heading: [0, 48, 135],
};

// Page config
const PAGE = {
  width: 595.28, // A4
  height: 841.89,
  margin: 56, // ~2cm
  contentWidth: 483, // margin * 2 subtracted
};

// Track current page for footer
let currentDoc = null;
let currentPage = 1;

function createDoc(title) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 72, bottom: 72, left: 56, right: 56 },
    info: {
      Title: title,
      Author: "JD Sports UK",
      Subject: title,
      Creator: "Analysis AI",
    },
  });
  currentDoc = doc;
  currentPage = 1;
  return doc;
}

function addFooter(doc, classification) {
  const bottomY = 800;
  doc.fontSize(7).font("Helvetica-Oblique");
  doc.fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text(
    `${classification}  |  Page ${currentPage}`,
    56,
    bottomY,
    { align: "center", width: PAGE.contentWidth }
  );
  doc.fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.moveDown(0.5);
}

function addHeader(doc, title, classification) {
  doc.rect(56, 40, PAGE.contentWidth, 1).fill(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.fontSize(7).font("Helvetica").fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text(title, 56, 44, { align: "left" });
  doc.text(classification, 56, 44, { align: "right", width: PAGE.contentWidth });
  doc.fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.moveDown(0.5);
}

function coverPage(doc, docTitle, subtitle, author, date, classification) {
  // Decorative line at top
  doc.rect(56, 180, PAGE.contentWidth, 3).fill(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  
  // Title
  doc.moveDown(8);
  doc.fontSize(26).font("Helvetica-Bold").fillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(docTitle, 56, 200, { align: "left", width: PAGE.contentWidth });
  
  // Subtitle
  if (subtitle) {
    doc.moveDown(1);
    doc.fontSize(14).font("Helvetica").fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(subtitle, { width: PAGE.contentWidth });
  }
  
  // Decorative line
  doc.moveDown(2);
  doc.rect(56, doc.y, 80, 2).fill(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  
  // Meta info
  doc.moveDown(3);
  doc.fontSize(10).font("Helvetica").fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Author: ${author}`, { width: PAGE.contentWidth });
  doc.text(`Date: ${date}`, { width: PAGE.contentWidth });
  doc.text(`Classification: ${classification}`, { width: PAGE.contentWidth });
  
  // Bottom line
  doc.rect(56, 700, PAGE.contentWidth, 1).fill(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
}

function sectionHeading(doc, text) {
  doc.moveDown(1.5);
  const y = doc.y;
  // Accent line before heading
  doc.rect(56, y, 3, 16).fill(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.heading[0], COLORS.heading[1], COLORS.heading[2]);
  doc.text(text, 66, y, { width: PAGE.contentWidth - 10 });
  doc.fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.moveDown(0.8);
}

function subHeading(doc, text) {
  doc.moveDown(1);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(text, { width: PAGE.contentWidth });
  doc.moveDown(0.4);
}

function bodyText(doc, text) {
  doc.fontSize(9.5).font("Helvetica").fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(text, { width: PAGE.contentWidth, lineGap: 4 });
  doc.moveDown(0.5);
}

function bullet(doc, text, indent = 20) {
  doc.fontSize(9.5).font("Helvetica").fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`  ${text}`, indent, doc.y, { width: PAGE.contentWidth - indent, lineGap: 3, paragraphGap: 2 });
  doc.moveDown(0.2);
}

function kpiRow(doc, label, value) {
  doc.fontSize(9.5);
  doc.font("Helvetica-Bold").fillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(label, { width: PAGE.contentWidth * 0.35, continued: true });
  doc.font("Helvetica").fillColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`  ${value}`, { width: PAGE.contentWidth * 0.65 });
  doc.moveDown(0.3);
}

function checkPageBreak(doc, neededSpace = 80) {
  if (doc.y > PAGE.height - PAGE.margin - neededSpace) {
    doc.addPage();
    currentPage++;
  }
}

// ======================================================================
// DOCUMENT 1: FY2027 Annual Sales Plan
// ======================================================================
function generateDoc1() {
  const doc = createDoc("FY2027 Annual Sales Plan - JD Sports UK");
  const filePath = path.join(OUTPUT_DIR, "fy2027_annual_sales_plan.pdf");
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  coverPage(
    doc,
    "FY2027 Annual Sales Plan",
    "JD Sports UK  |  Financial Year 2026/27",
    "Trading Director",
    "February 2026",
    "CONFIDENTIAL"
  );

  doc.addPage(); currentPage++;

  // Section 1
  sectionHeading(doc, "1. Executive Summary");
  bodyText(doc, "JD Sports UK targets total revenue of GBP 5.3 billion in FY2027, representing growth of 3.9% versus the FY2026 outturn of GBP 5.1 billion. Like-for-like sales growth is planned at 2.5%, with the balance coming from new store openings (8 new stores) and the full-year benefit of 12 store refits completed in FY2026.");
  bodyText(doc, "Gross margin is planned at 47.8%, broadly flat year on year. The operating margin target is 9.8%, reflecting continued operational leverage from the store estate and growing online profitability. Online penetration is targeted at 33.0% of total UK revenue, up from 32.0% in FY2026.");

  kpiRow(doc, "Total Revenue Target:", "GBP 5,300 million");
  kpiRow(doc, "Revenue Growth (YoY):", "3.9%");
  kpiRow(doc, "Like-for-Like Growth:", "2.5%");
  kpiRow(doc, "Gross Margin Target:", "47.8%");
  kpiRow(doc, "Operating Margin Target:", "9.8%");
  kpiRow(doc, "Online Penetration:", "33.0%");
  kpiRow(doc, "Stock Turn Target:", "3.8 times");
  kpiRow(doc, "Capital Expenditure:", "GBP 185 million");

  // Section 2
  sectionHeading(doc, "2. Market Context");
  bodyText(doc, "The UK sportswear market is estimated at GBP 8.5 billion for FY2027, growing at 3.0% to 4.0% annually. JD Sports UK holds an estimated 19.5% market share in sports fashion, making it the clear market leader ahead of Sports Direct (Frasers Group) at approximately 14.0%.");
  bodyText(doc, "Key market trends include the continued growth of premium running footwear (driven by Hoka and On Running), the expansion of athleisure as a daily dress category, and the increasing importance of sustainability credentials in brand choice. The market is also seeing pressure from direct-to-consumer channels operated by Nike and Adidas, though to date this has primarily affected smaller retailers rather than Tier 0 partners like JD.");

  sectionHeading(doc, "3. Channel Strategy");
  subHeading(doc, "Stores (68% of revenue)");
  bodyText(doc, "The UK store estate comprises approximately 472 JD fascia stores across five tiers. Sixteen flagship stores, including London Oxford Street, Manchester Arndale, Birmingham Bullring, and Glasgow Buchanan Street, are the primary focus for brand partnerships and exclusive product launches. These stores each target between GBP 25 million and GBP 45 million in annual revenue.");
  bodyText(doc, "Eight new stores are planned for FY2027, all in the larger format categories. Approximately 10 to 15 underperforming smaller stores will be closed, resulting in a net reduction of 2 to 7 stores overall.");

  subHeading(doc, "Online (33% of revenue)");
  bodyText(doc, "The online channel, comprising jdsports.co.uk and the JD mobile app, is planned for GBP 1.75 billion in revenue. Average order value is targeted at GBP 82.00, with a conversion rate of 5.0%. Click and collect is expected to account for 25% of online orders, driving additional footfall into stores. The JD Status loyalty programme, with a target of 500,000 paying members by January 2027, is a key initiative to improve customer retention and repeat purchase rate.");

  // Section 4
  sectionHeading(doc, "4. Category Targets");
  
  subHeading(doc, "Footwear (55% of revenue - GBP 2.92 billion)");
  bodyText(doc, "Gross margin target of 46.5%. Footwear is the core of the JD proposition. The category benefits from strong brand loyalty, high average transaction values, and the cultural significance of sneaker drops and limited editions. The running footwear subcategory is the fastest growing segment at 14% year-on-year, driven by technical innovation from Nike, ASICS, Hoka, and On.");

  subHeading(doc, "Apparel (38% of revenue - GBP 2.01 billion)");
  bodyText(doc, "Gross margin target of 49.5%. Apparel delivers higher margins than footwear due to the strength of own-brand product (McKenzie, Supply & Demand, Montirex, Pink Soda Sport) and higher initial markups on branded clothing. The athleisure and streetwear segments are the primary growth drivers.");

  subHeading(doc, "Accessories (7% of revenue - GBP 371 million)");
  bodyText(doc, "Gross margin target of 51.0%. Accessories deliver the highest margins in the business. The category benefits from strong add-on purchase behaviour, particularly when promoted through mechanics such as 3 for 2.");

  // Section 5
  sectionHeading(doc, "5. Brand Targets");
  
  checkPageBreak(doc);
  kpiRow(doc, "Nike (40%):", "GBP 2.12 billion, GM 46.8%");
  bodyText(doc, "The anchor brand. Tier 0 partnership provides exclusive colourways, first access, and shop-in-shops. Lifestyle product delivers sell-through of 85% to 95%.");
  
  kpiRow(doc, "Adidas (25%):", "GBP 1.33 billion, GM 47.5%");
  bodyText(doc, "Second largest brand. Strength across Originals lifestyle, running, and training. Exclusive colourway access and early delivery on key launches.");
  
  kpiRow(doc, "New Balance (6%):", "GBP 318 million, GM 48.0%");
  bodyText(doc, "Growing at 18% YoY. Premium positioning drives margins above corporate average.");
  
  kpiRow(doc, "The North Face (5%):", "GBP 265 million, GM 50.0%");
  bodyText(doc, "Dominant outerwear brand. Peak sales in autumn/winter. Nuptse jacket is consistently a top 10 SKU.");

  kpiRow(doc, "Own Brand (8%):", "GBP 424 million, GM 54-58%");
  bodyText(doc, "McKenzie, Supply & Demand, Montirex, Pink Soda Sport. Growing penetration from 8% to 10% is a key strategic priority for margin improvement.");

  kpiRow(doc, "Other Brands (16%):", "GBP 848 million");
  bodyText(doc, "Includes Puma, Vans, Converse, ASICS, Hoka, On, Under Armour, Timberland, Lacoste, Tommy Hilfiger, and approximately 40 other brands.");

  // Section 6
  sectionHeading(doc, "6. Regional Targets");
  bodyText(doc, "The business is managed across 11 UK regions. London and the South East together represent 30% of planned revenue at GBP 1.59 billion. The North West, JD's home region with headquarters in Bury, represents 14% of revenue at GBP 742 million.");
  bodyText(doc, "Scotland, at 10% of revenue or GBP 530 million, has shown recent volatility with some underperformance linked to store closures and stock allocation issues. The target for regional like-for-like growth ranges from 1.5% in mature regions to 4.0% in growth regions where new flagship investments are expected to drive outperformance.");

  // Section 7
  sectionHeading(doc, "7. Monthly Phasing and Promotional Calendar");
  bodyText(doc, "Revenue is heavily weighted towards the second half of the financial year, with Q4 (November to January) accounting for 31% of annual sales.");
  bodyText(doc, "December is the single largest month at approximately GBP 770 million, driven by Christmas gifting and end-of-season full-price trading. August, boosted by the Back to School campaign, is the second largest month at approximately GBP 480 million. The quietest trading period is February and March, with combined revenue of approximately GBP 640 million, representing just 12% of the annual total.");
  bodyText(doc, "Promotional calendar highlights include the January sales (GBP 313 million in clearance), the Summer Sale in July (GBP 425 million), Back to School in August (GBP 480 million), and Black Friday in November (GBP 560 million).");

  // Section 8
  sectionHeading(doc, "8. Strategic Initiatives");
  bullet(doc, "JD Status Loyalty Programme: 500,000 paying members target, GBP 35 million incremental revenue contribution.");
  bullet(doc, "Store Refit Programme: 12 stores to be refurbished in FY2027. Refitted stores historically see 15% to 25% sales uplift in 12 months post-refit.");
  bullet(doc, "DC Automation: GBP 15 million investment at Kingwood DC to reduce cost to serve by 12% and improve stock accuracy to 99.5%.");
  bullet(doc, "Online Experience Upgrade: GBP 8 million investment in website and mobile app improvements.");
  bullet(doc, "Own-Brand Expansion: Increasing penetration from 8% to 10% of revenue through expanded ranges.");

  // Section 9
  sectionHeading(doc, "9. Financial Summary");
  kpiRow(doc, "Total Revenue:", "GBP 5,300 million");
  kpiRow(doc, "Gross Profit:", "GBP 2,533 million (47.8% margin)");
  kpiRow(doc, "Store Operating Costs:", "GBP 1,325 million (25.0% of revenue)");
  kpiRow(doc, "Online Operating Costs:", "GBP 540 million (10.2% of revenue)");
  kpiRow(doc, "Distribution and Logistics:", "GBP 80 million (1.5% of revenue)");
  kpiRow(doc, "Central Costs:", "GBP 207 million (3.9% of revenue)");
  kpiRow(doc, "Operating Profit:", "GBP 381 million (7.2% margin)");

  // Section 10
  sectionHeading(doc, "10. Risks and Mitigations");
  bullet(doc, "Nike Direct-to-Consumer Expansion. Mitigated by Tier 0 agreement and exclusive product access.");
  bullet(doc, "UK Consumer Confidence. Mitigated by strong own-brand value proposition and flexible promotional planning.");
  bullet(doc, "Supply Chain Disruption. Mitigated by diversified sourcing, increased buffer stock, and dual DC network.");
  bullet(doc, "Competitor Activity. Mitigated by brand partnerships, exclusive product, and JD Status loyalty programme.");

  // End
  doc.moveDown(3);
  doc.rect(56, doc.y, PAGE.contentWidth, 1).fill(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.moveDown(1);
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("End of Document", { align: "center", width: PAGE.contentWidth });

  doc.end();
  return new Promise((resolve) => stream.on("finish", resolve));
}

// ======================================================================
// DOCUMENT 2: Nike Framework Agreement
// ======================================================================
function generateDoc2() {
  const doc = createDoc("Nike Framework Agreement 2026-2029 - JD Sports UK & Ireland");
  const filePath = path.join(OUTPUT_DIR, "nike_framework_agreement_2026.pdf");
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  coverPage(
    doc,
    "Nike Framework Agreement 2026-2029",
    "JD Sports UK & Ireland  |  Tier 0 Partnership Agreement",
    "Head of Buying / Legal",
    "February 2026",
    "HIGHLY RESTRICTED - COMMERCIALLY SENSITIVE"
  );

  doc.addPage(); currentPage++;

  sectionHeading(doc, "1. Agreement Overview");
  bodyText(doc, "This Framework Agreement governs the wholesale supply of Nike-branded product by Nike EU Operations Limited to JD Sports Fashion plc for resale in the United Kingdom and Republic of Ireland. The agreement renews and replaces the prior agreement dated 1 February 2023.");
  bodyText(doc, "JD Sports is designated as a Tier 0 retail partner, the highest partnership tier in Nike's European distribution structure. This designation provides JD with preferential access to limited-release product, exclusive colourways, and first-market allocation on key launches. The agreement runs for an initial term of three years, with automatic renewal for successive one-year periods unless either party provides 18 months written notice of non-renewal.");

  sectionHeading(doc, "2. Territory and Exclusivity");
  bodyText(doc, "The territory comprises the United Kingdom and the Republic of Ireland. Within this territory, JD Sports holds exclusive retail rights for Nike product in the following channels.");
  bodyText(doc, "JD has exclusive rights to operate Nike shop-in-shops within its own stores, with a minimum of 85 shop-in-shops required across the territory by the end of year two. JD also has exclusive rights to sell Nike product in designated retail park and high street catchments, meaning no other Nike multi-brand retailer may be located within 0.5 miles of a JD store in those locations.");
  bodyText(doc, "Nike retains the right to operate its own direct-to-consumer channels, including Nike.com, the Nike app, and Nike-owned stores without restriction.");
  bodyText(doc, "JD is granted 24 exclusive colourway SKUs per season, for a total of 96 exclusive SKUs per year. Exclusivity periods range from 6 to 12 months from first delivery.");

  sectionHeading(doc, "3. Trading Terms and Pricing");
  bodyText(doc, "Nike grants JD a trade discount of 49% off the recommended retail price on core lifestyle product, including Air Force 1, Air Max, and Dunk franchises. Running product is discounted at 47% off RRP. Premium and Jordan Brand product is discounted at 44% off RRP.");
  bodyText(doc, "Payment terms are 60 days from the end of the month of invoice. A 2% settlement discount applies if payment is made within 30 days of invoice date. All pricing is quoted in GBP and is fixed for the duration of each seasonal order book.");

  sectionHeading(doc, "4. Volume Commitment and Rebates");
  bodyText(doc, "JD commits to minimum annual purchases of GBP 650 million at wholesale cost, equating to approximately GBP 1.27 billion at retail selling price. The commitment is phased quarterly: Q1 GBP 145 million, Q2 GBP 160 million, Q3 GBP 170 million, Q4 GBP 175 million.");
  bodyText(doc, "A tiered rebate structure applies based on annual purchase volume, calculated on a rolling 12-month basis and paid quarterly in arrears.");
  bodyText(doc, "At GBP 600 million to GBP 649 million, the rebate rate is 2.0% of total purchases, paid retrospectively to the first pound. At GBP 650 million to GBP 699 million, the rate is 3.5%. At GBP 700 million and above, the rate increases to 5.0%.");
  bodyText(doc, "As of the most recent measurement period ending October 2026, JD's rolling 12-month purchases stand at approximately GBP 645 million. This is GBP 5 million short of the 3.5% rebate threshold. Achieving the Q4 commitment of GBP 175 million is critical to reaching the 3.5% tier for the full year. The estimated annual rebate at the 3.5% tier is GBP 22.8 million.");

  sectionHeading(doc, "5. Markdown Support");
  bodyText(doc, "Nike provides markdown support to protect JD's gross margin on promoted and clearance product. For seasonal markdowns of up to 30% off the original retail price, Nike reimburses JD for 50% of the markdown cost. For deeper markdowns between 30% and 50% off, Nike's contribution reduces to 30% of markdown cost. For markdowns exceeding 50% off, JD bears the full cost.");
  bodyText(doc, "Nike caps total markdown support at 3% of JD's annual Nike purchases. At the planned purchase volume of GBP 650 million, this cap is GBP 19.5 million per year. Markdown claims are submitted monthly and reconciled quarterly.");

  checkPageBreak(doc);
  sectionHeading(doc, "6. Allocation and Ranging Rights");
  bodyText(doc, "As a Tier 0 partner, JD receives preferential allocation on limited-release and high-demand product. For Tier 1 launches, JD receives allocation for a minimum of 200 store doors. For Tier 2 launches, the minimum is 150 stores. JD also receives first access to product 7 days before general release on up to 36 SKUs per year.");
  bodyText(doc, "JD is guaranteed supply of core franchise product (Air Force 1, Air Max 1, Air Max 90, Dunk Low, Pegasus) at volumes sufficient to maintain 8 weeks of cover across the estate.");
  bodyText(doc, "Nike operates a flow replenishment model for approximately 70% of JD's core product. The remaining 30% is push allocation, where JD selects quantities upfront each season.");

  sectionHeading(doc, "7. Co-op Marketing");
  bodyText(doc, "Nike provides a cooperative marketing fund of GBP 14 million per year. National media accounts for GBP 6 million (Nike 70%, JD 30%). In-store visual merchandising accounts for GBP 3.5 million (Nike 100%). JD digital channels account for GBP 2.5 million (50:50 split). Launch events account for GBP 2 million (Nike 60%, JD 40%).");
  bodyText(doc, "Co-op funds not utilised within the financial year lapse at year end. As of October 2026, approximately GBP 9.5 million of the FY2027 co-op budget had been committed or spent.");

  sectionHeading(doc, "8. Service Level Agreements");
  bodyText(doc, "Nike commits to an on-time, in-full delivery rate of 95% or above. If the on-time rate falls below 92% in any quarter, the rebate rate for that quarter is reduced by 1 percentage point. Order lead time is 8 to 12 weeks for core product and 4 to 6 weeks for fast-track replenishment.");
  bodyText(doc, "The defect allowance is 1.5% of units delivered. Product exceeding this defect rate is replaced by Nike at no cost to JD. JD may return unsold product to Nike, subject to a cap of 3% of annual purchase volume.");

  sectionHeading(doc, "9. Product Tiers and Expected Margins");
  bodyText(doc, "Lifestyle product (42% of Nike revenue, GM 48% to 50%, sell-through 85% to 95%). Running product (28% of revenue, GM 46% to 48%, sell-through 65% to 75%). Training product (12% of revenue, GM 46% to 47%, sell-through 50% to 60%). Football product (10% of revenue, GM 45% to 47%). Basketball and Jordan Brand (8% of revenue, GM 43% to 45%, sell-through 90% to 98%).");

  sectionHeading(doc, "10. Compliance and Governance");
  bodyText(doc, "Both parties confirm compliance with the UK Modern Slavery Act 2015. Nike provides annual audited statements on supply chain labour standards. Both parties comply with UK Packaging Regulations and the Plastic Packaging Tax.");
  bodyText(doc, "Data protection is governed by a separate Data Processing Agreement compliant with UK GDPR. The agreement is governed by English law. Disputes are resolved through binding arbitration in London.");

  sectionHeading(doc, "11. Key Commercial Terms Summary");
  bodyText(doc, "Trade discount on core lifestyle product: 49% off RRP. Trade discount on running product: 47% off RRP. Trade discount on Jordan Brand: 44% off RRP. Minimum annual purchase commitment: GBP 650 million at cost. Rebate at 3.5% tier: approximately GBP 22.8 million per year. Markdown support cap: 3% of purchases (GBP 19.5 million). Co-op marketing fund: GBP 14 million per year. On-time delivery target: 95%. Exclusive colourway SKUs per year: 96. Contract duration: 3 years.");

  doc.moveDown(3);
  doc.rect(56, doc.y, PAGE.contentWidth, 1).fill(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.moveDown(1);
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("End of Document", { align: "center", width: PAGE.contentWidth });

  doc.end();
  return new Promise((resolve) => stream.on("finish", resolve));
}

// ======================================================================
// DOCUMENT 3: Back to School Campaign Brief
// ======================================================================
function generateDoc3() {
  const doc = createDoc("Back to School 2026 Campaign Brief - JD Sports UK");
  const filePath = path.join(OUTPUT_DIR, "back_to_school_2026_campaign_brief.pdf");
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  coverPage(
    doc,
    "Back to School 2026 Campaign Brief",
    '"Ready for the New Term"  |  Campaign Code: JD-BTS-26001',
    "Marketing Director",
    "June 2026",
    "CONFIDENTIAL - INTERNAL USE ONLY"
  );

  doc.addPage(); currentPage++;

  sectionHeading(doc, "1. Campaign Overview");
  bodyText(doc, "The Back to School campaign is the second most important trading period of the year after Christmas, generating approximately GBP 480 million in revenue across the six-week campaign window from 1 August to 12 September 2026. This represents approximately 9% of full-year revenue concentrated into 11% of the year.");
  bodyText(doc, "The campaign objective is to achieve revenue of GBP 480 million with a footfall uplift of 8% versus the prior year. The target average order value is GBP 78.00. The target customer is parents of children aged 4 to 16, with a secondary audience of university students aged 18 to 21.");

  kpiRow(doc, "Campaign Revenue Target:", "GBP 480 million");
  kpiRow(doc, "Footfall Uplift:", "+8% vs prior year");
  kpiRow(doc, "Target Average Order Value:", "GBP 78.00");
  kpiRow(doc, "Campaign Period:", "1 Aug to 12 Sep 2026");

  sectionHeading(doc, "2. Hero Products");
  bodyText(doc, "Ten hero products are designated for the campaign, with dedicated marketing support, enhanced stock allocation, and prominent in-store positioning.");
  
  bullet(doc, "Nike Air Force 1 Low (GBP 100 RRP). Target volume of 45,000 pairs. The single most important SKU for the campaign. The white colourway is a school uniform staple across the UK and consistently sells through within the first three weeks of August.");
  bullet(doc, "Adidas Gazelle (GBP 85 RRP). Target volume of 38,000 pairs. Resurgence in younger demographics driven by terrace fashion trends.");
  bullet(doc, "Nike Dunk Low (GBP 105 RRP). Target volume of 32,000 pairs. Popular with secondary school age children.");
  bullet(doc, "Converse Chuck Taylor All Star (GBP 60 RRP). Target volume of 28,000 pairs. Entry price point for iconic footwear.");
  bullet(doc, "Vans Old Skool (GBP 65 RRP). Target volume of 22,000 pairs. Consistent performer across all age groups.");
  bullet(doc, "Nike Tech Fleece Full Zip Hoodie (GBP 120 RRP). Target volume of 18,000 units.");
  bullet(doc, "Adidas Originals 3-Stripes Tracksuit (GBP 95 RRP). Target volume of 15,000 units.");
  bullet(doc, "The North Face Nuptse Jacket (GBP 265 RRP). Target volume of 8,000 units. Early season outerwear.");
  bullet(doc, "Under Armour Backpack (GBP 45 RRP). Target volume of 25,000 units.");
  bullet(doc, "Nike Elite Socks 3-Pack (GBP 18 RRP). Target volume of 40,000 packs. High-volume add-on with strong margin.");

  sectionHeading(doc, "3. Promotional Mechanics");
  bodyText(doc, "Three core promotional mechanics will operate during the campaign period.");
  bodyText(doc, "20% off full-price footwear runs from 15 August to 31 August. The expected margin impact on promoted footwear is a reduction of 5 to 6 percentage points versus full-price margin. The discount is funded jointly by JD and the relevant brands.");
  bodyText(doc, "3 for 2 on accessories runs for the full campaign period from 1 August to 12 September. This mechanic applies to socks, caps, bags, and shoe care products. Accessories margins of 51% to 55% mean that a 3 for 2 promotion still delivers positive gross margin.");
  bodyText(doc, "10% student discount via Student Beans runs for the full campaign period. This is a permanent discount mechanic available year-round but is heavily promoted during Back to University in September.");

  sectionHeading(doc, "4. Media and Marketing Spend");
  bodyText(doc, "The total media budget for the Back to School campaign is GBP 3.8 million.");
  bodyText(doc, "Google Ads accounts for GBP 1.2 million (32% of budget) with a target return on ad spend of 4.2 times. Meta, including Facebook and Instagram, accounts for GBP 1.0 million (26%) with a target ROAS of 5.0 times. TikTok accounts for GBP 800,000 (21%) with a target ROAS of 6.5 times. Television advertising accounts for GBP 500,000 (13%). Influencer partnerships account for GBP 300,000 (8%) with ten family and lifestyle influencers reaching a combined 3 million followers.");

  sectionHeading(doc, "5. Stock Requirements");
  bodyText(doc, "Total stock allocation for the campaign is 1.8 million units. Hero SKU stock is allocated to all 472 stores plus the online fulfilment centre. Flagstaff stores receive 100% of the hero SKU range, A tier stores receive 80%, B tier stores 60%, and C tier stores 40%.");
  bodyText(doc, "A buffer of 15% above forecast demand is held at the distribution centres for hero SKUs only. All campaign stock must be delivered to the DCs by 25 July to allow for allocation and distribution before the 1 August launch.");

  sectionHeading(doc, "6. In-Store Execution and Staffing");
  bodyText(doc, "All 472 stores will have dedicated Back to School window schemes and in-store point of sale materials. The largest 200 stores will also have dedicated Back to School zones with enhanced fixtures and digital screens.");
  bodyText(doc, "Early access for JD Status members runs from 8 August to 14 August, one week before the general promotion starts. An additional 250 temporary colleagues will be recruited for the distribution centres and 120 additional in-store colleagues deployed across the 100 highest-traffic stores for peak Saturdays. The total additional labour cost is estimated at GBP 500,000.");

  sectionHeading(doc, "7. Contingency Plan");
  bodyText(doc, "A 10% buffer stock holding is maintained for the top 20 SKUs. An overnight airfreight option is pre-approved for the top 5 SKUs with a GBP 40,000 budget. A dual-carrier agreement is in place with both DPD and UPS. If website traffic exceeds 5 times normal volume, the site auto-scales with non-essential features temporarily disabled to prioritise checkout performance.");

  sectionHeading(doc, "8. Success Metrics and KPIs");
  bullet(doc, "Campaign revenue target of GBP 480 million, equivalent to 9% of full-year revenue across 6 weeks.");
  bullet(doc, "Like-for-like sales growth of 5% versus the prior year Back to School campaign.");
  bullet(doc, "Average order value of GBP 78.00, up from GBP 75.00 in the prior year.");
  bullet(doc, "Footfall uplift of 8% versus the prior year across the store estate.");
  bullet(doc, "Conversion rate of 22% in stores and 5.2% online.");
  bullet(doc, "Return on ad spend of 5.0 times across all media channels blended.");
  bullet(doc, "JD Status member acquisition of 40,000 new paying members.");
  bullet(doc, "Customer satisfaction score of 4.2 out of 5 or higher.");

  doc.moveDown(3);
  doc.rect(56, doc.y, PAGE.contentWidth, 1).fill(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.moveDown(1);
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("End of Document", { align: "center", width: PAGE.contentWidth });

  doc.end();
  return new Promise((resolve) => stream.on("finish", resolve));
}

// ======================================================================
// DOCUMENT 4: Q3 Regional Performance Review
// ======================================================================
function generateDoc4() {
  const doc = createDoc("Q3 2026 Regional Performance Review - JD Sports UK");
  const filePath = path.join(OUTPUT_DIR, "q3_2026_regional_performance_review.pdf");
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  coverPage(
    doc,
    "Q3 2026 Regional Performance Review",
    "JD Sports UK  |  August to October 2026 (Periods 7-9)",
    "Trading Director",
    "10 November 2026",
    "CONFIDENTIAL - INTERNAL USE ONLY"
  );

  doc.addPage(); currentPage++;

  sectionHeading(doc, "1. Executive Summary");
  bodyText(doc, "JD Sports UK achieved total revenue of GBP 1.36 billion in Q3, representing 103.8% of the GBP 1.31 billion plan and growth of 4.2% versus the prior year quarter.");
  bodyText(doc, "Like-for-like sales growth was 3.2%, driven by strong performance in the Back to School campaign in August and continued momentum in the running footwear category. Gross margin was 47.2%, 0.6 percentage points below the plan of 47.8%, primarily due to higher-than-planned markdown activity on apparel and a mix shift towards lower-margin footwear.");
  bodyText(doc, "Online revenue was GBP 435 million, or 32.0% of total revenue, in line with the full-year target. Online conversion improved to 5.1%, up from 4.8% in the prior year quarter. Operating profit for the quarter was GBP 133 million, representing a 9.8% margin, in line with the full-year target.");

  kpiRow(doc, "Total Revenue:", "GBP 1,360 million (103.8% of plan)");
  kpiRow(doc, "Like-for-Like Growth:", "+3.2%");
  kpiRow(doc, "Gross Margin:", "47.2% (0.6pp below plan)");
  kpiRow(doc, "Online Revenue:", "GBP 435 million (32.0%)");
  kpiRow(doc, "Online Conversion:", "5.1%");
  kpiRow(doc, "Operating Profit:", "GBP 133 million (9.8% margin)");

  sectionHeading(doc, "2. Revenue by Period");
  bodyText(doc, "Period 7 (August) achieved GBP 480 million, driven by the Back to School campaign which hit 102% of its GBP 470 million revenue target. The campaign benefited from strong sell-through of Nike Air Force 1, Adidas Gazelle, and the 3 for 2 accessories promotion.");
  bodyText(doc, "Period 8 (September) achieved GBP 440 million, in line with plan. The month performed well in footwear but saw softer apparel sales as the transition from summer to autumn ranges created a gap in outerwear availability.");
  bodyText(doc, "Period 9 (October) achieved GBP 440 million against a plan of GBP 430 million. Performance was boosted by early cold weather driving demand for The North Face outerwear and autumn footwear styles.");

  sectionHeading(doc, "3. Regional Performance");
  bodyText(doc, "Regional performance was mixed, with six regions above plan and five below plan.");

  subHeading(doc, "North West (105.2% of plan)");
  bodyText(doc, "Total revenue was GBP 190 million against a plan of GBP 181 million. Like-for-like sales grew 4.8%. The Manchester Arndale flagship was the standout store at 108% of plan, driven by strong Nike and Adidas performance.");

  subHeading(doc, "London and South East (104.1% of plan)");
  bodyText(doc, "Combined revenue of GBP 408 million. The Westfield London and Westfield Stratford stores both exceeded plan by 6% or more. However, several smaller high street stores in outer London boroughs were below plan, reflecting the ongoing shift of footfall towards large shopping centres.");

  subHeading(doc, "Scotland (92.5% of plan - UNDERPERFORMER)");
  bodyText(doc, "Total revenue was GBP 128 million against a plan of GBP 138 million, a GBP 10 million shortfall. Like-for-like sales declined by 1.2%. Two factors drove the underperformance. The Dundee and Inverness stores were affected by planned refurbishment closures, reducing capacity by a combined 6 trading weeks. Separately, stock allocation for the Back to School campaign was misaligned with Scottish demand patterns, with an undersupply of larger shoe sizes which sell disproportionately strongly in Scotland. The Glasgow Buchanan Street flagship performed well at 103% of plan, partially offsetting the weakness.");

  subHeading(doc, "Other Regions");
  bodyText(doc, "The Midlands achieved 102.4% of plan with the Birmingham Bullring flagship at 106% of plan. The South West achieved 101.5% of plan, driven by the Bristol Cabot Circus store. Yorkshire and the North East together achieved 101.8% of plan with Leeds Trinity and Newcastle Eldon Square both exceeding plan by 4% or more. Wales achieved 100.5% of plan. Northern Ireland achieved 99.0% of plan.");

  sectionHeading(doc, "4. Channel Performance");
  bodyText(doc, "Store revenue was GBP 925 million, representing 68.0% of total quarterly revenue and growth of 2.8% versus the prior year. Like-for-like store sales grew 2.1%. Footfall across the estate was up 3.5% versus the prior year, with average transaction value increasing from GBP 72.00 to GBP 74.50.");
  bodyText(doc, "Online revenue was GBP 435 million, representing 32.0% of total quarterly revenue and growth of 7.5% versus the prior year. Average order value was GBP 84.50, up from GBP 82.00. Click and collect accounted for 24% of online orders.");

  sectionHeading(doc, "5. Category Performance");
  bodyText(doc, "Footwear revenue was GBP 748 million (55.0% of total), growing 4.8% versus prior year. Gross margin was 44.5%. The running footwear subcategory grew 14% year on year, driven by ASICS Gel Kayano 31, Hoka Clifton 9, and Nike Pegasus 41.");
  bodyText(doc, "Apparel revenue was GBP 517 million (38.0% of total), growing 3.2% versus prior year. Gross margin was 49.0%, 1.0 percentage point below plan due to higher markdown activity on summer clearance lines. Own-brand apparel performed well with sell-through rates of 78%.");
  bodyText(doc, "Accessories revenue was GBP 95 million (7.0% of total), growing 2.5% versus prior year. Gross margin was 51.5%, in line with plan.");

  sectionHeading(doc, "6. Brand Performance");
  bodyText(doc, "Nike revenue was GBP 544 million (40.0% of total), growing 3.5% versus prior year. Gross margin was 46.8%. Lifestyle product sold well with sell-through rates above 80%. Running product was more challenging with higher-than-planned promotional activity on the Pegasus 41.");
  bodyText(doc, "Adidas revenue was GBP 354 million (26.0% of total), growing 4.0% versus prior year. Gross margin was 47.5%. The Gazelle and Samba franchises continued to perform strongly with sell-through rates above 85%.");
  bodyText(doc, "New Balance revenue was GBP 82 million (6.0% of total), growing 18.0% versus prior year. Gross margin was 48.0%. The North Face revenue was GBP 68 million (5.0% of total), growing 6.5% versus prior year. Own-brand revenue was GBP 109 million (8.0% of total), growing 12.0% with gross margin of 55.0%.");

  sectionHeading(doc, "7. Top 10 Products");
  bodyText(doc, "1. Nike Air Force 1 Low: GBP 54.0 million (540,000 pairs). 2. Adidas Gazelle: GBP 42.0 million (494,000 pairs). 3. Nike Dunk Low: GBP 39.0 million (371,000 pairs). 4. The North Face Nuptse Jacket: GBP 30.0 million (113,000 units). 5. Nike Tech Fleece Hoodie: GBP 26.0 million (217,000 units). 6. Adidas Samba: GBP 24.0 million (282,000 pairs). 7. Nike Air Max 90: GBP 23.0 million (177,000 pairs). 8. Converse Chuck Taylor: GBP 19.0 million (317,000 pairs). 9. Vans Old Skool: GBP 16.5 million (254,000 pairs). 10. New Balance 530: GBP 15.0 million (176,000 pairs, up 45% YoY).");

  sectionHeading(doc, "8. Operational Metrics");
  bodyText(doc, "Average transaction value in stores was GBP 74.50 (plan GBP 73.00). Online average order value was GBP 84.50 (plan GBP 83.00). Units per transaction was 1.9 in stores and 1.7 online.");
  bodyText(doc, "The return rate was 22.8% overall. Online returns were 28.5%, primarily driven by footwear fit issues. In-store returns were 4.5%.");
  bodyText(doc, "Stock at quarter end was GBP 1.28 billion at retail value, representing 9.2 weeks of cover against a target of 8.5 weeks. Aged stock over 90 days represented 9.5% of total stock value, above the target of 8.0%.");

  sectionHeading(doc, "9. Key Issues and Corrective Actions");
  bodyText(doc, "Three issues require management attention in Q4. First, the Scotland underperformance with a GBP 10 million revenue gap versus plan requires expedited store refurbishments, rebalanced size curves for larger sizes, and a dedicated regional marketing campaign.");
  bodyText(doc, "Second, approximately GBP 45 million of summer seasonal apparel is aged over 90 days. A targeted markdown campaign with 40% to 50% discount is recommended for December, with an expected margin impact of GBP 2 million to GBP 3 million.");
  bodyText(doc, "Third, the Nike aged stock position at GBP 18.5 million (11.5% of total Nike stock) requires a coordinated markdown plan under the framework agreement's markdown support provisions.");

  sectionHeading(doc, "10. Outlook for Q4");
  bodyText(doc, "Q4 is the most important quarter of the financial year, with a target of GBP 1.64 billion in revenue. November is driven by Black Friday at GBP 560 million. December is the peak Christmas trading month at GBP 770 million. The Scotland recovery plan, aged stock clearance programme, and continued investment in the running footwear category are the three key priorities for the quarter.");

  doc.moveDown(3);
  doc.rect(56, doc.y, PAGE.contentWidth, 1).fill(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.moveDown(1);
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("End of Document", { align: "center", width: PAGE.contentWidth });

  doc.end();
  return new Promise((resolve) => stream.on("finish", resolve));
}

// ======================================================================
// DOCUMENT 5: Running Footwear Category Deep Dive
// ======================================================================
function generateDoc5() {
  const doc = createDoc("Running Footwear Category Deep Dive - JD Sports UK H1 2026");
  const filePath = path.join(OUTPUT_DIR, "running_footwear_category_deep_dive_h1_2026.pdf");
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  coverPage(
    doc,
    "Running Footwear Category Deep Dive",
    "JD Sports UK  |  H1 FY2027 (February to July 2026)",
    "Category Manager, Footwear",
    "15 August 2026",
    "CONFIDENTIAL - INTERNAL USE ONLY"
  );

  doc.addPage(); currentPage++;

  sectionHeading(doc, "1. Executive Summary");
  bodyText(doc, "The running footwear category generated GBP 226 million in revenue during H1 2026, representing 104.6% of the GBP 216 million plan and growth of 15.0% versus the prior year period.");
  bodyText(doc, "Running footwear is the fastest growing subcategory within footwear, growing at 15.0% year on year compared to total footwear growth of 4.2%. Running now accounts for 17.0% of total footwear revenue, up from 15.5% in the prior year.");
  bodyText(doc, "The growth is driven by three factors. Technical innovation in midsole foam and carbon plate technology is driving replacement cycles. The running boom that began during the pandemic has sustained. New brands, particularly Hoka and On Running, are attracting new customers into the category.");
  bodyText(doc, "Gross margin for the category was 44.0%, 0.5 percentage points below the footwear average of 44.5%. The margin pressure comes from higher promotional activity on premium technical product.");

  kpiRow(doc, "H1 Revenue:", "GBP 226 million (104.6% of plan)");
  kpiRow(doc, "YoY Growth:", "+15.0%");
  kpiRow(doc, "Share of Total Footwear:", "17.0% (up from 15.5%)");
  kpiRow(doc, "Category Gross Margin:", "44.0%");

  sectionHeading(doc, "2. Brand Share Analysis");

  subHeading(doc, "Nike (39.8% of category - GBP 90 million)");
  bodyText(doc, "Growth of 8.0% versus prior year. Gross margin of 45.0%. The Pegasus franchise is the cornerstone with the Pegasus 41 generating GBP 8.2 million in H1. Nike leads the category but is losing share to faster-growing challenger brands.");

  subHeading(doc, "Adidas (21.7% of category - GBP 49 million)");
  bodyText(doc, "Growth of 6.0% versus prior year. The Ultraboost Light remains the bestselling Adidas running model, but the franchise faces increasing competition from newer products.");

  subHeading(doc, "ASICS (14.2% of category - GBP 32 million)");
  bodyText(doc, "Growth of 24.0% versus prior year, making ASICS the second fastest growing brand. The Gel Kayano 31 and Novablast 4 were both top 10 SKUs. ASICS has strong brand equity in the serious runner segment with high customer satisfaction and repeat purchase rates.");

  subHeading(doc, "Hoka (8.8% of category - GBP 20 million)");
  bodyText(doc, "Growth of 52.0% versus prior year, making Hoka the fastest growing brand. The Clifton 9 and Bondi 8 were the top sellers. Hoka is currently in only 85 stores, and supply constraints have been the limiting factor rather than demand. Significant opportunity exists to expand distribution.");

  subHeading(doc, "New Balance (7.7% of category - GBP 17.5 million)");
  bodyText(doc, "Growth of 18.0% versus prior year. The Fresh Foam X 1080v13 is the top seller. Strong momentum in the premium segment.");

  subHeading(doc, "On Running (6.0% of category - GBP 13.5 million)");
  bodyText(doc, "Growth of 35.0% versus prior year. The Cloudstratus 3 and Cloudmonster are the top sellers. Strong brand awareness among younger runners with premium technical positioning.");

  subHeading(doc, "Saucony (1.1%) and Brooks (0.7%)");
  bodyText(doc, "Both brands have loyal but small customer bases. Limited brand awareness among the broader JD customer base limits their growth potential in the current ranging.");

  sectionHeading(doc, "3. Price Architecture");
  bodyText(doc, "Running footwear is segmented into four price tiers based on recommended retail price.");
  bodyText(doc, "The Core tier (GBP 60 to GBP 89) accounts for 22.0% of units and 15.0% of revenue. Gross margin is 42.0%. This tier includes models like the Nike Revolution and Adidas Duramo. Important for attracting new runners but limited profitability.");
  bodyText(doc, "The Mid tier (GBP 90 to GBP 129) accounts for 30.0% of units and 28.0% of revenue. Gross margin is 44.0%. Models include the Nike Pegasus and ASICS Cumulus. This is the volume heartland of the category.");
  bodyText(doc, "The Premium tier (GBP 130 to GBP 179) accounts for 32.0% of units and 38.0% of revenue. Gross margin is 45.5%. Models include the ASICS Nimbus, Hoka Clifton, and On Cloudstratus. This is the most profitable tier and the one with the strongest growth trajectory.");
  bodyText(doc, "The Super Premium tier (GBP 180 and above) accounts for 16.0% of units and 19.0% of revenue. Gross margin is 47.0%. Models include the Nike Alphafly, Hoka Bondi, and On Cloudboom. Highest margins but also the highest markdown risk.");

  checkPageBreak(doc);
  sectionHeading(doc, "4. Top 10 SKUs");
  bodyText(doc, "1. Nike Pegasus 41 (GBP 120). Revenue GBP 8.2 million, 68,000 pairs. The most consistent seller in the running category, appealing to both casual and serious runners.");
  bodyText(doc, "2. ASICS Gel Kayano 31 (GBP 155). Revenue GBP 5.6 million, 36,000 pairs. Market leader in the stability running shoe segment with a fiercely loyal customer base.");
  bodyText(doc, "3. Hoka Clifton 9 (GBP 130). Revenue GBP 4.9 million, 38,000 pairs. Entry point to the Hoka brand for many new customers.");
  bodyText(doc, "4. Adidas Ultraboost Light (GBP 140). Revenue GBP 4.6 million, 33,000 pairs. Strong performer facing increasing competition.");
  bodyText(doc, "5. Nike Vomero 17 (GBP 140). Revenue GBP 4.1 million, 29,000 pairs. Nike's premium cushioned running shoe.");
  bodyText(doc, "6. New Balance Fresh Foam X 1080v13 (GBP 145). Revenue GBP 3.8 million, 26,000 pairs.");
  bodyText(doc, "7. ASICS Novablast 4 (GBP 135). Revenue GBP 3.1 million, 23,000 pairs. Popular for faster training.");
  bodyText(doc, "8. On Cloudstratus 3 (GBP 165). Revenue GBP 3.2 million, 19,000 pairs.");
  bodyText(doc, "9. Hoka Bondi 8 (GBP 150). Revenue GBP 2.9 million, 19,000 pairs. Maximum cushion shoe.");
  bodyText(doc, "10. Nike Invincible 3 (GBP 160). Revenue GBP 2.7 million, 17,000 pairs.");

  sectionHeading(doc, "5. Size Curve Analysis");
  bodyText(doc, "The size curve for running footwear shows significant regional variation. Across the UK, the top selling sizes are UK 10 at 14.2% of volume, UK 9 at 13.8%, UK 11 at 12.1%, and UK 8 at 11.5%. The slowest selling sizes are UK 6 at 3.2% and UK 14 at 1.8%.");
  bodyText(doc, "In Scotland, the curve shifts significantly towards larger sizes. UK 10 represents 16.1% of volume and UK 11 represents 14.2%. Combined, these two sizes account for over 30% of running shoe sales in Scotland, compared to 26.3% nationally.");
  bodyText(doc, "In London and the South East, the curve shifts smaller. UK 9 represents 15.5% of volume and UK 8 represents 13.2%. The implication for stock allocation is clear. Scottish stores require significantly more large-size stock than the national average allocation.");

  sectionHeading(doc, "6. Margin Analysis");
  bodyText(doc, "The running footwear category achieved a gross margin of 44.0% in H1, 0.5 percentage points below the footwear average. Markdown erosion is the primary driver. The running category has a full-price sell-through rate of 68%, meaning that 32% of units are sold at a discount. For comparison, lifestyle footwear has a full-price sell-through rate of 82%.");
  bodyText(doc, "The average discount depth on promoted running shoes is 24%, slightly deeper than the footwear average of 21%. ASICS achieves the highest running margin at 46.0%, driven by strong full-price demand. Hoka achieves 44.5%, lower due to higher promotional activity as the brand builds awareness. Nike running achieves 45.0% and Adidas running achieves 43.0%.");

  sectionHeading(doc, "7. Competitor Pricing");
  bodyText(doc, "The Nike Pegasus 41 is priced at GBP 120 at JD, GBP 120 at Nike.com, and GBP 115 at Sports Direct. JD is at parity with Nike direct but 4% above Sports Direct. This difference is acceptable given JD's superior service and return proposition.");
  bodyText(doc, "The ASICS Gel Kayano 31 is priced at GBP 155 at JD and GBP 160 at ASICS.com. JD has a 3% price advantage over the brand's own channel. Sports Direct does not stock this model, giving JD a unique position.");
  bodyText(doc, "The Hoka Clifton 9 is priced at GBP 130 at JD and GBP 130 at Hoka.com, at parity. Foot Locker also stocks this model at GBP 130. Limited availability across the market means price competition is less intense than for Nike products.");

  sectionHeading(doc, "8. Stock Health");
  bodyText(doc, "Running footwear stock at the end of H1 was GBP 78 million at retail value, representing 8.5 weeks of cover. The target is 7.5 weeks. Aged stock over 90 days represents 7.5% of running stock value, better than the total footwear aged stock figure of 9.8%.");
  bodyText(doc, "The top 5 SKUs account for 24% of running stock value. This concentration risk means that stock issues with any of these key models have an outsized impact on the category.");

  sectionHeading(doc, "9. Recommendations");
  bullet(doc, "Expand Hoka distribution from 85 stores to 200 stores. Hoka is growing at 52% year on year and supply constraints are the only barrier to growth. This should be the top priority for the buying team.");
  bullet(doc, "Increase the premium tier share from 38% to 42% of running revenue. The premium tier at GBP 130 to GBP 179 delivers the highest margins and the strongest growth.");
  bullet(doc, "Rebalance Scottish store size curves to increase UK 10 and UK 11 allocations by 20% and reduce UK 8 and UK 9 allocations by 15%. This could improve running category conversion in Scottish stores by an estimated 3% to 5%.");
  bullet(doc, "Implement a controlled price promotion on the Nike Pegasus 41 in January to clear aged stock ahead of the Pegasus 42 launch. A 25% discount for two weeks would clear an estimated 70% of aged stock.");
  bullet(doc, "Negotiate a 12-month exclusivity agreement with Hoka for the UK multibrand retail channel. Exclusivity would protect JD's margin on Hoka product and prevent price competition from other retailers.");

  doc.moveDown(3);
  doc.rect(56, doc.y, PAGE.contentWidth, 1).fill(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.moveDown(1);
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("End of Document", { align: "center", width: PAGE.contentWidth });

  doc.end();
  return new Promise((resolve) => stream.on("finish", resolve));
}

// ======================================================================
// MAIN GENERATOR
// ======================================================================
async function main() {
  console.log("Generating JD Sports UK mock PDFs...");
  console.log("Output directory:", OUTPUT_DIR);
  console.log("");

  console.log("1/5: FY2027 Annual Sales Plan...");
  await generateDoc1();

  console.log("2/5: Nike Framework Agreement 2026-2029...");
  await generateDoc2();

  console.log("3/5: Back to School 2026 Campaign Brief...");
  await generateDoc3();

  console.log("4/5: Q3 Regional Performance Review...");
  await generateDoc4();

  console.log("5/5: Running Footwear Category Deep Dive...");
  await generateDoc5();

  // List generated files
  console.log("");
  console.log("Generated files:");
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".pdf"));
  for (const file of files.sort()) {
    const stats = fs.statSync(path.join(OUTPUT_DIR, file));
    const sizeKB = (stats.size / 1024).toFixed(0);
    console.log(`  ${file}  (${sizeKB} KB)`);
  }

  console.log("");
  console.log("All PDFs generated successfully.");
}

main().catch(console.error);
