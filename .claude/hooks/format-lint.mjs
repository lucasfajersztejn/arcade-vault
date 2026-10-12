// PostToolUse hook (Write|Edit): pasa Prettier y ESLint por el archivo tocado.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const raw = input.tool_input?.file_path;
if (!raw) process.exit(0);
const file = path.resolve(raw);
const rel = path.relative(root, file);
if (rel.startsWith("..") || path.isAbsolute(rel) || !existsSync(file)) {
  process.exit(0);
}
const run = (bin, args) =>
  execFileSync(process.execPath, [path.join(root, bin), ...args, file], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
// Código compacto: sin líneas en blanco ni espacios al final de línea.
// Markdown queda fuera: sus bloques necesitan líneas en blanco para ser válidos.
if (/\.(?:[cm]?[jt]sx?|css)$/.test(file)) {
  const src = readFileSync(file, "utf8");
  const compact = src
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== "")
    .join("\n");
  if (compact) writeFileSync(file, compact + "\n");
}
try {
  run("node_modules/prettier/bin/prettier.cjs", [
    "--write",
    "--ignore-unknown",
  ]);
} catch (e) {
  console.error(`Prettier falló en ${rel}:\n${e.stderr || e.message}`);
  process.exit(2);
}
if (/\.(?:[cm]?[jt]sx?)$/.test(file)) {
  try {
    run("node_modules/eslint/bin/eslint.js", ["--fix", "--no-warn-ignored"]);
  } catch (e) {
    console.error(
      `ESLint encontró errores en ${rel}:\n${e.stdout || ""}${e.stderr || ""}`,
    );
    process.exit(2);
  }
}
