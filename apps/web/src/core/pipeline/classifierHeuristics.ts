export type HeuristicIntent = "DOCUMENT" | "DATABASE" | "HYBRID" | "UNKNOWN";

export interface HeuristicMatch {
  intent: HeuristicIntent;
  confidence: number;
  patternName: string;
}

interface PatternRule {
  regex: RegExp;
  intent: HeuristicIntent;
  weight: number;
  name: string;
}

const PATTERNS: PatternRule[] = [
  { regex: /full[- ]?price sell[- ]?through/i, intent: "DOCUMENT", weight: 0.99, name: "full-price-sell-through" },
  { regex: /sell[- ]?through.{0,20}rate/i, intent: "DOCUMENT", weight: 0.99, name: "sell-through-rate" },
  { regex: /sell[- ]?through/i, intent: "DOCUMENT", weight: 0.95, name: "sell-through-generic" },
  { regex: /framework agreement/i, intent: "DOCUMENT", weight: 0.99, name: "framework-agreement" },
  { regex: /nike framework/i, intent: "DOCUMENT", weight: 0.99, name: "nike-framework" },
  { regex: /back to school (campaign|brief)/i, intent: "DOCUMENT", weight: 0.99, name: "bts-campaign" },
  { regex: /\bcampaign\s+brief\b/i, intent: "DOCUMENT", weight: 0.92, name: "campaign-brief" },
  { regex: /running (footwear )?deep dive/i, intent: "DOCUMENT", weight: 0.99, name: "running-deep-dive" },
  { regex: /annual (sales )?plan/i, intent: "DOCUMENT", weight: 0.99, name: "annual-plan" },
  { regex: /\bsales\s+plan\b/i, intent: "DOCUMENT", weight: 0.95, name: "sales-plan" },
  { regex: /q3.{0,10}(performance|review)/i, intent: "DOCUMENT", weight: 0.99, name: "q3-review" },
  { regex: /media.{0,10}budget/i, intent: "DOCUMENT", weight: 0.98, name: "media-budget" },
  { regex: /(gross|operating) margin/i, intent: "DOCUMENT", weight: 0.95, name: "gross-margin" },
  { regex: /price (tier|architecture)/i, intent: "DOCUMENT", weight: 0.98, name: "price-tier" },
  { regex: /like[- ]?for[- ]?like/i, intent: "DOCUMENT", weight: 0.98, name: "like-for-like" },
  { regex: /(year.on.year|yoy|year over year)/i, intent: "DOCUMENT", weight: 0.95, name: "yoy-growth" },
  { regex: /growth.{0,20}(rate|vs|versus)/i, intent: "DOCUMENT", weight: 0.92, name: "growth-rate" },
  { regex: /store.{0,10}(count|estate|number)/i, intent: "DOCUMENT", weight: 0.95, name: "store-count" },
  { regex: /how many.{0,30}(stores|store)/i, intent: "DOCUMENT", weight: 0.97, name: "how-many-stores" },
  { regex: /rebate (rate|threshold|tier)/i, intent: "DOCUMENT", weight: 0.99, name: "rebate" },
  { regex: /volume commitment/i, intent: "DOCUMENT", weight: 0.99, name: "volume-commitment" },
  { regex: /purchase commitment/i, intent: "DOCUMENT", weight: 0.99, name: "purchase-commitment" },
  { regex: /minimum annual purchase/i, intent: "DOCUMENT", weight: 0.99, name: "min-annual-purchase" },
  { regex: /markdown (support|cost share|erosion)/i, intent: "DOCUMENT", weight: 0.99, name: "markdown-support" },
  { regex: /co.?op(erative)? marketing/i, intent: "DOCUMENT", weight: 0.99, name: "coop-marketing" },
  { regex: /exclusive colou?rways?/i, intent: "DOCUMENT", weight: 0.99, name: "exclusive-colourways" },
  { regex: /trade discount/i, intent: "DOCUMENT", weight: 0.99, name: "trade-discount" },
  { regex: /settlement discount/i, intent: "DOCUMENT", weight: 0.99, name: "settlement-discount" },
  { regex: /weeks? of cover/i, intent: "DOCUMENT", weight: 0.99, name: "weeks-of-cover" },
  { regex: /aged stock/i, intent: "DOCUMENT", weight: 0.95, name: "aged-stock" },
  { regex: /footfall uplift/i, intent: "DOCUMENT", weight: 0.99, name: "footfall-uplift" },
  { regex: /return on ad spend/i, intent: "DOCUMENT", weight: 0.99, name: "roas" },
  { regex: /(premium|super premium|core|mid) tier/i, intent: "DOCUMENT", weight: 0.95, name: "price-tier-name" },
  { regex: /hero products?/i, intent: "DOCUMENT", weight: 0.95, name: "hero-products" },
  { regex: /click and collect/i, intent: "DOCUMENT", weight: 0.90, name: "click-collect" },
  { regex: /loyalty (programme|program|tier)/i, intent: "DOCUMENT", weight: 0.92, name: "loyalty-program" },
  { regex: /jd status/i, intent: "DOCUMENT", weight: 0.95, name: "jd-status" },
  { regex: /size cur/i, intent: "DOCUMENT", weight: 0.99, name: "size-curve" },
  { regex: /target volume of/i, intent: "DOCUMENT", weight: 0.95, name: "target-volume" },
  { regex: /buffer stock/i, intent: "DOCUMENT", weight: 0.92, name: "buffer-stock" },
  { regex: /according to (the|our|both).{0,60}(review|report|document|agreement|plan|brief|deep dive|bigquery|database)/i, intent: "HYBRID", weight: 0.98, name: "according-to-doc" },
  { regex: /(review|agreement|plan|report|brief|deep dive).{0,20}(says|states|shows|indicates)/i, intent: "HYBRID", weight: 0.95, name: "doc-says" },
  { regex: /compare.{0,30}(document|report|pdf).{0,30}(with|against|and).{0,30}(data|database|bigquery|actual)/i, intent: "HYBRID", weight: 0.98, name: "compare-doc-db" },
  { regex: /(validate|verify|confirm).{0,30}(against|with|using).{0,30}(data|bigquery|database)/i, intent: "HYBRID", weight: 0.95, name: "validate-against-db" },
  { regex: /track (target|plan) against/i, intent: "HYBRID", weight: 0.95, name: "track-against" },
  { regex: /(actual|real).{0,10}(vs|versus|vs\.).{0,10}(plan|target|budget)/i, intent: "HYBRID", weight: 0.90, name: "actual-vs-plan" },
  { regex: /\bvs\.?\s+(plan|target|budget)\b/i, intent: "HYBRID", weight: 0.85, name: "vs-plan" },
  { regex: /how does.{0,50}(compare|track|stack up)/i, intent: "HYBRID", weight: 0.92, name: "how-compare" },
  { regex: /in\s+BQ\b/i, intent: "HYBRID", weight: 0.92, name: "in-bq" },
  { regex: /weather/i, intent: "UNKNOWN", weight: 0.99, name: "weather" },
  { regex: /tell.{0,20}(joke|story|poem)/i, intent: "UNKNOWN", weight: 0.99, name: "joke" },
  { regex: /who is (the )?(ceo|cfo|president|founder|director)/i, intent: "UNKNOWN", weight: 0.95, name: "who-is-ceo" },
  { regex: /what is your (name|purpose)/i, intent: "UNKNOWN", weight: 0.95, name: "what-is-your" },
  { regex: /stock (price|market)/i, intent: "UNKNOWN", weight: 0.95, name: "stock-price" },
  { regex: /how (are|were) (sales|things|we doing|business)/i, intent: "UNKNOWN", weight: 0.70, name: "vague-business" },
  { regex: /^what'?s? (new|happening|going on)/i, intent: "UNKNOWN", weight: 0.65, name: "vague-whats-new" },
  { regex: /top selling (product|sku)/i, intent: "DOCUMENT", weight: 0.90, name: "top-selling-product" },
  { regex: /(top|bottom) \d+/i, intent: "DATABASE", weight: 0.95, name: "top-n" },
  { regex: /how many (customers|orders|users|products|items|pairs|units)/i, intent: "DATABASE", weight: 0.97, name: "how-many-entity" },
  { regex: /average (order value|discount|price|quantity|spend)/i, intent: "DATABASE", weight: 0.97, name: "average-metric" },
  { regex: /by (region|channel|category|brand|department|state|age.group|gender|status)/i, intent: "DATABASE", weight: 0.92, name: "by-dimension" },
  { regex: /(count|total|sum) of/i, intent: "DATABASE", weight: 0.95, name: "aggregation-verb" },
  { regex: /\btotal\s+(revenue|sales|orders|customers|products)/i, intent: "DATABASE", weight: 0.95, name: "total-metric" },
  { regex: /\blast\s+(quarter|month|week|year)\b/i, intent: "DATABASE", weight: 0.85, name: "last-period" },
  { regex: /revenue (generated|by|for|in)/i, intent: "DATABASE", weight: 0.90, name: "revenue-by" },
  { regex: /orders? (placed|by|in|per)/i, intent: "DATABASE", weight: 0.92, name: "orders-by" },
  { regex: /low (on )?stock/i, intent: "DATABASE", weight: 0.97, name: "low-stock" },
  { regex: /stock level/i, intent: "DATABASE", weight: 0.95, name: "stock-level" },
  { regex: /reorder point/i, intent: "DATABASE", weight: 0.98, name: "reorder-point" },
  { regex: /distribution center/i, intent: "DATABASE", weight: 0.97, name: "distribution-center" },
  { regex: /age group/i, intent: "DATABASE", weight: 0.95, name: "age-group" },
  { regex: /return rate/i, intent: "DATABASE", weight: 0.95, name: "return-rate" },
  { regex: /discount (depth|pct|percentage)/i, intent: "DATABASE", weight: 0.92, name: "discount-depth" },
  { regex: /loyalty tier/i, intent: "DATABASE", weight: 0.95, name: "loyalty-tier" },
  { regex: /traffic source/i, intent: "DATABASE", weight: 0.95, name: "traffic-source" },
  { regex: /conversion (funnel|rate)/i, intent: "DATABASE", weight: 0.90, name: "conversion" },
  { regex: /\b(bigquery|sql query|database|bq)\b/i, intent: "DATABASE", weight: 0.92, name: "bq-reference" },
  { regex: /(most|highest|lowest) (revenue|sales|profit|margin)/i, intent: "DATABASE", weight: 0.90, name: "superlative-metric" },
  { regex: /\b(h1|h2|fy\s?\d{2,4})\b/i, intent: "DOCUMENT", weight: 0.95, name: "report-period" },
];

export function classifyByHeuristics(message: string): HeuristicMatch | null {
  if (!message || message.trim().length === 0) return null;

  const scores: Record<HeuristicIntent, number> = {
    DOCUMENT: 0, DATABASE: 0, HYBRID: 0, UNKNOWN: 0,
  };
  let matchedName = "";
  const matchedNames: string[] = [];

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(message)) {
      if (pattern.weight > scores[pattern.intent]) {
        scores[pattern.intent] = pattern.weight;
      }
      matchedNames.push(pattern.name);
    }
  }

  if (scores.HYBRID > 0) {
    return { intent: "HYBRID", confidence: scores.HYBRID, patternName: matchedNames.find(n => n.includes("hybrid")) || "hybrid-match" };
  }

  if (scores.UNKNOWN >= 0.8) {
    return { intent: "UNKNOWN", confidence: scores.UNKNOWN, patternName: matchedNames.find(n => !n.startsWith("vague")) || "unknown" };
  }

  const topTwo = (Object.entries(scores) as [HeuristicIntent, number][])
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a);

  if (topTwo.length === 0) return null;

  const [topIntent, topScore] = topTwo[0];

  if (topTwo.length >= 2) {
    const secondScore = topTwo[1][1];
    if (secondScore >= 0.7) {
      return { intent: "HYBRID", confidence: Math.min(topScore, secondScore), patternName: "conflicting-patterns" };
    }
  }

  const confidence = scores.HYBRID > 0 ? scores.HYBRID : topScore;

  return { intent: topIntent, confidence, patternName: matchedNames[0] || topIntent.toLowerCase() };
}
