"use client";

import { useState, useMemo } from "react";
import { ChevronDown, FileText, Database } from "lucide-react";
import { format } from "sql-formatter";
import { Citation } from "@analysis-ai/types";
import { cn } from "@/lib/cn";

export interface SourcesBlockProps {
  citations: Citation[];
}

const KEYWORD_COLOR = "text-purple-700 dark:text-purple-400";
const FUNCTION_COLOR = "text-blue-600 dark:text-blue-400";
const TYPE_COLOR = "text-teal-700 dark:text-teal-400";
const STRING_COLOR = "text-amber-700 dark:text-amber-400";
const NUMBER_COLOR = "text-rose-600 dark:text-rose-400";

const SQL_PATTERN = new RegExp(
  [
    `('(?:[^'\\\\]|\\\\.)*')`,
    `(\\b\\d+(?:\\.\\d+)?\\b)`,
    `\\b(STRING|INT64|INT|FLOAT64|FLOAT|NUMERIC|BIGNUMERIC|BOOLEAN|BOOL|BYTES|DATE|DATETIME|TIME|TIMESTAMP)\\b`,
    `\\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|IFNULL|NULLIF|DATE_DIFF|DATE_TRUNC|TIMESTAMP_TRUNC|EXTRACT|FORMAT_DATE|FORMAT_TIMESTAMP|PARSE_DATE|PARSE_TIMESTAMP|UNNEST|GENERATE_DATE_ARRAY|SAFE_CAST|SAFE_DIVIDE|RANK|DENSE_RANK|ROW_NUMBER|LAG|LEAD|FIRST_VALUE|LAST_VALUE|CONCAT|REPLACE|SUBSTR|TRIM|LENGTH|UPPER|LOWER|INITCAP|REGEXP_CONTAINS|REGEXP_EXTRACT|REGEXP_REPLACE|SPLIT|JSON_EXTRACT|JSON_QUERY|JSON_VALUE)\\b`,
    `\\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|CAST|IS|NULL|LIKE|BETWEEN|EXISTS|WITH|RECURSIVE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|VIEW|TRUE|FALSE|ASC|DESC|OVER|PARTITION|WINDOW|ROWS|RANGE|PRECEDING|FOLLOWING|UNBOUNDED|CURRENT|ROW|FETCH|NEXT|ONLY|LATERAL|QUALIFY|PIVOT|UNPIVOT|ARRAY|STRUCT)\\b`,
  ].join("|"),
  "gi",
);

function highlightSql(sql: string): string {
  const escaped = sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    SQL_PATTERN,
    (_match, str, num, type, func, keyword) => {
      if (str) return `<span class="${STRING_COLOR}">${str}</span>`;
      if (num) return `<span class="${NUMBER_COLOR}">${num}</span>`;
      if (type) return `<span class="${TYPE_COLOR}">${type}</span>`;
      if (func) return `<span class="${FUNCTION_COLOR}">${func}</span>`;
      if (keyword) return `<span class="${KEYWORD_COLOR}">${keyword}</span>`;
      return _match;
    },
  );
}

function formatSqlQuery(raw: string): { summary: string; sql: string } {
  const parts = raw.split(/\n\n([\s\S]+)/);
  const summary = parts.length > 1 ? parts[0] : "";
  const sqlRaw = parts.length > 1 ? parts[1] : raw;

  let formatted: string;
  try {
    formatted = format(sqlRaw, {
      language: "bigquery",
      keywordCase: "upper",
      indentStyle: "standard",
    });
  } catch {
    formatted = sqlRaw;
  }

  return { summary, sql: formatted };
}

