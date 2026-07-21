import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "cg-grants-gov-package-"));

try {
  const [{ filename }] = JSON.parse(
    execFileSync("npm", ["pack", "--json"], { cwd: root, encoding: "utf8" })
  );
  const tarball = join(root, filename);

  try {
    execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
      cwd: temp,
      stdio: "inherit",
    });
    execFileSync(
      process.execPath,
      ["--input-type=module", "--eval", 'import("@common-grants/cg-grants-gov")'],
      { cwd: temp, stdio: "inherit" }
    );
  } finally {
    rmSync(tarball, { force: true });
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
