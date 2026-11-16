// Buduje statyczną wersję aplikacji (out/) dla Capacitora.
// Trasy serwerowe (proxy Garmin, ikony PWA, manifest) nie mają sensu w aplikacji natywnej
// i blokują eksport statyczny, więc na czas budowania są odsuwane na bok.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const stash = join(root, ".mobile-stash");
const moves = ["src/app/api", "src/app/icons", "src/app/manifest.ts"];

mkdirSync(stash, { recursive: true });
const moved = [];
try {
  for (const rel of moves) {
    const from = join(root, rel);
    if (!existsSync(from)) continue;
    const to = join(stash, rel.replaceAll("/", "__"));
    renameSync(from, to);
    moved.push([from, to]);
  }
  rmSync(join(root, "out"), { recursive: true, force: true });
  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_MOBILE_BUILD: "1" },
  });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  rmSync(join(root, "out/sw.js"), { force: true });
} finally {
  for (const [from, to] of moved.reverse()) renameSync(to, from);
  rmSync(stash, { recursive: true, force: true });
}
