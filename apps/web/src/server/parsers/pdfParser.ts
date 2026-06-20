import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export interface ParseResult {
  text: string;
  pageCount: number;
  metadata: Record<string, string>;
}

const PAGE_CONCURRENCY = 4;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsModule: any = null;

async function getPdfjs() {
  if (pdfjsModule) return pdfjsModule;
  const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = _require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  mod.GlobalWorkerOptions.workerSrc = "file:///" + workerPath.replace(/\\/g, "/");
  pdfjsModule = mod;
  return mod;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parsePage(doc: any, pageNum: number): Promise<string> {
  const pdfPage = await doc.getPage(pageNum);
  const textContent = await pdfPage.getTextContent();
  return (textContent.items as Array<Record<string, unknown>>)
    .filter((item): item is Record<string, unknown> & { str: string } => typeof item.str === "string")
    .map((item) => item.str)
    .join(" ");
}

async function runWithConcurrency<T>(items: number[], fn: (item: number) => Promise<T>, concurrency: number): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const p = fn(item).then((r) => { results[item - 1] = r; });
    const cleanup = p.then(() => { executing.delete(p); });
    executing.add(cleanup);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.allSettled(executing);
  return results;
}

export async function parsePdf(data: Uint8Array): Promise<ParseResult> {
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: any;
  try {
    doc = await loadingTask.promise;
  } catch (err: unknown) {
    throw new Error(`Failed to open PDF: ${(err as Error).message}`);
  }

  try {
    const pageCount = doc.numPages;
    const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
    const pageTexts = await runWithConcurrency(pageNumbers, (pageNum) => parsePage(doc, pageNum), PAGE_CONCURRENCY);

    const metadata: Record<string, string> = {};
    try {
      const meta = await doc.getMetadata();
      if (meta.info) {
        const info = meta.info as Record<string, unknown>;
        if (info.Title) metadata.title = String(info.Title);
        if (info.Author) metadata.author = String(info.Author);
        if (info.Subject) metadata.subject = String(info.Subject);
        if (info.Creator) metadata.creator = String(info.Creator);
        if (info.Producer) metadata.producer = String(info.Producer);
      }
    } catch {
      // Metadata extraction is optional
    }

    return {
      text: pageTexts.filter(Boolean).join("\n\n"),
      pageCount,
      metadata,
    };
  } finally {
    try {
      if (typeof doc.destroy === "function") {
        await doc.destroy();
      }
    } catch {
      // Cleanup failure is non-fatal
    }
  }
}
