import puppeteer from "puppeteer-core";

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return puppeteer.launch({ executablePath, headless: true });
}

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // Webフォント(Noto Sans JP)の読み込みを待つ
    await page.waitForNetworkIdle({ idleTime: 300, timeout: 15_000 }).catch(() => {});
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