function CitationItem({ citation, index }: { citation: Citation; index: number }) {
  const isBigQuery = citation.type === "bigquery";
  const displayIndex = citation.originalIndex ?? (index + 1);

  const { summary, sql: formattedSql } = useMemo(
    () => (isBigQuery ? formatSqlQuery(citation.excerpt) : { summary: "", sql: "" }),
    [isBigQuery, citation.excerpt],
  );

  const highlightedSql = useMemo(
    () => (isBigQuery ? highlightSql(formattedSql) : ""),
    [isBigQuery, formattedSql],
  );

  return (
    <div className="flex gap-sm items-start text-xs leading-relaxed text-body-muted dark:text-muted">
      <span className="font-mono text-[9px] bg-soft-stone/50 dark:bg-white/10 text-ink dark:text-on-dark px-[5px] py-[1.5px] rounded-xs select-none flex-shrink-0 mt-[2px]">
        [{displayIndex}]
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {isBigQuery ? (
            <Database className="w-3 h-3 text-blue-500/70 dark:text-blue-400/60 flex-shrink-0" />
          ) : (
            <FileText className="w-3 h-3 text-slate/60 dark:text-muted/60 flex-shrink-0" />
          )}
          <span className="font-medium text-ink dark:text-on-dark text-[11px]">
            {isBigQuery
              ? citation.label
              : (citation.documentName || citation.label)}
            {!isBigQuery && citation.pageNumber && (
              <span className="font-normal text-slate dark:text-muted ml-1">
                &middot; Page {citation.pageNumber}
              </span>
            )}
          </span>
          {citation.relevanceScore !== undefined && (
            <span className="text-[9px] font-mono text-slate/50 dark:text-muted/50 ml-auto">
              {(citation.relevanceScore * 100).toFixed(0)}% match
            </span>
          )}
        </div>

        {isBigQuery ? (
          <div className="rounded-sm bg-blue-50 dark:bg-blue-500/5 border-l-2 border-blue-400 dark:border-blue-500/30 px-3 py-2 text-[10px] leading-relaxed font-body overflow-x-auto">
            {summary && (
              <span className="text-[9px] font-mono text-slate/60 dark:text-muted/60 block mb-1.5">
                {summary}
              </span>
            )}
            <span className="text-[9px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400/70 block mb-1.5">
              SQL Query
            </span>
            <pre
              className="font-mono text-[11px] text-ink/90 dark:text-on-dark/80 whitespace-pre-wrap break-all leading-[1.6]"
              dangerouslySetInnerHTML={{ __html: highlightedSql }}
            />
          </div>
        ) : (
          <div className="rounded-sm bg-yellow-50 dark:bg-yellow-500/10 border-l-2 border-yellow-400 dark:border-yellow-500/40 px-2 py-1 text-[11px] leading-relaxed text-ink/80 dark:text-on-dark/80 font-body">
            <span className="text-[9px] font-mono uppercase tracking-wider text-yellow-600 dark:text-yellow-400/70 block mb-[1px]">
              Excerpt
            </span>
            &ldquo;{citation.excerpt}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

export function SourcesBlock({ citations }: SourcesBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!citations || citations.length === 0) return null;

  const docCount = citations.filter((c) => c.type === "document").length;
  const bqCount = citations.filter((c) => c.type === "bigquery").length;

  return (
    <div className="mt-md flex flex-col gap-xs text-xs text-slate dark:text-muted select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-xs text-[9px] font-mono uppercase tracking-wider text-slate dark:text-muted hover:text-ink dark:hover:text-on-dark cursor-pointer transition-colors w-fit select-none focus:outline-hidden focus-visible:ring-1 focus-visible:ring-focus-blue rounded-xs"
        aria-expanded={isOpen}
        aria-label="Expand sources"
      >
        <span>Sources ({citations.length})</span>
        {docCount > 0 && bqCount > 0 && (
          <span className="font-normal text-[8px] lowercase text-slate/50 dark:text-muted/50">
            &nbsp;({docCount} doc{bqCount > 0 ? `, ${bqCount} db` : ""})
          </span>
        )}
        <ChevronDown
          className={cn("w-3 h-3 transition-transform duration-200", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-sm mt-xs animate-fade-in">
          {docCount > 0 && (
            <>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate/60 dark:text-muted/50 mt-xs mb-[2px]">
                Documents
              </div>
              {citations
                .map((citation, originalIndex) => ({ citation, originalIndex }))
                .filter(({ citation }) => citation.type === "document")
                .map(({ citation, originalIndex }) => (
                  <CitationItem key={citation.id} citation={citation} index={originalIndex} />
                ))}
            </>
          )}
          {bqCount > 0 && (
            <>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate/60 dark:text-muted/50 mt-xs mb-[2px]">
                Database Queries
              </div>
              {citations
                .map((citation, originalIndex) => ({ citation, originalIndex }))
                .filter(({ citation }) => citation.type === "bigquery")
                .map(({ citation, originalIndex }) => (
                  <CitationItem key={citation.id} citation={citation} index={originalIndex} />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
