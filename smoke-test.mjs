import { chromium } from "playwright-core";

const executablePath =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

const phone = "07" + Math.floor(10000000 + Math.random() * 89999999);
const password = "correct-horse-battery";
const name = "Test Seller";

async function shot(label) {
  await page.screenshot({ path: `smoke/${label}.png`, fullPage: true });
  console.log(`[shot] ${label}`);
}

try {
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Buy and sell used tech without the guesswork");
  await shot("01-home");

  await page.click('a[href="/register"]');
  await page.waitForURL("**/register");
  await page.fill('input[name="displayName"]', name);
  await page.fill('input[name="phoneNumber"]', phone);
  await page.fill('input[name="password"]', password);
  await shot("02-register-filled");
  await page.click('button:has-text("Create account")');
  await page.waitForURL("http://localhost:3000/", { timeout: 15000 });
  await shot("03-home-logged-in");

  await page.click('a[href="/sell/new"]');
  await page.waitForURL("**/sell/new");
  await page.fill('input[name="title"]', "iPhone 12, 128GB, unlocked");
  await page.fill('input[name="brand"]', "Apple");
  await page.fill('input[name="model"]', "iPhone 12");
  await page.fill('input[name="storageGb"]', "128");
  await page.fill('input[name="priceMajorUnits"]', "45000");
  await page.check('input[name="conditionGrade"][value="GOOD"]');
  await page.fill(
    'textarea[name="defectsDescription"]',
    "Small scratch on back glass. Battery health 89%."
  );
  await page.fill('input[name="imei"]', "356938035643809");

  // create a tiny real JPEG on disk to upload
  const fs = await import("fs");
  const tinyJpegBase64 =
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==";
  fs.writeFileSync("smoke/tiny.jpg", Buffer.from(tinyJpegBase64, "base64"));
  await page.setInputFiles('input[name="photos"]', "smoke/tiny.jpg");

  await shot("04-listing-form-filled");
  await page.click('button:has-text("Publish listing")');
  await page.waitForURL(/\/listings\//, { timeout: 15000 });
  await shot("05-listing-detail");

  const listingUrl = page.url();
  const bodyText = await page.textContent("body");
  console.log("[check] listing detail contains title:", bodyText.includes("iPhone 12, 128GB, unlocked"));
  console.log("[check] IMEI masked (no full IMEI in page):", !bodyText.includes("356938035643809"));
  console.log("[check] IMEI last 4 shown:", bodyText.includes("3809"));

  await page.goto("http://localhost:3000/browse", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=All listings");
  await shot("06-browse-with-listing");
  const browseText = await page.textContent("body");
  console.log("[check] browse page shows new listing:", browseText.includes("iPhone 12, 128GB, unlocked"));

  await page.goto("http://localhost:3000/browse?q=iPhone", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('text=Results for "iPhone"');
  await shot("07-browse-filtered");
  const filteredText = await page.textContent("body");
  console.log("[check] filter by q=iPhone still shows listing:", filteredText.includes("iPhone 12, 128GB, unlocked"));

  // condition filter should preserve the active search term via the hidden q field
  await page.selectOption('select[name="condition"]', "GOOD");
  await page.click('button:has-text("Apply")');
  await page.waitForURL(/q=iPhone.*condition=GOOD|condition=GOOD.*q=iPhone/);
  await shot("07b-browse-filtered-condition");

  await page.goto("http://localhost:3000/account", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Your listings");
  await shot("08-account");
  const accountText = await page.textContent("body");
  console.log("[check] account page lists the new listing:", accountText.includes("iPhone 12, 128GB, unlocked"));

  await page.click('button:has-text("My Trego")');
  await page.click('button:has-text("Log out")');
  await page.waitForURL("http://localhost:3000/");
  await shot("09-logged-out");
  const loggedOutText = await page.textContent("body");
  console.log("[check] logged out shows Sign in link:", loggedOutText.includes("Sign in"));

  await page.click('a[href="/login"]');
  await page.waitForURL("**/login");
  await page.fill('input[name="phoneNumber"]', phone);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Log in")');
  await page.waitForURL("http://localhost:3000/", { timeout: 15000 });
  await shot("10-logged-back-in");
  const loggedInAgainText = await page.textContent("body");
  console.log("[check] logged back in greets by first name:", loggedInAgainText.includes(`Hi, ${name.split(" ")[0]}!`));

  console.log("\n[errors captured]", errors.length === 0 ? "none" : errors);
  console.log("\nDONE. Listing URL:", listingUrl);
} catch (err) {
  console.error("SMOKE TEST FAILED:", err);
  await shot("ERROR");
  console.log("\n[errors captured so far]", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
