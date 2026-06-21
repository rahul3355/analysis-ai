const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUTPUT = path.join(__dirname, "jd_sports_uk_sustainability_roadmap_2027.pdf");
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 60, bottom: 60, left: 60, right: 60 },
  info: {
    Title: "JD Sports UK Sustainability Roadmap 2027",
    Author: "JD Sports UK",
    Subject: "JD Sports UK Sustainability Roadmap 2027-2035",
    Creator: "Analysis AI",
    Producer: "PDFKit",
  },
});

const ML = 60;
const CW = doc.page.width - 120;
let __pn = 0;

// Auto-draw footer on every new page
doc.on("pageAdded", () => {
  __pn++;
  const savedY = doc.y;
  doc.fontSize(8).font("Helvetica").fillColor("#666666");
  doc.text(
    "JD Sports UK \u2014 Sustainability Roadmap 2027 | CONFIDENTIAL | Page " + __pn,
    ML,
    doc.page.height - 80,
    { width: CW, align: "center" }
  );
  doc.y = savedY;
});

// ==================== HELPERS ====================

function title(text) {
  doc.font("Helvetica-Bold").fontSize(26).fillColor("#000000");
  doc.text(text, ML, doc.y, { width: CW });
  doc.moveDown(0.5);
}

function subtitle(text) {
  doc.font("Helvetica").fontSize(14).fillColor("#333333");
  doc.text(text, ML, doc.y, { width: CW });
  doc.moveDown(1.5);
}

function metaLine(text) {
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
  doc.text(text, ML, doc.y, { width: CW });
  doc.moveDown(0.1);
}

function italicNote(text) {
  doc.font("Helvetica-Oblique").fontSize(9).fillColor("#555555");
  doc.moveDown(0.5);
  doc.text(text, ML, doc.y, { width: CW });
}

function sectionHeader(text) {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#000000");
  doc.text(text, ML, doc.y, { width: CW });
  doc.moveDown(0.3);
}

function subSectionHeader(text) {
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text(text, ML, doc.y, { width: CW });
  doc.moveDown(0.2);
}

function body(text) {
  doc.font("Helvetica").fontSize(9.5).fillColor("#000000");
  doc.text(text, ML, doc.y, { width: CW, lineGap: 2 });
  doc.moveDown(0.15);
}

function bullet(text) {
  doc.font("Helvetica").fontSize(9.5).fillColor("#000000");
  doc.text("  \u2022  " + text, ML + 5, doc.y, { width: CW - 25, indent: -10, lineGap: 1 });
  doc.moveDown(0.05);
}

function roadmapLine(text) {
  doc.font("Helvetica").fontSize(9.5).fillColor("#000000");
  doc.text(text, ML, doc.y, { width: CW, lineGap: 2 });
  doc.moveDown(0.2);
}

function endMarker() {
  doc.moveDown(2);
  doc.font("Helvetica-Oblique").fontSize(8).fillColor("#888888");
  doc.text("End of Document", ML, doc.y, { width: CW, align: "center" });
}

// Page 1 footer (first page doesn't trigger pageAdded)
__pn = 1;
doc.fontSize(8).font("Helvetica").fillColor("#666666");
doc.text(
  "JD Sports UK \u2014 Sustainability Roadmap 2027 | CONFIDENTIAL | Page 1",
  ML,
  doc.page.height - 80,
  { width: CW, align: "center" }
);

// ==================== PAGE 1: TITLE ====================
doc.y = 100;
title("JD Sports UK Sustainability");
title("Roadmap 2027");
subtitle("Net Zero Roadmap  |  Circular Economy  |  Sustainable Sourcing");
metaLine("Author: Head of Sustainability, JD Sports UK");
metaLine("Date: November 2026");
metaLine("Classification: CONFIDENTIAL - INTERNAL USE ONLY");
italicNote(
  "This document sets out JD Sports UK\u2019s sustainability strategy, targets, and commitments " +
  "for the period 2027 to 2035, aligned with the Group\u2019s Science Based Targets initiative (SBTi) " +
  "validated 1.5\u00b0C pathway and net zero by 2043 commitment."
);

// ==================== PAGE 2 ====================
doc.addPage();

sectionHeader("1. Executive Summary");
body(
  "JD Sports UK commits to a comprehensive sustainability transformation across its entire value chain, " +
  "from product design and sourcing to store operations, logistics, and end-of-life management. This roadmap " +
  "builds on the Group\u2019s existing validated SBTi targets and extends them with UK-specific initiatives."
);
body(
  "The roadmap targets a 50% absolute reduction in Scope 1 and 2 greenhouse gas emissions by 2030 " +
  "(versus the 2019/20 baseline), accelerating to 67.2% by 2035 as validated by the Science Based Targets " +
  "initiative. For Scope 3 \u2014 over 95% of JD Sports\u2019 total carbon footprint \u2014 the roadmap " +
  "targets a 30% reduction in purchased goods and services emissions by 2030 and 67.2% by 2035."
);
body(
  "Total sustainability investment for the UK business over FY2027 to FY2035 is budgeted at GBP 42 million, " +
  "covering capital expenditure (store energy upgrades, fleet electrification, solar) and operating expenditure " +
  "(sustainable materials premium, take-back programme operations, colleague training, compliance systems)."
);

