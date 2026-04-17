import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const extensionDir = path.join(rootDir, "packages", "extension");
const distDir = path.join(rootDir, "dist");
const distSrcDir = path.join(distDir, "src");
const optionsSrcDir = path.join(extensionDir, "src", "options");

const entryPoints = [
  ["src/background", path.join(extensionDir, "src", "background.ts")],
  ["src/content/youtube", path.join(extensionDir, "src", "content", "youtube.ts")],
  ["src/content/google", path.join(extensionDir, "src", "content", "google.ts")],
  ["src/options/options", path.join(optionsSrcDir, "options.ts")]
];

const ensureDir = async (target) => {
  await mkdir(target, { recursive: true });
};

const buildScripts = async () => {
  await build({
    entryPoints: Object.fromEntries(entryPoints),
    outdir: distDir,
    bundle: true,
    format: "esm",
    target: "chrome120",
    sourcemap: true,
    logLevel: "info"
  });
};

const copyStaticAssets = async () => {
  await ensureDir(path.join(distSrcDir, "options"));
  const rawHtml = await readFile(path.join(optionsSrcDir, "index.html"), "utf8");
  const builtHtml = rawHtml.replace(/src="\.\/options\.ts"/g, 'src="./options.js"');
  await writeFile(path.join(distSrcDir, "options", "index.html"), builtHtml);
  await cp(path.join(optionsSrcDir, "styles.css"), path.join(distSrcDir, "options", "styles.css"));
};

const writeManifest = async () => {
  const manifestPath = path.join(extensionDir, "manifest.json");
  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);

  manifest.background.service_worker = "src/background.js";
  manifest.content_scripts = manifest.content_scripts.map((contentScript) => ({
    ...contentScript,
    js: contentScript.js.map((scriptPath) => scriptPath.replace(/\.ts$/, ".js"))
  }));

  await writeFile(path.join(distDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
};

await rm(distDir, { recursive: true, force: true });
await ensureDir(distDir);
await buildScripts();
await copyStaticAssets();
await writeManifest();
