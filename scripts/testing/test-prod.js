const puppeteer = require("puppeteer");
const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = 3002;
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
  console.log("Starting production server on port " + PORT);
  const server = spawn("npx", ["next", "start", "-p", PORT.toString()], {
    shell: true,
    stdio: "ignore"
  });

  // Wait for server to boot
  let ready = false;
  for (let i = 0; i < 15; i++) {
    ready = await isServerReady();
    if (ready) break;
    await delay(1000);
  }

  if (!ready) {
    console.error("Production server failed to respond on port " + PORT);
    process.exit(1);
  }

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"]
  });

  const page = await browser.newPage();
  
  // Log browser console
  page.on("console", (msg) => {
    console.log(`[Browser Console]: ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Log page errors
  page.on("pageerror", (err) => {
    console.error(`[Browser Page Error]:`, err.message);
  });

  try {
    console.log("Navigating to " + TARGET_URL);
    await page.goto(TARGET_URL, { waitUntil: "networkidle0" });
    await delay(2000);
    
    const title = await page.title();
    console.log("Page Title:", title);
    
    const html = await page.content();
    console.log("HTML length:", html.length);
    
    // Save screenshot
    const screenshotPath = path.join(__dirname, "../prod-test.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot saved to:", screenshotPath);
  } catch (err) {
    console.error("Navigation error:", err.message);
  } finally {
    await browser.close();
    console.log("Shutting down production server...");
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${server.pid} /f /t`);
    } else {
      server.kill();
    }
  }
}

run();
