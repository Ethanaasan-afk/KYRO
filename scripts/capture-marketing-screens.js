/**
 * Captures the product screenshots used on the website (public/marketing/showcase/*.webp).
 *
 * 1. Start a demo-mode dev server:
 *      DEMO_MODE=true NEXT_PUBLIC_DEMO_MODE=true NEXT_DIST_DIR=.next-demo npx next dev -p 3002
 * 2. node scripts/capture-marketing-screens.js
 *
 * Env: CAPTURE_BASE (default http://127.0.0.1:3002), CHROME_PATH, PUPPETEER_PATH, ONLY=name1,name2
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer-core");

const OUT = path.join(__dirname, "../public/marketing/showcase");
const BASE = process.env.CAPTURE_BASE || "http://127.0.0.1:3002";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HIDE = `
  nextjs-portal { display: none !important; }
  [role="dialog"][aria-label="Welcome tour"] { display: none !important; }
  * { caret-color: transparent !important; }
`;

async function clean(page) {
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => {
    document.querySelectorAll("div").forEach((el) => {
      if ((el.textContent || "").trim() === "Demo Mode - data is not saved") el.remove();
    });
    document.querySelectorAll("button").forEach((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      if (t === "skip" || t === "skip tour") b.click();
    });
  });
  await sleep(400);
}

async function go(page, url, wait = 2500) {
  await page.goto(BASE + url, { waitUntil: "networkidle2", timeout: 180000 });
  await sleep(wait);
  await clean(page);
}

const want = (name) => !ONLY.length || ONLY.includes(name);

async function snap(page, name) {
  if (!want(name)) return;
  await sleep(700);
  const png = await page.screenshot({ type: "png" });
  const file = path.join(OUT, `${name}.webp`);
  await sharp(png).resize({ width: 1920 }).webp({ quality: 82 }).toFile(file);
  console.log("saved", path.relative(process.cwd(), file));
}

async function clickText(page, selector, text) {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) =>
        (e.textContent || "").trim().toLowerCase().includes(t.toLowerCase())
      );
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text
  );
  if (!ok) throw new Error(`not found: ${selector} / ${text}`);
}

async function setNumber(page, index, value) {
  await page.evaluate(
    (i, v) => {
      const el = document.querySelectorAll('input[type="number"]')[i];
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
    },
    index,
    value
  );
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
    args: ["--hide-scrollbars", "--disable-gpu", "--force-prefers-reduced-motion"],
  });
  const page = await browser.newPage();

  await go(page, "/dashboard", 4000);
  await snap(page, "dashboard");

  await go(page, "/products", 3000);
  await snap(page, "products");

  await go(page, "/inventory", 3000);
  await snap(page, "inventory");

  await go(page, "/outstanding", 3000);
  await snap(page, "outstanding");

  await go(page, "/customers", 3000);
  await snap(page, "customers");

  await go(page, "/settings", 3000);
  await snap(page, "settings");

  // VAT 201 over the last 90 days of seeded sales
  await go(page, "/reports", 3000);
  await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    const iso = d.toISOString().slice(0, 10);
    const input = document.querySelector('input[type="date"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, iso);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(1500);
  await page.evaluate(() => window.scrollTo(0, 900));
  await snap(page, "vat201b");

  // Invoice list, then the email composer on the newest invoice
  await go(page, "/invoices", 3000);
  await snap(page, "invoices");
  const first = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((x) => /\/invoices\/[0-9a-f-]{20,}$/.test(x.getAttribute("href") || ""));
    return a ? a.getAttribute("href") : null;
  });
  if (first) {
    await page.evaluate((h) => [...document.querySelectorAll("a")].find((x) => x.getAttribute("href") === h).click(), first);
    await sleep(2500);
    await clean(page);
    await snap(page, "invoice-detail");
    await clickText(page, "button", "Email");
    await sleep(1400);
    await snap(page, "howto-email");
  }

  // New invoice wizard
  await go(page, "/invoices/new", 2500);
  await page.click('input[placeholder^="Search by name"]');
  await page.type('input[placeholder^="Search by name"]', "Marina", { delay: 50 });
  await sleep(600);
  await snap(page, "howto-step1");
  await clickText(page, "button", "Marina Bistro");
  await sleep(400);
  await clickText(page, "button", "Next: What are they buying");
  await sleep(900);
  await clickText(page, "button", "Detergent Powder (loose)");
  await sleep(400);
  await setNumber(page, 0, "12.5");
  await sleep(300);
  await clickText(page, "button", "Floor Cleaner Concentrate");
  await sleep(400);
  await setNumber(page, 2, "8.5");
  await clickText(page, "button", "Handwash - Rose");
  await sleep(300);
  await clickText(page, "button", "Handwash - Rose");
  await sleep(500);
  await page.evaluate(() => window.scrollTo(0, 230));
  await snap(page, "howto-step2");
  await clickText(page, "button", "Next: Check everything");
  await sleep(1000);
  await page.evaluate(() => window.scrollTo(0, 300));
  await snap(page, "howto-step3");
  if (want("invoice-step3")) {
    fs.copyFileSync(path.join(OUT, "howto-step3.webp"), path.join(OUT, "invoice-step3.webp"));
    console.log("saved public/marketing/showcase/invoice-step3.webp");
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
