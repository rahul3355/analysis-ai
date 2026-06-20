const puppeteer = require("puppeteer");
const { spawn, execSync } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3003;
const TARGET_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = "C:\\Users\\rahul\\.gemini\\antigravity\\brain\\8b8a6713-b56b-48f1-a7ed-da014bbd6bdf\\screenshots";

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

async function cleanDevOverlays(page) {
  await page.evaluate(() => {
    // Remove dev elements
    document.querySelectorAll("nextjs-portal").forEach(el => el.remove());
    document.querySelectorAll("next-route-announcer").forEach(el => el.remove());
  });
}

async function run() {
  console.log(">> Building production bundle...");
  try {
    execSync("npm run build", { stdio: "inherit" });
  } catch (err) {
    console.error("Build failed:", err.message);
    process.exit(1);
  }

  console.log(`>> Starting production server on port ${PORT}...`);
  const server = spawn("npx", ["next", "start", "-p", PORT.toString()], {
    shell: true,
    stdio: "pipe"
  });

  server.stdout.on("data", (data) => {
    // Silently capture output
  });

  // Ensure screenshot folder exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log("Waiting for server to become responsive...");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await isServerReady();
    if (ready) break;
    await delay(1000);
  }

  if (!ready) {
    console.error("Server failed to respond on port " + PORT);
    server.kill();
    process.exit(1);
  }
  console.log("Server is ready.");

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"]
  });

  try {
    const page = await browser.newPage();
    
    // 1. Load the initial page (Chat View - mock thread)
    console.log("Loading page...");
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("aside", { timeout: 60000 });
    await delay(2000);

    // Force Light Mode for initial capture via localStorage and reload
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("aside", { timeout: 60000 });
    await delay(2000);

    // Save Chat - Thread (Light Mode)
    console.log("Capturing Chat View - Thread (Light)...");
    await cleanDevOverlays(page);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "chat-thread-light.png") });

    // Toggle to Dark Mode
    console.log("Toggling to Dark Mode...");
    await page.click('button[aria-label^="Switch to"]');
    await delay(1000);

    // Save Chat - Thread (Dark Mode)
    console.log("Capturing Chat View - Thread (Dark)...");
    await cleanDevOverlays(page);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "chat-thread-dark.png") });

    // Clear Chat to get Empty State
    console.log("Clearing chat thread...");
    await page.click('button[aria-label="Clear chat thread"]');
    await delay(1000);

    // Save Chat - Empty State (Dark Mode)
    console.log("Capturing Chat View - Empty (Dark)...");
    await cleanDevOverlays(page);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "chat-empty-dark.png") });

    // Toggle back to Light Mode
    console.log("Toggling back to Light Mode...");
    await page.click('button[aria-label^="Switch to"]');
    await delay(1000);

    // Save Chat - Empty State (Light Mode)
    console.log("Capturing Chat View - Empty (Light)...");
    await cleanDevOverlays(page);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "chat-empty-light.png") });

    // Navigate to Documents view
    console.log("Navigating to Documents View...");
    await page.click('button[aria-label="Documents"]');
    await delay(1000);

    // Save Documents View (Light Mode)
    console.log("Capturing Documents View (Light)...");
    await cleanDevOverlays(page);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "documents-light.png") });

    // Toggle to Dark Mode
    console.log("Toggling to Dark Mode in Documents view...");
    await page.click('button[aria-label^="Switch to"]');
    await delay(1000);

    // Save Documents View (Dark Mode)
    console.log("Capturing Documents View (Dark)...");
    await cleanDevOverlays(page);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "documents-dark.png") });

    console.log("Screenshots captured successfully.");
  } catch (err) {
    console.error("Error during Puppeteer run:", err);
  } finally {
    await browser.close();
    console.log(">> Cleaning up production server...");
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${server.pid} /f /t`);
    } else {
      server.kill("SIGINT");
    }
    console.log("Cleanup finished.");
  }
}

run();
