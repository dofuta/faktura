import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function listFiles(dirPath: string, extensions: string[]): Promise<string[]> {
  await ensureDir(dirPath);
  const names = await readdir(dirPath);
  return names
    .filter((name) => extensions.includes(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => path.join(dirPath, name));
}