sectionHeader("2. Carbon Reduction & Energy");
subSectionHeader("2.1 Emissions Baseline (FY2019/20)");
body("JD Sports UK\u2019s baseline carbon footprint:");
bullet("Scope 1 (direct gas, fleet fuel): 12,400 tCO2e");
bullet("Scope 2 (purchased electricity): 18,600 tCO2e");
bullet("Scope 3 (purchased goods, logistics, travel, investments): 2,150,000 tCO2e");
bullet("Total UK footprint: approximately 2,181,000 tCO2e");
bullet("Scope 3 is 98.6% of total; purchased goods and services accounts for 92% of Scope 3");

subSectionHeader("2.2 UK-Specific Targets");
body("The UK business commits beyond Group-level SBTi targets:");
bullet("100% renewable electricity across all UK stores, DCs, and offices \u2014 achieved from October 2026 " +
  "via REGO-backed tariffs and on-site solar generation (RE100 aligned)");
bullet("LED lighting retrofit completed across 100% of the UK store estate (430 stores) by end of FY2028, " +
  "saving an estimated 4,200 tCO2e per year");
bullet("BEMS installed in all 25 high-energy stores by FY2029, targeting a further 655 tCO2e reduction");
bullet("EV transition for the UK fleet: 50% of the 180-vehicle delivery fleet electrified by FY2030, " +
  "100% by FY2035");

// ==================== PAGE 3 ====================
doc.addPage();

sectionHeader("3. Sustainable Sourcing & Materials");
subSectionHeader("3.1 Own-Brand Products");
body(
  "JD Sports UK\u2019s private label portfolio (McKenzie, Supply & Demand, Montirex, Pink Soda Sport, " +
  "Red Run Activewear) represents approximately 4% of total UK revenue. Roadmap targets:"
);
bullet("100% own-brand cotton sourced through Better Cotton Initiative (BCI) by FY2028, physical " +
  "traceability to country of origin by early 2027");
bullet("50% own-brand polyester recycled (rPET) by FY2030, rising to 75% by FY2035 (baseline ~12% in FY2026)");
bullet("All own-brand garment bags and hangers converted to recycled LDPE plastic \u2014 completed FY2026 " +
  "(over 12 million garment bags and 8 million hangers used annually)");
bullet("Virgin plastic eliminated from own-brand packaging by FY2028 (polybags, hang-tags, stickers)");
bullet("Launch of \u2018Green Line\u2019 capsule collection across McKenzie and Supply & Demand by Spring " +
  "2027, featuring 100% organic cotton or recycled polyester, reduced water dyeing, plastic-free packaging");

subSectionHeader("3.2 Third-Party Brand Engagement");
body(
  "Over 84% of JD Sports UK sales come from third-party brands (Nike, Adidas, New Balance, VF Corp, " +
  "ASICS, PUMA). JD Sports UK will use its position as the UK\u2019s largest sportswear retailer:"
);
bullet("Annual supplier ESG scorecards from FY2027 assessing carbon reduction, sustainable materials, " +
  "circular economy, and supply chain transparency");
bullet("Preferred supplier programme from FY2028 offering enhanced ranging, marketing support, " +
  "and prime floor space to top ESG-scoring brands");
bullet("Third-party brands required to disclose SBTi-validated targets by FY2030 to maintain core ranging");
bullet("Quarterly ESG committee meetings with Nike, Adidas, New Balance, VF Corp, ASICS, and PUMA");

sectionHeader("4. Packaging & Waste");
subSectionHeader("4.1 Packaging Reduction");
body("JD Sports UK already sources 100% recycled cardboard for e-commerce boxes with 38% space efficiency:");
bullet("50% reduction in packaging weight per order by FY2030 (vs FY2025 baseline of 180g per order)");
bullet("Single-use plastics eliminated from e-commerce packaging by FY2028 (recycled paper void fill, paper mailer bags)");
bullet("Cardboard box optimisation extended to all fascias (Size?, Footpatrol, GO Outdoors, Blacks, Millets) by FY2028");
bullet("Reusable tote programme for B2B replenishment launched FY2028, targeting elimination of " +
  "18 million single-use polybags annually across the UK supply chain");

// ==================== PAGE 4 ====================
doc.addPage();

