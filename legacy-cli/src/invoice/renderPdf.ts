import { chromium } from "playwright";
import path from "node:path";
import { ensureDir, writeTextFile } from "../utils/files.js";

export async function renderPdfFromHtml(html: string, pdfPath: string): Promise<void> {
  await ensureDir(path.dirname(pdfPath));
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "8mm",
        right: "7mm",
        bottom: "8mm",
        left: "7mm",
      },
    });
  } finally {
    await browser.close();
  }
}

export async function writeDebugHtml(html: string, htmlPath: string): Promise<void> {
  await writeTextFile(htmlPath, html);
}
