import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadEnv } from "../config/env.js";

export function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}

export async function openPdfPreview(filePath: string): Promise<void> {
  if (process.platform !== "darwin") {
    console.log(`PDFプレビューURL: ${toFileUrl(filePath)}`);
    return;
  }

  const env = loadEnv();
  const args = env.pdfPreviewBrowser
    ? ["-a", env.pdfPreviewBrowser, toFileUrl(filePath)]
    : [toFileUrl(filePath)];

  await openWithMacOS(args);
}

export async function openUrl(url: string): Promise<void> {
  if (process.platform !== "darwin") {
    console.log(url);
    return;
  }

  await openWithMacOS([url]);
}

export async function revealInFinder(filePath: string): Promise<void> {
  if (process.platform !== "darwin") {
    console.log(`PDF: ${filePath}`);
    return;
  }

  await openWithMacOS(["-R", filePath]);
}

export async function openPath(filePath: string): Promise<void> {
  if (process.platform !== "darwin") {
    console.log(filePath);
    return;
  }

  await openWithMacOS([filePath]);
}

async function openWithMacOS(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("open", args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`open exited with code ${code ?? "unknown"}`));
    });
  });
}
