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

    // エディタの起動自体に失敗した場合（コマンドが見つからない等）のみエラーにする。
    child.on("error", reject);

    // 編集の確認は任意ステップのため、エディタが非ゼロ終了しても処理は止めない。
    // 例: macOS の vi/vim は正常に保存・終了しても終了コード 1 を返すことがある。
    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`エディタが終了コード ${code} で終了しました。ドラフトは保存済みです。`);
      }
      resolve();
    });
  });
}
