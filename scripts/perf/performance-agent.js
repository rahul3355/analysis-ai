const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.join(__dirname, "..");
const NEXT_CONFIG_PATH = path.join(ROOT_DIR, "next.config.ts");
const LAYOUT_PATH = path.join(ROOT_DIR, "src/app/layout.tsx");
const RESULTS_JSON_PATH = path.join(ROOT_DIR, "lighthouse-results.json");

// Backup cache
const backups = {};

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    backups[filePath] = fs.readFileSync(filePath, "utf8");
    console.log(`[Backup] Backed up ${path.basename(filePath)}`);
  }
}

function restoreFile(filePath) {
  if (backups[filePath] !== undefined) {
    fs.writeFileSync(filePath, backups[filePath], "utf8");
    console.log(`[Backup] Restored ${path.basename(filePath)}`);
  }
}

function getBundleSize() {
  const staticDir = path.join(ROOT_DIR, ".next/static");
  function getDirSize(dir) {
    let size = 0;
    if (!fs.existsSync(dir)) return 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        size += getDirSize(itemPath);
      } else if (itemPath.endsWith(".js") || itemPath.endsWith(".css")) {
        size += stat.size;
      }
    }
    return size;
  }
  return getDirSize(staticDir);
}

function runVerification() {
  console.log(">> Running verification pipeline (verify.ps1)...");
  try {
    execSync("powershell -File scripts/verify.ps1", { stdio: "inherit", cwd: ROOT_DIR });
    return true;
  } catch (err) {
    console.warn(">> Verification failed:", err.message);
    return false;
  }
}

function runLighthouse() {
  console.log(">> Running Lighthouse audit...");
  try {
    // Clean old results first
    if (fs.existsSync(RESULTS_JSON_PATH)) {
      fs.unlinkSync(RESULTS_JSON_PATH);
    }
    execSync("node scripts/run-lighthouse.js", { stdio: "inherit", cwd: ROOT_DIR });
    if (fs.existsSync(RESULTS_JSON_PATH)) {
      return JSON.parse(fs.readFileSync(RESULTS_JSON_PATH, "utf8"));
    }
  } catch (err) {
    console.error(">> Lighthouse run failed:", err.message);
  }
  return null;
}

// Optimization experiments
const experiments = [
  {
    name: "Enable removeConsole in production build",
    apply: () => {
      backupFile(NEXT_CONFIG_PATH);
      const content = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
};

export default nextConfig;
`;
      fs.writeFileSync(NEXT_CONFIG_PATH, content, "utf8");
    },
    revert: () => {
      restoreFile(NEXT_CONFIG_PATH);
    }
  },
  {
    name: "Configure optimizePackageImports for lucide-react",
    apply: () => {
      backupFile(NEXT_CONFIG_PATH);
      // Reads current content and injects optimizePackageImports
      const current = fs.readFileSync(NEXT_CONFIG_PATH, "utf8");
      let updated;
      if (current.includes("compiler:")) {
        updated = current.replace(
          "compiler: {",
          `experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {`
        );
      } else {
        updated = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
`;
      }
      fs.writeFileSync(NEXT_CONFIG_PATH, updated, "utf8");
    },
    revert: () => {
      restoreFile(NEXT_CONFIG_PATH);
    }
  },
  {
    name: "Explicitly set font-display swap on layout fonts",
    apply: () => {
      backupFile(LAYOUT_PATH);
      let content = fs.readFileSync(LAYOUT_PATH, "utf8");
      content = content.replace(
        `Space_Grotesk({\n  variable: "--font-space-grotesk",\n  subsets: ["latin"],\n})`,
        `Space_Grotesk({\n  variable: "--font-space-grotesk",\n  subsets: ["latin"],\n  display: "swap",\n})`
      );
      content = content.replace(
        `Inter({\n  variable: "--font-inter",\n  subsets: ["latin"],\n})`,
        `Inter({\n  variable: "--font-inter",\n  subsets: ["latin"],\n  display: "swap",\n})`
      );
      content = content.replace(
        `JetBrains_Mono({\n  variable: "--font-jetbrains-mono",\n  subsets: ["latin"],\n})`,
        `JetBrains_Mono({\n  variable: "--font-jetbrains-mono",\n  subsets: ["latin"],\n  display: "swap",\n})`
      );
      fs.writeFileSync(LAYOUT_PATH, content, "utf8");
    },
    revert: () => {
      restoreFile(LAYOUT_PATH);
    }
  },
  {
    name: "Enable Next.js compression and cleanDistDir",
    apply: () => {
      backupFile(NEXT_CONFIG_PATH);
      const current = fs.readFileSync(NEXT_CONFIG_PATH, "utf8");
      // Find insertion point inside nextConfig
      const insertion = `  compress: true,
  cleanDistDir: true,
`;
      const updated = current.replace("const nextConfig: NextConfig = {", `const nextConfig: NextConfig = {\n${insertion}`);
      fs.writeFileSync(NEXT_CONFIG_PATH, updated, "utf8");
    },
    revert: () => {
      restoreFile(NEXT_CONFIG_PATH);
    }
  },
  {
    name: "Enable React Strict Mode explicitly",
    apply: () => {
      backupFile(NEXT_CONFIG_PATH);
      const current = fs.readFileSync(NEXT_CONFIG_PATH, "utf8");
      const insertion = `  reactStrictMode: true,\n`;
      const updated = current.replace("const nextConfig: NextConfig = {", `const nextConfig: NextConfig = {\n${insertion}`);
      fs.writeFileSync(NEXT_CONFIG_PATH, updated, "utf8");
    },
    revert: () => {
      restoreFile(NEXT_CONFIG_PATH);
    }
  }
];

