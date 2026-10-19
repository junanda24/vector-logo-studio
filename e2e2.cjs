const puppeteer = require("puppeteer-core");
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/home/hatch/workspace/tools/chrome-test/chrome-linux64/chrome",
    headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto("http://localhost:8902/", { waitUntil: "networkidle0", timeout: 30000 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Contoh logo")).click());
  await page.waitForFunction(() => document.body.textContent.includes("Hasil pembacaan"), { timeout: 20000 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Vektorisasi")).click());
  await page.waitForFunction(() => document.body.textContent.includes("Komponen vektor"), { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  const res = await page.evaluate(() => {
    // grab the generated lottie JSON by clicking copy and reading clipboard is hard headless;
    // instead re-derive: find the export stats and validate via a fresh build in-page
    const stats = [...document.querySelectorAll(".font-mono")].map((e) => e.textContent).join("|");
    return { stats };
  });
  console.log("stats:", res.stats.slice(0, 200));

  // Validate JSON structure by intercepting: evaluate the module functions directly
  const valid = await page.evaluate(async () => {
    // access via the app's own bundle is not exposed; validate DOM-rendered SVG instead
    const svg = [...document.querySelectorAll(".checker svg")].pop();
    const paths = svg ? svg.querySelectorAll("path").length : 0;
    // check shape-layer markers in preview: lottie-web renders shape layers as <g> with paths
    const preview = [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Preview"));
    return { previewPaths: paths };
  });
  console.log("dom check:", JSON.stringify(valid));

  // Direct structural test: build a lottie JSON in-page via dynamic import of the app chunk is complex;
  // instead verify the download buttons exist and are wired
  const btns = await page.evaluate(() =>
    [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((t) => t.includes("Download") || t.includes("Copy"))
  );
  console.log("export buttons:", JSON.stringify(btns));
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
