#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSON5 from "json5";
import { chromium } from "playwright";
import { z } from "zod";

export class PaperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaperError";
  }
}

export type OutputFormat = "pdf";

export type GenerateOptions = {
  documentType: string;
  input: string;
  out?: string;
  format?: OutputFormat;
};

type CliCommand =
  | { type: "generate"; options: GenerateOptions }
  | { type: "schema"; documentType: string }
  | { type: "sample"; documentType: string };

export type CliIo = {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
};

type InvoiceInput = z.infer<typeof invoiceInputSchema>;
type ResumeInput = z.infer<typeof resumeInputSchema>;

type InvoiceDocument = {
  type: "simple-invoice";
  invoiceId: string;
  details: Array<{
    label: string;
    value: string;
  }>;
  rows: Array<{
    description: string;
    amount: number;
  }>;
  totals: {
    subtotal: number;
    total: number;
  };
};

type ResumeDocument = {
  type: "simple-resume";
  name: string;
  summary?: string;
  experience: Array<{
    company: string;
    role: string;
    highlights: string[];
  }>;
};

type DocumentTemplate<Input, Model> = {
  publicKey: string;
  templateCode: string;
  schema: z.ZodType<Input>;
  jsonSchema: Record<string, unknown>;
  sample: Record<string, unknown>;
  buildModel: (input: Input) => Model;
  renderHtml: (model: Model) => string;
};

type RegisteredDocumentTemplate = {
  publicKey: string;
  templateCode: string;
  schema: z.ZodType<unknown>;
  jsonSchema: Record<string, unknown>;
  sample: Record<string, unknown>;
  buildModel: (input: unknown) => unknown;
  renderHtml: (model: unknown) => string;
};

const invoiceInputSchema = z.object({
  invoiceId: z.string().min(1),
  details: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .default([]),
  rows: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.number().finite(),
      }),
    )
    .min(1),
});

const resumeInputSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1).optional(),
  experience: z
    .array(
      z.object({
        company: z.string().min(1),
        role: z.string().min(1),
        highlights: z.array(z.string().min(1)).default([]),
      }),
    )
    .default([]),
});

const invoiceTemplate: DocumentTemplate<InvoiceInput, InvoiceDocument> = {
  publicKey: "invoice",
  templateCode: "simple-invoice",
  schema: invoiceInputSchema,
  jsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Simple Invoice",
    type: "object",
    additionalProperties: false,
    required: ["invoiceId", "rows"],
    properties: {
      invoiceId: {
        type: "string",
        minLength: 1,
        description: "Invoice identifier shown in the document header.",
      },
      details: {
        type: "array",
        description: "Invoice-level label/value details such as tax ID, due date, or recipient.",
        default: [],
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "value"],
          properties: {
            label: { type: "string", minLength: 1 },
            value: { type: "string", minLength: 1 },
          },
        },
      },
      rows: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "amount"],
          properties: {
            description: { type: "string", minLength: 1 },
            amount: { type: "number" },
          },
        },
      },
    },
  },
  sample: {
    invoiceId: "INV-001",
    details: [
      { label: "Bill To", value: "Acme Inc." },
      { label: "Tax ID", value: "TX-123" },
      { label: "Due Date", value: "2026-06-15" },
    ],
    rows: [
      { description: "Discovery work", amount: 1200 },
      { description: "Implementation", amount: 3400.5 },
    ],
  },
  buildModel: (input) => {
    const subtotal = input.rows.reduce((sum, row) => sum + row.amount, 0);

    return {
      type: "simple-invoice",
      invoiceId: input.invoiceId,
      details: input.details,
      rows: input.rows,
      totals: {
        subtotal,
        total: subtotal,
      },
    };
  },
  renderHtml: (model) =>
    documentShell({
      title: `Invoice ${model.invoiceId}`,
      body: `
        <header class="document-header">
          <p class="eyebrow">Invoice</p>
          <h1>Invoice ${escapeHtml(model.invoiceId)}</h1>
          ${
            model.details.length > 0
              ? `<dl class="details">${model.details
                  .map(
                    (detail) => `
                      <div>
                        <dt>${escapeHtml(detail.label)}</dt>
                        <dd>${escapeHtml(detail.value)}</dd>
                      </div>
                    `,
                  )
                  .join("")}</dl>`
              : ""
          }
        </header>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${model.rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.description)}</td>
                    <td class="amount">${formatMoney(row.amount)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th class="amount">${formatMoney(model.totals.total)}</th>
            </tr>
          </tfoot>
        </table>
      `,
    }),
};

