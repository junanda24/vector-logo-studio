const puppeteer = require("puppeteer-core");
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/home/hatch/workspace/tools/chrome-test/chrome-linux64/chrome",
    headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + String(e).slice(0, 200)));
  await page.goto("http://localhost:8902/", { waitUntil: "networkidle0", timeout: 30000 });

  // 1. sample logo
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Contoh logo")).click());
  await page.waitForFunction(() => document.body.textContent.includes("Hasil pembacaan"), { timeout: 20000 });
  console.log("analysis OK");
  await page.screenshot({ path: "/tmp/vec-1-analysis.png" });

  // 2. vectorize
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Vektorisasi")).click());
  await page.waitForFunction(() => document.body.textContent.includes("Komponen vektor"), { timeout: 60000 });
  console.log("vectorize OK");
  await new Promise((r) => setTimeout(r, 1000));

  const info = await page.evaluate(() => {
    const names = [...document.querySelectorAll("input")].filter((i) => i.value.startsWith("Komponen")).map((i) => i.value);
    return { count: names.length, names };
  });
  console.log("components:", JSON.stringify(info));
  await page.screenshot({ path: "/tmp/vec-2-components.png" });

  // 3. scroll to compare slider
  await page.evaluate(() => [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Bukti fidelitas")).scrollIntoView({ block: "center" }));
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: "/tmp/vec-3-compare.png" });

  // 4. preview check — scroll to preview, wait, count visible shape layers
  await page.evaluate(() => [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Preview animasi")).scrollIntoView({ block: "center" }));
  await new Promise((r) => setTimeout(r, 2500));
  const prev = await page.evaluate(() => {
    const svg = [...document.querySelectorAll(".checker svg")].pop();
    if (!svg) return { noSvg: true };
    const layers = [...svg.querySelectorAll(":scope > g > g")].filter((g) => g.querySelector("path"));
    const vis = layers.filter((g) => {
      if (g.style.display === "none") return false;
      const r = g.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }).length;
    return { layers: layers.length, visible: vis };
  });
  console.log("preview:", JSON.stringify(prev));
  await page.screenshot({ path: "/tmp/vec-4-preview.png" });

  console.log("errors:", errors.length ? errors.join(" | ") : "(none)");
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
