import { spawn } from "node:child_process";

function quoteShellArg(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export async function openInEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
  const command = `${editor} ${quoteShellArg(filePath)}`;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}
