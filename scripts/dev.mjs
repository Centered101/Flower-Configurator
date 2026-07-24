import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = process.env.NEXT_DIST_DIR?.trim() || ".next";
const shouldClean = process.env.NEXT_DEV_CLEAN !== "0";

const cwd = process.cwd();

if (shouldClean) {
  rmSync(resolve(cwd, distDir), { recursive: true, force: true });
}

const nextBin = resolve(cwd, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
  shell: false,
  env: process.env
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
