import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateDocument,
  getJsonSchema,
  getSample,
  listTemplates,
  parseInput,
  renderHtml,
  renderPdf,
  resolveTemplate,
  runPaperCli,
} from "./index.js";

const snapshotsDir = resolve(process.cwd(), "snapshots");
const updateSnapshots = process.env.PAPER_UPDATE_SNAPSHOTS === "1";
const strictPdfSnapshots =
  process.env.PAPER_STRICT_PDF_SNAPSHOTS === "0"
    ? false
    : process.env.PAPER_STRICT_PDF_SNAPSHOTS === "1" || process.platform === "darwin";

const invoiceInput =
  "{invoiceId: 'INV-001', details: [{label: 'Bill To', value: 'Acme Inc.'}, {label: 'Tax ID', value: 'TX-123'}], rows: [{description: 'Discovery work', amount: 1200}, {description: 'Implementation', amount: 3400.5}]}";

const resumeInput =
  "{name: 'Jane Doe', summary: 'Operator and builder', experience: [{company: 'Acme', role: 'Product Lead', highlights: ['Shipped billing', 'Reduced support load']}]}";

describe("document registry", () => {
  it("resolves public document keys to internal template codes", () => {
    expect(resolveTemplate("invoice").templateCode).toBe("simple-invoice");
    expect(resolveTemplate("resume").templateCode).toBe("simple-resume");
    expect(() => resolveTemplate("contract")).toThrow("Unknown document type: contract");
  });

  it("keeps every sample valid for its template schema", () => {
    for (const template of listTemplates()) {
      const validation = template.schema.safeParse(template.sample);

      expect(validation.success, `${template.templateCode} sample should be valid`).toBe(true);
    }
  });
});

describe("input parsing", () => {
  it("parses inline JSON5 payloads", async () => {
    await expect(parseInput("{invoiceId: 'INV-001'}")).resolves.toEqual({
      invoiceId: "INV-001",
    });
  });

  it("parses JSON5 files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "paper-"));
    const inputPath = join(directory, "invoice.json5");
    await writeFile(inputPath, "{invoiceId: 'INV-002'}");

    await expect(parseInput(inputPath)).resolves.toEqual({
      invoiceId: "INV-002",
    });
  });
});

describe("validation and model rendering", () => {
  it("rejects invalid invoice input before rendering", async () => {
    await expect(renderHtml("invoice", "{invoiceId: '', rows: []}")).rejects.toThrow(
      "Invalid invoice input:",
    );
  });

  it("rejects invalid resume input before rendering", async () => {
    await expect(renderHtml("resume", "{name: '', experience: []}")).rejects.toThrow(
      "Invalid resume input:",
    );
  });

  it("renders the invoice HTML snapshot", async () => {
    const { html, templateCode } = await renderHtml("invoice", invoiceInput);

    await expectSnapshot(`${templateCode}.html`, html);
  });

  it("renders the invoice schema and sample snapshots", async () => {
    const templateCode = resolveTemplate("invoice").templateCode;

    await expectSnapshot(
      `${templateCode}.schema.json`,
      `${JSON.stringify(getJsonSchema("invoice"), null, 2)}\n`,
    );
    await expectSnapshot(
      `${templateCode}.sample.json`,
      `${JSON.stringify(getSample("invoice"), null, 2)}\n`,
    );
  });

  it("renders the resume HTML snapshot", async () => {
    const { html, templateCode } = await renderHtml("resume", resumeInput);

    await expectSnapshot(`${templateCode}.html`, html);
  });

  it("renders the resume schema and sample snapshots", async () => {
    const templateCode = resolveTemplate("resume").templateCode;

    await expectSnapshot(
      `${templateCode}.schema.json`,
      `${JSON.stringify(getJsonSchema("resume"), null, 2)}\n`,
    );
    await expectSnapshot(
      `${templateCode}.sample.json`,
      `${JSON.stringify(getSample("resume"), null, 2)}\n`,
    );
  });
});

