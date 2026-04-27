const SPINNER_FRAMES = ["-", "\\", "|", "/"];

export type ProgressHandle = {
  update(message: string): void;
  stop(finalMessage?: string): void;
};

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function clearCurrentLine(): void {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

export function startProgress(message: string): ProgressHandle {
  const startedAt = Date.now();
  const isInteractive = Boolean(process.stdout.isTTY);
  let currentMessage = message;
  let frameIndex = 0;
  let stopped = false;

  const render = () => {
    if (stopped) {
      return;
    }

    const elapsed = formatElapsed(Date.now() - startedAt);
    const line = `${SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length]} ${currentMessage} (${elapsed})`;
    frameIndex += 1;

    if (isInteractive) {
      clearCurrentLine();
      process.stdout.write(`\r${line}`);
    }
  };

  if (!isInteractive) {
    console.log(currentMessage);
  } else {
    render();
  }

  const interval = setInterval(render, 250);

  return {
    update(nextMessage: string) {
      if (!nextMessage || nextMessage === currentMessage) {
        return;
      }

      currentMessage = nextMessage;
      if (!isInteractive) {
        console.log(currentMessage);
        return;
      }

      render();
    },
    stop(finalMessage?: string) {
      if (stopped) {
        return;
      }

      stopped = true;
      clearInterval(interval);
      if (isInteractive) {
        clearCurrentLine();
      }
      if (finalMessage) {
        const elapsed = formatElapsed(Date.now() - startedAt);
        console.log(`${finalMessage} (${elapsed})`);
      }
    },
  };
}
