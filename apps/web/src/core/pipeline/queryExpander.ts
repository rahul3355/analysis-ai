const currentFiscalYear = new Date().getFullYear();

export function expandQuery(message: string): string {
  let q = message;
  if (/\bH1\b/i.test(q) && !/\b20\d{2}\b/.test(q)) q = q.replace(/\bH1\b/gi, `H1 ${currentFiscalYear}`);
  if (/\bH2\b/i.test(q) && !/\b20\d{2}\b/.test(q)) q = q.replace(/\bH2\b/gi, `H2 ${currentFiscalYear}`);
  q = q.replace(/\b(Q[1-4])\b(?!\s*20\d{2})/gi, `$1 ${currentFiscalYear}`);
  return q;
}