sectionHeader("5. Circular Economy & Product Stewardship");
subSectionHeader("5.1 Take-Back Programme: \u2018JD Re:Wear\u2019");
body(
  "JD Sports UK will launch \u2018JD Re:Wear\u2019, a nationwide in-store and online product take-back " +
  "programme from March 2028, accepting pre-owned sportswear, footwear, and accessories from any brand. " +
  "Customers receive a 15% discount voucher on next purchase."
);
bullet("Collection target: 500,000 items (250 tonnes) in Year 1, rising to 2M items (1,000 tonnes) annually by FY2032");
bullet("Rollout: 200 flagship and high-footfall stores by end of FY2028, all 430 UK stores by FY2030");
bullet("Online take-back via prepaid Royal Mail labels available from June 2028");
bullet("Partnership with SOEX Group for sorting, grading, and processing \u2014 contract awarded Q4 2027");
bullet("Resaleable items (est. 40%) via dedicated in-store sections and online marketplace; " +
  "non-resaleable (60%) through fibre-to-fibre recycling partnerships");

subSectionHeader("5.2 Repair & Resale");
body(
  "In-store shoe repair trials begin in 10 flagship stores (London Oxford Street, Manchester Market Street, " +
  "Birmingham Bullring, Glasgow Buchanan Street, Leeds Trinity, Liverpool ONE, Newcastle Eldon Square, " +
  "Cardiff St David\u2019s, Bristol Cabot Circus, Bluewater) from H2 2028. Services include sole replacement, " +
  "stitching repair, and deep cleaning at average GBP 25 per pair."
);
bullet("Target: 25,000 repair transactions in first 12 months, expanding to 50 stores by FY2030");
bullet("Online resale marketplace launching FY2029, leveraging JD app (2M MAU target)");
bullet("Partnership with The Restory for premium aftercare services, launched Q1 2029");

sectionHeader("6. Store Operations & Logistics");
subSectionHeader("6.1 Store Estate");
body("JD Sports UK operates approx. 430 stores: 16 flagship, 280 high street, 134 retail park.");
bullet("Zero Waste to Landfill extended from Rochdale DC and Bury head office to all UK stores by FY2030");
bullet("Current recycling: >5,000 tonnes cardboard/year; target >7,000 tonnes by FY2029");
bullet("Solar PV at UK Outdoors DC (H1 2026) and 50 largest stores by FY2030, targeting 2.5 MW capacity");
bullet("90 electric vans deployed by FY2030 (50% of fleet), charging at Rochdale DC and regional clusters");

// ==================== PAGE 5 ====================
doc.addPage();

sectionHeader("7. Governance, Compliance & Reporting");
body(
  "Governed by the JD Sports UK ESG Steering Group, chaired by the UK Managing Director, " +
  "with quarterly reporting to the Group ESG Committee. Key commitments:"
);
bullet("UK-specific sustainability report published annually from FY2028 (TCFD-aligned)");
bullet("EU CSRD adopted as best practice for UK reporting from FY2029");
bullet("EU Digital Product Passport implementation for own-brand products by H2 2028");
bullet("Green Claims Code compliance: all claims verified by third-party assurance provider (Q2 2027)");
bullet("UK Plastic Packaging Tax: min 30% recycled content in all plastic packaging by FY2028");

sectionHeader("8. Colleague Training & Culture");
body(
  "The \u2018#IAMSustainable\u2019 programme, already delivered across 21 countries to over 22,000 " +
  "colleagues, will be deepened for the UK:"
);
bullet("All 8,500 UK colleagues complete Level 1 sustainability awareness training by end of FY2027");
bullet("500 \u2018Sustainability Champions\u2019 trained across the UK store network by FY2028 " +
  "(2 hours/week dedicated time for in-store activities)");
bullet("Store manager sustainability KPIs from FY2028: energy efficiency, waste segregation, " +
  "take-back participation (10% of annual bonus weighting)");
bullet("Annual Sustainability Awards from FY2028 recognising top stores and colleagues");

sectionHeader("9. Implementation Roadmap: Key Milestones");
roadmapLine("FY2027 (2026/27): Baseline verification complete. LED retrofit begins. BEMS pilot to 25 stores. " +
  "Garment bags converted to recycled LDPE. Green Claims programme launched. \u2018Green Line\u2019 collection launches.");
roadmapLine("FY2028 (2027/28): JD Re:Wear launches March 2028 in 200 stores. 100% LED retrofit. " +
  "100% own-brand cotton BCI certified. Virgin plastic eliminated. Reusable tote programme. Digital Product Passport.");
roadmapLine("FY2029 (2028/29): 50% own-brand polyester recycled. Repair service in 10 flagships. " +
  "Online resale marketplace. 250 Sustainability Champions. Zero Waste to Landfill in 50% of stores. EV fleet at 30%.");
roadmapLine("FY2030 (2029/30): 30% Scope 3 reduction. 50% EV fleet. Zero Waste across entire UK estate. " +
  "JD Re:Wear in all 430 stores. 50% packaging weight reduction. 90 electric vans.");
roadmapLine("FY2035 (2034/35): 67.2% reduction all scopes (SBTi). 100% EV fleet. " +
  "75% recycled polyester. Net zero pathway on track for 2043 Group commitment.");

endMarker();

doc.end();

const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);
stream.on("finish", () => {
  const stats = fs.statSync(OUTPUT);
  console.log("PDF generated:", OUTPUT);
  console.log("Size:", stats.size, "bytes");
});
