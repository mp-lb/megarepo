import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const distDirectory = fileURLToPath(new URL("../dist", import.meta.url));
const relativeSpecifierPattern =
  /(from\s+["']|import\s*\(\s*["'])(\.{1,2}\/[^"']+)(["'])/g;

const hasExtension = (specifier) => extname(specifier.split("?")[0]) !== "";

const patchFile = async (path) => {
  const source = await readFile(path, "utf8");
  const patched = source.replace(
    relativeSpecifierPattern,
    (match, prefix, specifier, suffix) => {
      if (hasExtension(specifier)) {
        return match;
      }

      return `${prefix}${specifier}.js${suffix}`;
    },
  );

  if (patched !== source) {
    await writeFile(path, patched);
  }
};

const patchDirectory = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        await patchDirectory(path);
        return;
      }

      if (
        entry.isFile() &&
        (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts"))
      ) {
        await patchFile(path);
      }
    }),
  );
};

await patchDirectory(distDirectory);
