/**
 * Test helpers for orchestrator calls.
 * The orchestrator now requires a StreamEvent writer as 2nd arg.
 * This provides a null-object mock.
 */
export class NullWriter {
  closed = false;
  status() {}
  done() { this.closed = true; }
  sources() {}
  bqResult() {}
  textDelta() {}
  citations() {}
  error() {}
}

/**
 * Call orchestrate with a mock writer.
 * Returns the final reply text and citations by intercepting writer.done().
 */
export async function callOrchestrate(message, documentIds) {
  const mod = await import("../apps/web/src/core/pipeline/orchestrator.ts");
  const writer = new NullWriter();

  // Monkey-patch writer.done to capture the final result
  let capturedReply = "";
  let capturedCitations = [];
  const origDone = writer.done.bind(writer);
  writer.citations = (data) => { capturedCitations = data.citations || []; };
  writer.textDelta = (token) => { capturedReply += token; };
  writer.done = () => {
    origDone();
    // After done is called, the reply is fully captured
  };

  await mod.orchestrate({ message, documentIds }, writer);
  return { reply: capturedReply, citations: capturedCitations };
}
