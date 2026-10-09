/**
 * Runs every src/**\/*.test.ts file with tsx. Each test file exits non-zero on failure.
 * Run: npm test
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function findTests(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...findTests(p));
    else if (name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const tests = findTests(join(root, "src")).sort();
let failed = 0;
for (const file of tests) {
  const rel = relative(root, file);
  const r = spawnSync(process.execPath, ["--import", "tsx", file], { cwd: root, encoding: "utf8" });
  if (r.status === 0) {
    console.log(`PASS  ${rel}`);
  } else {
    failed++;
    console.log(`FAIL  ${rel}\n${(r.stdout || "") + (r.stderr || "")}`);
  }
}
console.log(failed ? `\n${failed} of ${tests.length} test files failed` : `\nall ${tests.length} test files passed`);
process.exit(failed ? 1 : 0);
