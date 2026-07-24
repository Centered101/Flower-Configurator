import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = ".next-check";
const distPath = resolve(process.cwd(), distDir);
const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");

rmSync(distPath, { recursive: true, force: true });

const child = spawn(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    NEXT_DIST_DIR: distDir
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