const resumeTemplate: DocumentTemplate<ResumeInput, ResumeDocument> = {
  publicKey: "resume",
  templateCode: "simple-resume",
  schema: resumeInputSchema,
  jsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Simple Resume",
    type: "object",
    additionalProperties: false,
    required: ["name"],
    properties: {
      name: {
        type: "string",
        minLength: 1,
        description: "Candidate name shown as the document title.",
      },
      summary: {
        type: "string",
        minLength: 1,
        description: "Optional short professional summary.",
      },
      experience: {
        type: "array",
        default: [],
        items: {
          type: "object",
          additionalProperties: false,
          required: ["company", "role"],
          properties: {
            company: { type: "string", minLength: 1 },
            role: { type: "string", minLength: 1 },
            highlights: {
              type: "array",
              default: [],
              items: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
  },
  sample: {
    name: "Jane Doe",
    summary: "Operator and builder",
    experience: [
      {
        company: "Acme",
        role: "Product Lead",
        highlights: ["Shipped billing", "Reduced support load"],
      },
    ],
  },
  buildModel: (input) => ({
    type: "simple-resume",
    name: input.name,
    summary: input.summary,
    experience: input.experience,
  }),
  renderHtml: (model) =>
    documentShell({
      title: `${model.name} Resume`,
      body: `
        <header class="document-header">
          <p class="eyebrow">Resume</p>
          <h1>${escapeHtml(model.name)}</h1>
          ${model.summary ? `<p class="summary">${escapeHtml(model.summary)}</p>` : ""}
        </header>
        <section>
          <h2>Experience</h2>
          ${model.experience
            .map(
              (item) => `
                <article class="experience">
                  <h3>${escapeHtml(item.role)}</h3>
                  <p class="company">${escapeHtml(item.company)}</p>
                  ${
                    item.highlights.length > 0
                      ? `<ul>${item.highlights
                          .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
                          .join("")}</ul>`
                      : ""
                  }
                </article>
              `,
            )
            .join("")}
        </section>
      `,
    }),
};

const templates: RegisteredDocumentTemplate[] = [
  invoiceTemplate as RegisteredDocumentTemplate,
  resumeTemplate as RegisteredDocumentTemplate,
];

export const listTemplates = (): RegisteredDocumentTemplate[] => templates;

export const resolveTemplate = (documentType: string) => {
  const template = templates.find((item) => item.publicKey === documentType);

  if (!template) {
    throw new PaperError(`Unknown document type: ${documentType}`);
  }

  return template;
};

export const getJsonSchema = (documentType: string): Record<string, unknown> =>
  resolveTemplate(documentType).jsonSchema;

export const getSample = (documentType: string): Record<string, unknown> =>
  resolveTemplate(documentType).sample;

export const parseInput = async (input: string): Promise<unknown> => {
  const fileContents = await readInputFileIfPresent(input);
  const raw = fileContents ?? input;

  try {
    return JSON5.parse(raw);
  } catch (error) {
    if (error instanceof Error) {
      throw new PaperError(`Invalid JSON input: ${error.message}`);
    }

    throw new PaperError("Invalid JSON input.");
  }
};

export const renderHtml = async (
  documentType: string,
  input: string,
): Promise<{ html: string; templateCode: string }> => {
  const template = resolveTemplate(documentType);
  const parsed = await parseInput(input);
  const validation = template.schema.safeParse(parsed);

  if (!validation.success) {
    throw new PaperError(`Invalid ${documentType} input: ${formatZodError(validation.error)}`);
  }

  const model = template.buildModel(validation.data);

  return {
    html: template.renderHtml(model),
    templateCode: template.templateCode,
  };
};

export const renderPdf = async (html: string): Promise<Uint8Array> => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
};

export const generateDocument = async (options: GenerateOptions): Promise<string> => {
  const format = options.format ?? "pdf";

  if (format !== "pdf") {
    throw new PaperError(`Unsupported output format: ${format}`);
  }

  const { html, templateCode } = await renderHtml(options.documentType, options.input);
  const pdf = await renderPdf(html);
  const outPath = resolve(options.out ?? `${templateCode}.pdf`);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, pdf);

  return outPath;
};

export const runPaperCli = async (
  args: string[],
  io: CliIo = { stdout: process.stdout, stderr: process.stderr },
): Promise<number> => {
  try {
    const command = parseCliArgs(args);

    if (command.type === "schema") {
      io.stdout.write(`${JSON.stringify(getJsonSchema(command.documentType), null, 2)}\n`);
      return 0;
    }

    if (command.type === "sample") {
      io.stdout.write(`${JSON.stringify(getSample(command.documentType), null, 2)}\n`);
      return 0;
    }

    const outPath = await generateDocument(command.options);
    io.stdout.write(`${outPath}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    io.stderr.write(`${message}\n`);
    return 1;
  }
};

const parseCliArgs = (args: string[]): CliCommand => {
  const [command, documentType, input, ...rest] = args;

  if (command !== "generate" && command !== "schema" && command !== "sample") {
    throw new PaperError(
      "Usage: paper generate <document-type> <input> [--out <path>] | paper schema <document-type> | paper sample <document-type>",
    );
  }

  if (!documentType) {
    throw new PaperError("Missing document type.");
  }

  if (command === "schema" || command === "sample") {
    if (input) throw new PaperError(`Unexpected argument for ${command}: ${input}`);
    resolveTemplate(documentType);

    return {
      type: command,
      documentType,
    };
  }

  if (!input) {
    throw new PaperError("Missing input.");
  }

  const options: GenerateOptions = {
    documentType,
    input,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const value = rest[index + 1];

    if (arg === "--out") {
      if (!value) throw new PaperError("Missing value for --out.");
      options.out = value;
      index += 1;
      continue;
    }

    if (arg === "--format") {
      if (!value) throw new PaperError("Missing value for --format.");
      if (value !== "pdf") throw new PaperError(`Unsupported output format: ${value}`);
      options.format = value;
      index += 1;
      continue;
    }

    throw new PaperError(`Unknown option: ${arg}`);
  }

  return {
    type: "generate",
    options,
  };
};

const readInputFileIfPresent = async (input: string): Promise<string | undefined> => {
  const extension = extname(input);

  if (extension !== ".json" && extension !== ".json5") {
    return undefined;
  }

  try {
    return await readFile(input, "utf8");
  } catch {
    throw new PaperError(`Input file not found: ${input}`);
  }
};

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const documentShell = ({ title, body }: { title: string; body: string }): string => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: A4;
        margin: 24mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        color: #191919;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.5;
        margin: 0;
      }

      .document-header {
        border-bottom: 1px solid #d9d9d9;
        margin-bottom: 24px;
        padding-bottom: 18px;
      }

      .eyebrow {
        color: #666;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin: 0 0 6px;
        text-transform: uppercase;
      }

      h1 {
        font-size: 28px;
        line-height: 1.1;
        margin: 0;
      }

      h2 {
        border-bottom: 1px solid #e6e6e6;
        font-size: 14px;
        margin: 0 0 14px;
        padding-bottom: 6px;
        text-transform: uppercase;
      }

      h3 {
        font-size: 14px;
        margin: 0;
      }

      .summary {
        color: #333;
        font-size: 13px;
        margin: 12px 0 0;
        max-width: 640px;
      }

      .details {
        display: grid;
        gap: 8px 24px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 18px 0 0;
      }

      .details div {
        min-width: 0;
      }

      .details dt {
        color: #666;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .details dd {
        margin: 2px 0 0;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid #e6e6e6;
        padding: 10px 0;
        text-align: left;
        vertical-align: top;
      }

      tfoot th {
        border-bottom: 0;
        font-size: 14px;
        padding-top: 14px;
      }

      .amount {
        text-align: right;
        white-space: nowrap;
      }

      .experience {
        margin-bottom: 18px;
      }

      .company {
        color: #555;
        margin: 2px 0 8px;
      }

      ul {
        margin: 0;
        padding-left: 18px;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>
`;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];

  if (!entrypoint) return false;

  return realpathSync(entrypoint) === realpathSync(fileURLToPath(import.meta.url));
};

if (isCliEntrypoint()) {
  process.exitCode = await runPaperCli(process.argv.slice(2));
}
