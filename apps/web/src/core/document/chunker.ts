export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface TextChunk {
  text: string;
  index: number;
  tokenCount: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  const chunkSize = options?.chunkSize ?? 500;
  const chunkOverlap = options?.chunkOverlap ?? 50;
  const separators = options?.separators ?? ["\n\n", "\n", ".", " ", ""];
  const maxCharLen = chunkSize * 4;
  const overlapCharLen = chunkOverlap * 4;

  const cleaned = text.trim();
  if (!cleaned || chunkSize <= 0) return [];

  if (cleaned.length <= maxCharLen) {
    return [{ text: cleaned, index: 0, tokenCount: estimateTokens(cleaned) }];
  }

  const chunks: TextChunk[] = [];
  let cursor = 0;
  const maxLen = cleaned.length;

  while (cursor < maxLen) {
    const remaining = cleaned.slice(cursor);
    const rawLen = Math.min(maxCharLen, remaining.length);
    let chunkEnd = cursor + rawLen;

    if (chunkEnd < maxLen) {
      const searchSpace = remaining.slice(0, rawLen);
      for (const sep of separators) {
        const idx = searchSpace.lastIndexOf(sep, rawLen - sep.length);
        if (idx > rawLen / 4) {
          chunkEnd = cursor + idx + sep.length;
          break;
        }
      }
    }

    const chunkContent = cleaned.slice(cursor, chunkEnd).trim();
    if (chunkContent) {
      chunks.push({ text: chunkContent, index: chunks.length, tokenCount: estimateTokens(chunkContent) });
    }

    const chunkLen = chunkEnd - cursor;
    let actualOverlap = overlapCharLen;
    if (chunkLen < 100) {
      actualOverlap = 0;
    } else {
      const maxOverlap = Math.floor(chunkLen * 0.3);
      if (actualOverlap > maxOverlap) {
        actualOverlap = maxOverlap;
      }
    }

    const nextCursor = chunkEnd - actualOverlap;
    if (nextCursor <= cursor) {
      cursor = chunkEnd;
    } else {
      cursor = nextCursor;
    }
  }

  return chunks;
}
