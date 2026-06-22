export interface DocEntry {
  id: string;
  question: string;
  file: string;
}

export const DOCS_INDEX: DocEntry[] = [
  {
    id: "schema-context-to-llm",
    question: "How is schema context provided to the LLM?",
    file: "schema-context-to-llm",
  },
  {
    id: "data-source-decision-engine",
    question: "How we choose between Documents, BigQuery, Both, or Neither",
    file: "data-source-decision-engine",
  },
];