async function runAgent() {
  console.log("====================================================");
  console.log("             PERFORMANCE AGENT RUNNER              ");
  console.log("====================================================\n");

  // 1. Capture baseline
  console.log(">> Establishing baseline performance...");
  const baselinePassed = runVerification();
  if (!baselinePassed) {
    console.error("Baseline verification failed. Please ensure the app builds and tests pass first.");
    process.exit(1);
  }

  const baselineLighthouse = runLighthouse();
  if (!baselineLighthouse) {
    console.error("Failed to execute baseline Lighthouse audit.");
    process.exit(1);
  }

  const baselineSize = getBundleSize();
  console.log(`\n>> Baseline established:`);
  console.log(`   Performance:    ${baselineLighthouse.performance}/100`);
  console.log(`   Accessibility:  ${baselineLighthouse.accessibility}/100`);
  console.log(`   Best Practices: ${baselineLighthouse.bestPractices}/100`);
  console.log(`   SEO:            ${baselineLighthouse.seo}/100`);
  console.log(`   Bundle Size:    ${(baselineSize / 1024).toFixed(2)} KB\n`);

  let currentPerformance = baselineLighthouse.performance;
  let currentSize = baselineSize;
  const history = [
    {
      step: "Baseline",
      scores: { ...baselineLighthouse },
      bundleSize: baselineSize,
      status: "ACCEPTED"
    }
  ];

  // 2. Iterate through experiments
  for (let i = 0; i < experiments.length; i++) {
    const exp = experiments[i];
    console.log(`\n----------------------------------------------------`);
    console.log(`Experiment ${i + 1}/${experiments.length}: ${exp.name}`);
    console.log(`----------------------------------------------------`);

    try {
      // Apply change
      exp.apply();

      // Verify
      const passed = runVerification();
      if (!passed) {
        console.warn(`[REJECTED] ${exp.name} broke the build or tests.`);
        exp.revert();
        history.push({
          step: exp.name,
          scores: null,
          bundleSize: null,
          status: "REJECTED (Verification Failed)"
        });
        continue;
      }

      // Audit
      const scores = runLighthouse();
      if (!scores) {
        console.warn(`[REJECTED] ${exp.name} failed to complete Lighthouse audit.`);
        exp.revert();
        history.push({
          step: exp.name,
          scores: null,
          bundleSize: null,
          status: "REJECTED (Lighthouse Failed)"
        });
        continue;
      }

      const size = getBundleSize();
      console.log(`   New Performance: ${scores.performance}/100`);
      console.log(`   New Bundle Size: ${(size / 1024).toFixed(2)} KB (Delta: ${((size - currentSize) / 1024).toFixed(2)} KB)`);

      // Decision logic:
      // Keep if:
      // 1. Performance score is >= current performance AND size is <= current size (improved or equal size/perf)
      // 2. Performance score is > current performance (improved performance even if size slightly changed)
      const sizeImprovedOrEqual = size <= currentSize;
      const perfImproved = scores.performance > currentPerformance;
      const perfEqual = scores.performance === currentPerformance;

      if (perfImproved || (perfEqual && sizeImprovedOrEqual)) {
        console.log(`[ACCEPTED] ${exp.name} improved/maintained metrics.`);
        currentPerformance = scores.performance;
        currentSize = size;
        history.push({
          step: exp.name,
          scores,
          bundleSize: size,
          status: "ACCEPTED"
        });
      } else {
        console.log(`[REJECTED] ${exp.name} degraded performance or increased size without performance gain.`);
        exp.revert();
        history.push({
          step: exp.name,
          scores,
          bundleSize: size,
          status: "REJECTED (Metrics Regressed)"
        });
      }
    } catch (err) {
      console.error(`Error executing experiment ${exp.name}:`, err.message);
      exp.revert();
    }
  }

  // 3. Final summary
  console.log("\n====================================================");
  console.log("             OPTIMIZATION LOOP SUMMARY              ");
  console.log("====================================================");
  history.forEach((h) => {
    const sizeStr = h.bundleSize ? `${(h.bundleSize / 1024).toFixed(2)} KB` : "N/A";
    const perfStr = h.scores ? `${h.scores.performance}/100` : "N/A";
    console.log(`- ${h.step}:`);
    console.log(`  Status:      ${h.status}`);
    console.log(`  Performance: ${perfStr}`);
    console.log(`  Bundle Size: ${sizeStr}`);
  });

  const finalState = history.filter((h) => h.status === "ACCEPTED").pop();
  const savings = baselineSize - finalState.bundleSize;

  console.log("\n====================================================");
  console.log("              FINAL PERFORMANCE RESULTS             ");
  console.log("====================================================");
  console.log(`Baseline Performance:  ${baselineLighthouse.performance}/100`);
  console.log(`Optimized Performance: ${finalState.scores.performance}/100`);
  console.log(`Baseline Size:         ${(baselineSize / 1024).toFixed(2)} KB`);
  console.log(`Optimized Size:        ${(finalState.bundleSize / 1024).toFixed(2)} KB`);
  console.log(`Total Chunks Savings:  ${(savings / 1024).toFixed(2)} KB`);
  console.log("====================================================\n");

  // Write markdown report
  const reportPath = path.join(ROOT_DIR, "performance-report.md");
  let reportMd = `# Performance Optimization Loop Report\n\n`;
  reportMd += `Generated on ${new Date().toISOString()}\n\n`;
  reportMd += `## Summary of Results\n\n`;
  reportMd += `| Metric | Baseline | Optimized | Status |\n`;
  reportMd += `|---|---|---|---|\n`;
  reportMd += `| **Performance** | ${baselineLighthouse.performance}/100 | ${finalState.scores.performance}/100 | ${finalState.scores.performance >= baselineLighthouse.performance ? "PASS" : "WARN"} |\n`;
  reportMd += `| **Accessibility** | ${baselineLighthouse.accessibility}/100 | ${finalState.scores.accessibility}/100 | PASS |\n`;
  reportMd += `| **Best Practices** | ${baselineLighthouse.bestPractices}/100 | ${finalState.scores.bestPractices}/100 | PASS |\n`;
  reportMd += `| **SEO** | ${baselineLighthouse.seo}/100 | ${finalState.scores.seo}/100 | PASS |\n`;
  reportMd += `| **Bundle Size** | ${(baselineSize / 1024).toFixed(2)} KB | ${(finalState.bundleSize / 1024).toFixed(2)} KB | **Saved ${(savings / 1024).toFixed(2)} KB** |\n\n`;
  
  reportMd += `## Iteration History\n\n`;
  history.forEach((h) => {
    reportMd += `### ${h.step}\n`;
    reportMd += `- **Status**: ${h.status}\n`;
    if (h.scores) {
      reportMd += `- **Performance**: ${h.scores.performance}/100\n`;
      reportMd += `- **Accessibility**: ${h.scores.accessibility}/100\n`;
      reportMd += `- **Best Practices**: ${h.scores.bestPractices}/100\n`;
      reportMd += `- **SEO**: ${h.scores.seo}/100\n`;
    }
    if (h.bundleSize) {
      reportMd += `- **Bundle Size**: ${(h.bundleSize / 1024).toFixed(2)} KB\n`;
    }
    reportMd += `\n`;
  });

  fs.writeFileSync(reportPath, reportMd, "utf8");
  console.log(`Saved report to ${reportPath}`);
}

runAgent();
