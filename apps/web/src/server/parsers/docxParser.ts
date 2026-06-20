import fs from "fs";
import mammoth from "mammoth";

export interface ParseResult {
  text: string;
  pageCount: number;
  metadata: Record<string, string>;
}

const CHARS_PER_PAGE_ESTIMATE = 3000;

export async function parseDocx(filePath: string): Promise<ParseResult> {
  const dataBuffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer: dataBuffer });

  const text = result.value;
  const pageCount = Math.max(1, Math.ceil(text.length / CHARS_PER_PAGE_ESTIMATE));

  return {
    text,
    pageCount,
    metadata: {},
  };
}
