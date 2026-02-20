/**
 * Web Worker for JSON parsing and formatting.
 * Offloads heavy JSON.parse + JSON.stringify from the main thread.
 *
 * Architecture for large files:
 * - Never sends the full parsed JS object back (avoids structured clone cost).
 * - For large outputs, sends lines as a string[] to avoid a single giant string
 *   that the main thread would .split("\n") anyway.
 * - Provides metadata (line count, byte size) so the main thread can adapt its rendering.
 */

// --- Thresholds ---
/** Files above this size (in characters) are considered "large" */
const LARGE_FILE_THRESHOLD = 512 * 1024; // 512 KB
/** Max nodes to extract for tree/graph view to prevent memory blowup */
const MAX_TREE_NODES = 5_000;

// --- Types ---
export type JsonWorkerMessageType = "format" | "parse-for-views";

export interface JsonWorkerInput {
  id: number;
  type: JsonWorkerMessageType;
  content: string;
  indentSize: string;
}

export interface JsonWorkerFormatOutput {
  id: number;
  type: "format";
  isValid: boolean;
  /** Lines of formatted output — avoids sending one giant string */
  lines?: string[];
  /** Total number of lines */
  lineCount?: number;
  /** Approximate byte size of the formatted output */
  byteSize?: number;
  /** Whether the file is considered "large" (affects rendering strategy) */
  isLargeFile?: boolean;
  error?: { message: string; line?: number };
}

export interface TreeNodeSlim {
  /** JSON Pointer path segment */
  key: string;
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  /** For primitives */
  value?: string | number | boolean | null;
  /** For objects/arrays */
  childCount?: number;
  children?: TreeNodeSlim[];
  /** Whether children were truncated */
  truncated?: boolean;
}

export interface JsonWorkerViewsOutput {
  id: number;
  type: "parse-for-views";
  isValid: boolean;
  /** A lightweight, depth-limited tree for tree/graph views */
  treeData?: TreeNodeSlim;
  /** Total key count (for showing stats) */
  totalKeys?: number;
  /** Whether the tree was truncated */
  wasTruncated?: boolean;
  error?: { message: string; line?: number };
}

export type JsonWorkerOutput = JsonWorkerFormatOutput | JsonWorkerViewsOutput;

// --- Helpers ---

function extractError(content: string, e: unknown): { message: string; line?: number } {
  const error = e as SyntaxError;
  const message = error.message;

  let line: number | undefined;
  const positionMatch = message.match(/at position (\d+)/);
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    line = content.substring(0, position).split("\n").length;
  } else {
    const lineMatch = message.match(/line (\d+)/);
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    }
  }

  const cleanMessage = message.replace(/ in JSON at position \d+/, "");
  return { message: cleanMessage, line };
}

/**
 * Build a lightweight tree representation of JSON data.
 * Depth-limited and node-count-limited to prevent memory blowup.
 */
function buildSlimTree(
  key: string,
  value: unknown,
  nodeCount: { count: number },
  maxNodes: number,
): TreeNodeSlim {
  nodeCount.count++;

  if (value === null) {
    return { key, type: "null", value: null };
  }

  const jsType = typeof value;

  if (jsType === "string" || jsType === "number" || jsType === "boolean") {
    const displayValue = jsType === "string"
      ? (value as string).length > 200 ? (value as string).slice(0, 200) + "…" : value
      : value;
    return { key, type: jsType, value: displayValue as string | number | boolean };
  }

  if (Array.isArray(value)) {
    const node: TreeNodeSlim = { key, type: "array", childCount: value.length };
    if (nodeCount.count < maxNodes) {
      const children: TreeNodeSlim[] = [];
      for (let i = 0; i < value.length; i++) {
        if (nodeCount.count >= maxNodes) {
          node.truncated = true;
          break;
        }
        children.push(buildSlimTree(String(i), value[i], nodeCount, maxNodes));
      }
      node.children = children;
    } else {
      node.truncated = true;
    }
    return node;
  }

  if (jsType === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);
    const node: TreeNodeSlim = { key, type: "object", childCount: entries.length };
    if (nodeCount.count < maxNodes) {
      const children: TreeNodeSlim[] = [];
      for (const [k, v] of entries) {
        if (nodeCount.count >= maxNodes) {
          node.truncated = true;
          break;
        }
        children.push(buildSlimTree(k, v, nodeCount, maxNodes));
      }
      node.children = children;
    } else {
      node.truncated = true;
    }
    return node;
  }

  // Fallback
  return { key, type: "string", value: String(value) };
}

// --- Message Handler ---

self.onmessage = (e: MessageEvent<JsonWorkerInput>) => {
  const { id, type, content, indentSize } = e.data;

  if (type === "format") {
    handleFormat(id, content, indentSize);
  } else if (type === "parse-for-views") {
    handleParseForViews(id, content);
  }
};

function handleFormat(id: number, content: string, indentSize: string) {
  try {
    const parsed = JSON.parse(content);

    let formatted: string;
    if (indentSize === "minify") {
      formatted = JSON.stringify(parsed);
    } else {
      formatted = JSON.stringify(parsed, null, Number(indentSize));
    }

    const isLargeFile = formatted.length > LARGE_FILE_THRESHOLD;
    const lines = formatted.split("\n");

    const response: JsonWorkerFormatOutput = {
      id,
      type: "format",
      isValid: true,
      lines,
      lineCount: lines.length,
      byteSize: formatted.length,
      isLargeFile,
    };

    self.postMessage(response);
  } catch (e) {
    const response: JsonWorkerFormatOutput = {
      id,
      type: "format",
      isValid: false,
      error: extractError(content, e),
    };
    self.postMessage(response);
  }
}

function handleParseForViews(id: number, content: string) {
  try {
    const parsed = JSON.parse(content);
    const nodeCount = { count: 0 };
    const treeData = buildSlimTree("root", parsed, nodeCount, MAX_TREE_NODES);

    const response: JsonWorkerViewsOutput = {
      id,
      type: "parse-for-views",
      isValid: true,
      treeData,
      totalKeys: nodeCount.count,
      wasTruncated: nodeCount.count >= MAX_TREE_NODES,
    };

    self.postMessage(response);
  } catch (e) {
    const response: JsonWorkerViewsOutput = {
      id,
      type: "parse-for-views",
      isValid: false,
      error: extractError(content, e),
    };
    self.postMessage(response);
  }
}
