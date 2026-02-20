"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type {
  JsonWorkerInput,
  JsonWorkerOutput,
  JsonWorkerFormatOutput,
  JsonWorkerViewsOutput,
  TreeNodeSlim,
} from "@/workers/json-format.worker";

export interface JsonFormatResult {
  isValid: boolean;
  /** Pre-split lines for the virtualized viewer. Never hold a single giant string in state. */
  lines: string[];
  lineCount: number;
  byteSize: number;
  isLargeFile: boolean;
  error: { message: string; line?: number } | null;
  isProcessing: boolean;
}

export interface JsonTreeResult {
  treeData: TreeNodeSlim | null;
  totalKeys: number;
  wasTruncated: boolean;
  isProcessing: boolean;
  error: { message: string; line?: number } | null;
}

/**
 * Hook that offloads JSON parsing + formatting to a Web Worker.
 * Keeps the main thread responsive for large files.
 *
 * Returns:
 * - formatResult: formatted lines for the code viewer
 * - treeResult: lightweight tree data for tree/graph views
 * - requestFormat: send content for formatting
 * - requestTreeData: send content for tree/graph view (lazy — only call when needed)
 */
export function useJsonWorker(): {
  formatResult: JsonFormatResult;
  treeResult: JsonTreeResult;
  requestFormat: (content: string, indentSize: string) => void;
  requestTreeData: (content: string) => void;
} {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const latestFormatIdRef = useRef(0);
  const latestViewsIdRef = useRef(0);

  const [formatResult, setFormatResult] = useState<JsonFormatResult>({
    isValid: true,
    lines: [],
    lineCount: 0,
    byteSize: 0,
    isLargeFile: false,
    error: null,
    isProcessing: false,
  });

  const [treeResult, setTreeResult] = useState<JsonTreeResult>({
    treeData: null,
    totalKeys: 0,
    wasTruncated: false,
    isProcessing: false,
    error: null,
  });

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/json-format.worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = (e: MessageEvent<JsonWorkerOutput>) => {
      const data = e.data;

      if (data.type === "format") {
        const d = data as JsonWorkerFormatOutput;
        // Ignore stale responses
        if (d.id !== latestFormatIdRef.current) return;

        if (d.isValid) {
          setFormatResult({
            isValid: true,
            lines: d.lines ?? [],
            lineCount: d.lineCount ?? 0,
            byteSize: d.byteSize ?? 0,
            isLargeFile: d.isLargeFile ?? false,
            error: null,
            isProcessing: false,
          });
        } else {
          setFormatResult({
            isValid: false,
            lines: [],
            lineCount: 0,
            byteSize: 0,
            isLargeFile: false,
            error: d.error ?? null,
            isProcessing: false,
          });
        }
      } else if (data.type === "parse-for-views") {
        const d = data as JsonWorkerViewsOutput;
        // Ignore stale responses
        if (d.id !== latestViewsIdRef.current) return;

        if (d.isValid) {
          setTreeResult({
            treeData: d.treeData ?? null,
            totalKeys: d.totalKeys ?? 0,
            wasTruncated: d.wasTruncated ?? false,
            isProcessing: false,
            error: null,
          });
        } else {
          setTreeResult({
            treeData: null,
            totalKeys: 0,
            wasTruncated: false,
            isProcessing: false,
            error: d.error ?? null,
          });
        }
      }
    };

    workerRef.current.onerror = (err) => {
      console.error("JSON Worker error:", err);
      setFormatResult((prev) => ({ ...prev, isProcessing: false }));
      setTreeResult((prev) => ({ ...prev, isProcessing: false }));
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Send content to worker for formatting
  const requestFormat = useCallback(
    (content: string, indentSize: string) => {
      if (!workerRef.current) return;

      const id = ++idRef.current;
      latestFormatIdRef.current = id;

      setFormatResult((prev) => ({ ...prev, isProcessing: true }));

      const message: JsonWorkerInput = {
        id,
        type: "format",
        content,
        indentSize,
      };
      workerRef.current.postMessage(message);
    },
    []
  );

  // Send content to worker for tree/graph data (lazy)
  const requestTreeData = useCallback(
    (content: string) => {
      if (!workerRef.current) return;

      const id = ++idRef.current;
      latestViewsIdRef.current = id;

      setTreeResult((prev) => ({ ...prev, isProcessing: true }));

      const message: JsonWorkerInput = {
        id,
        type: "parse-for-views",
        content,
        indentSize: "2", // Not used for views, but required by type
      };
      workerRef.current.postMessage(message);
    },
    []
  );

  return { formatResult, treeResult, requestFormat, requestTreeData };
}
