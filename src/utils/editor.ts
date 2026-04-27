import { spawn } from "node:child_process";

export async function openInEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";

  await new Promise<void>((resolve, reject) => {
    const child = spawn(editor, [filePath], {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${editor} exited with code ${code ?? "unknown"}`));
    });
  });
}
