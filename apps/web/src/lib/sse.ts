export type StreamStage =
  | "classifying"
  | "searching_docs"
  | "querying_bq"
  | "generating"
  | "complete"
  | "error";

export interface StreamStatusEvent {
  stage: StreamStage;
  message: string;
}

export interface StreamSourcesEvent {
  sources: Array<{
    id: string;
    documentName: string;
    excerpt: string;
    relevanceScore?: number;
    pageNumber?: number;
  }>;
}

export interface StreamBqResultEvent {
  sql: string;
  rowCount: number;
  previewRows: Record<string, unknown>[];
  latencyMs: number;
}

export interface StreamTextDeltaEvent {
  delta: string;
}

export interface StreamCitationsEvent {
  citations: Array<{
    id: string;
    sourceId: string;
    label: string;
    excerpt: string;
    documentName?: string;
    pageNumber?: number;
    relevanceScore?: number;
    type: "document" | "bigquery";
  }>;
}

export interface StreamErrorEvent {
  message: string;
  code?: string;
}

export class StreamEvent {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;
  private _closed = false;

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    this.encoder = new TextEncoder();
  }

  get closed(): boolean {
    return this._closed;
  }

  private write(event: string, data: unknown): void {
    if (this._closed) return;
    try {
      const sse = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      this.controller.enqueue(this.encoder.encode(sse));
    } catch {
      this._closed = true;
    }
  }

  status(stage: StreamStage, message: string): void {
    this.write("status", { stage, message } satisfies StreamStatusEvent);
  }

  sources(data: StreamSourcesEvent): void {
    this.write("sources", data);
  }

  bqResult(data: StreamBqResultEvent): void {
    this.write("bq_result", data);
  }

  textDelta(delta: string): void {
    this.write("text_delta", { delta } satisfies StreamTextDeltaEvent);
  }

  citations(data: StreamCitationsEvent): void {
    this.write("citations", data);
  }

  error(message: string, code?: string): void {
    this.write("error", { message, code } satisfies StreamErrorEvent);
  }

  done(): void {
    this.write("done", {});
    this.close();
  }

  close(): void {
    if (this._closed) return;
    this._closed = true;
    try {
      this.controller.close();
    } catch {
      // Already closed
    }
  }
}
