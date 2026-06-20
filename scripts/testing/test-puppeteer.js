const puppeteer = require("puppeteer");

async function test() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"]
  });
  const page = await browser.newPage();
  
  const urls = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://[::1]:3000"
  ];
  
  for (const url of urls) {
    try {
      console.log(`Trying ${url}...`);
      const response = await page.goto(url, { timeout: 10000 });
      console.log(`Success! Status: ${response.status()}`);
    } catch (e) {
      console.error(`Failed ${url}:`, e.message);
    }
  }
  
  await browser.close();
}

test();
