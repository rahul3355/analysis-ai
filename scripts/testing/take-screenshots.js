const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const SCREENSHOTS_DIR = "C:\\Users\\rahul\\.gemini\\antigravity\\brain\\8b8a6713-b56b-48f1-a7ed-da014bbd6bdf\\screenshots";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanDevOverlays(page) {
  await page.evaluate(() => {
    // Remove dev elements
    document.querySelectorAll("nextjs-portal").forEach(el => el.remove());
    document.querySelectorAll("next-route-announcer").forEach(el => el.remove());
    document.querySelectorAll("*").forEach(el => {
      const id = el.id || "";
      const className = typeof el.className === "string" ? el.className : "";
      const tagName = el.tagName.toLowerCase();
      if (
        id.includes("nextjs") ||
        className.includes("nextjs") ||
        tagName.includes("nextjs") ||
        tagName === "nextjs-portal"
      ) {
        el.remove();
      }
    });
  });
}

async function run() {
  console.log("Starting visual QA screenshot generation...");

  // Ensure screenshot folder exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"]
  });

  try {
    const page = await browser.newPage();
    
    // 1. Load the initial page (Chat View - mock thread)
    console.log("Loading http://localhost:3000...");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("Waiting for selector 'aside' to confirm hydration...");
    await page.waitForSelector("aside", { timeout: 60000 });
    await delay(4000); // let compile & hydrate settle

    // Force Light Mode for initial capture via localStorage and reload
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
    });
    console.log("Reloading page to sync light theme state...");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("aside", { timeout: 60000 });
    await delay(3000);

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

    console.log("Screenshots saved successfully to: " + SCREENSHOTS_DIR);
  } catch (err) {
    console.error("Error during screenshot capture:", err);
  } finally {
    await browser.close();
  }
}

run();
