const { spawn, execSync } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3001;
const TARGET_URL = `http://localhost:${PORT}`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isServerReady() {
  return new Promise((resolve) => {
    http.get(TARGET_URL, (res) => {
      resolve(res.statusCode === 200);
    }).on("error", () => {
      resolve(false);
    });
  });
}

async function run() {
  console.log(">> Phase 1: Building production bundle...");
  try {
    execSync("npm run build", { stdio: "inherit" });
    console.log("Production build compiled successfully.");
  } catch (err) {
    console.error("Build failed:", err.message);
    process.exit(1);
  }

  console.log(`>> Phase 2: Starting production server on port ${PORT}...`);
  const server = spawn("npx", ["next", "start", "-p", PORT.toString()], {
    shell: true,
    stdio: "pipe"
  });

  server.stdout.on("data", (data) => {
    console.log(`[Server]: ${data.toString().trim()}`);
  });

  server.stderr.on("data", (data) => {
    console.error(`[Server Error]: ${data.toString().trim()}`);
  });

  console.log("Waiting for server to become responsive...");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await isServerReady();
    if (ready) break;
    await delay(1000);
  }

  if (!ready) {
    console.error("Production server failed to respond on port " + PORT);
    server.kill();
    process.exit(1);
  }
  console.log("Production server is ready.");

  console.log(">> Phase 3: Executing Lighthouse audit...");
  const reportPath = path.join(__dirname, "../lighthouse-report.json");
  
  try {
    execSync(
      `npx lighthouse ${TARGET_URL} --output=json --output-path=${reportPath} --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`,
      { stdio: "inherit" }
    );
    
    const reportData = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const categories = reportData.categories;
    const audits = reportData.audits;
    
    const perfScore = Math.round(categories.performance.score * 100);
    const accScore = Math.round(categories.accessibility.score * 100);
    const bpScore = Math.round(categories["best-practices"].score * 100);
    const seoScore = Math.round(categories.seo.score * 100);
    
    console.log("\n===========================================");
    console.log("  LIGHTHOUSE AUDIT RESULTS");
    console.log("===========================================");
    console.log(`  Performance:     ${perfScore}/100`);
    console.log(`  Accessibility:   ${accScore}/100`);
    console.log(`  Best Practices:  ${bpScore}/100`);
    console.log(`  SEO:             ${seoScore}/100`);
    console.log("===========================================\n");

    // Print failed audits for categories scoring < 100
    const catKeys = ["performance", "accessibility", "best-practices", "seo"];
    catKeys.forEach((catKey) => {
      const category = categories[catKey];
      if (category.score < 1.0) {
        console.log(`\nFailed Audits for [${category.title}]:`);
        category.auditRefs.forEach((ref) => {
          const audit = audits[ref.id];
          if (audit && audit.score !== null && audit.score < 1.0) {
            console.log(`- [${ref.id}] (${audit.score * 100} pts): ${audit.title}`);
            if (audit.description) {
              console.log(`  Description: ${audit.description.replace(/\s+/g, " ").trim()}`);
            }
          }
        });
      }
    });
    console.log("");

    // Write scores to a JSON file for the performance agent to parse
    const results = {
      performance: perfScore,
      accessibility: accScore,
      bestPractices: bpScore,
      seo: seoScore
    };
    fs.writeFileSync(path.join(__dirname, "../lighthouse-results.json"), JSON.stringify(results, null, 2));

    try {
      fs.unlinkSync(reportPath);
    } catch (_) {}
    
  } catch (err) {
    console.error("Lighthouse audit failed:", err.message);
  } finally {
    console.log(">> Phase 4: Cleaning up production server...");
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${server.pid} /f /t`);
    } else {
      server.kill("SIGINT");
    }
    console.log("Cleanup finished.");
  }
}

run();