describe("pdf snapshots", () => {
  it("renders the invoice PDF snapshot", async () => {
    const { html, templateCode } = await renderHtml("invoice", invoiceInput);
    const pdf = await renderPdf(html);

    await expectSnapshot(`${templateCode}.pdf`, pdf);
  });

  it("renders the resume PDF snapshot", async () => {
    const { html, templateCode } = await renderHtml("resume", resumeInput);
    const pdf = await renderPdf(html);

    await expectSnapshot(`${templateCode}.pdf`, pdf);
  });
});

describe("cli", () => {
  it("writes a generated PDF to the requested output path", async () => {
    const directory = await mkdtemp(join(tmpdir(), "paper-"));
    const outPath = join(directory, "invoice.pdf");

    const result = await runPaperCli(
      ["generate", "invoice", invoiceInput, "--out", outPath],
      createTestIo(),
    );

    expect(result).toBe(0);
    expect(existsSync(outPath)).toBe(true);
  });

  it("returns a non-zero status for invalid input", async () => {
    const io = createTestIo();
    const result = await runPaperCli(["generate", "invoice", "{}"], io);

    expect(result).toBe(1);
    expect(io.stderrText()).toContain("Invalid invoice input:");
  });

  it("prints JSON Schema for a document type", async () => {
    const io = createTestIo();
    const result = await runPaperCli(["schema", "invoice"], io);

    expect(result).toBe(0);
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      title: "Simple Invoice",
      required: ["invoiceId", "rows"],
    });
  });

  it("prints a valid sample for a document type", async () => {
    const io = createTestIo();
    const result = await runPaperCli(["sample", "resume"], io);
    const sample = JSON.parse(io.stdoutText());

    expect(result).toBe(0);
    expect(resolveTemplate("resume").schema.safeParse(sample).success).toBe(true);
  });

  it("generates documents through the core API", async () => {
    const directory = await mkdtemp(join(tmpdir(), "paper-"));
    const outPath = join(directory, "resume.pdf");

    await expect(
      generateDocument({
        documentType: "resume",
        input: resumeInput,
        out: outPath,
      }),
    ).resolves.toBe(outPath);
    expect(existsSync(outPath)).toBe(true);
  });
});

const expectSnapshot = async (
  name: string,
  value: string | Uint8Array,
): Promise<void> => {
  await mkdir(snapshotsDir, { recursive: true });

  const path = join(snapshotsDir, name);
  const bytes = typeof value === "string" ? Buffer.from(value) : Buffer.from(value);

  if (updateSnapshots || !existsSync(path)) {
    if (!updateSnapshots && !existsSync(path)) {
      throw new Error(`Missing snapshot: ${path}`);
    }

    await writeFile(path, bytes);
    return;
  }

  const expected = await readFile(path);

  if (name.endsWith(".pdf")) {
    if (!strictPdfSnapshots) {
      expectPdf(bytes);
      return;
    }

    expect(normalizePdf(bytes)).toEqual(normalizePdf(expected));
    return;
  }

  expect(bytes.toString("utf8")).toBe(expected.toString("utf8"));
};

const normalizePdf = (input: Buffer): string =>
  input
    .toString("latin1")
    .replaceAll(/\/CreationDate \(D:\d+[^)]*\)/g, "/CreationDate (D:normalized)")
    .replaceAll(/\/ModDate \(D:\d+[^)]*\)/g, "/ModDate (D:normalized)")
    .replaceAll(/\/ID \[[^\]]+\]/g, "/ID [normalized]");

const expectPdf = (input: Buffer): void => {
  expect(input.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  expect(input.byteLength).toBeGreaterThan(5_000);
};

const createTestIo = () => {
  let stdout = "";
  let stderr = "";

  return {
    stdout: {
      write: (chunk: string | Uint8Array) => {
        stdout += chunk.toString();
        return true;
      },
    },
    stderr: {
      write: (chunk: string | Uint8Array) => {
        stderr += chunk.toString();
        return true;
      },
    },
    stdoutText: () => stdout,
    stderrText: () => stderr,
  };
};
