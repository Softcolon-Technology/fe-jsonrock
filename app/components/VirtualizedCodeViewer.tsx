"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface VirtualizedCodeViewerProps {
  /** Pre-split lines — avoids a huge .split("\n") on the main thread. */
  lines: string[];
  className?: string;
}

const LINE_HEIGHT = 20; // px per line
const OVERSCAN = 20; // extra lines rendered above/below viewport

/**
 * A lightweight, virtualized code viewer for large JSON output.
 * Only renders the lines visible on screen + a small buffer.
 *
 * Accepts pre-split lines to avoid holding a giant string in memory.
 */
const VirtualizedCodeViewer: React.FC<VirtualizedCodeViewerProps> = ({
  lines,
  className,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  const totalLines = lines.length;
  const totalHeight = totalLines * LINE_HEIGHT;

  // Calculate visible range
  const startLine = Math.max(
    0,
    Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN,
  );
  const endLine = Math.min(
    totalLines,
    Math.ceil((scrollTop + containerHeight) / LINE_HEIGHT) + OVERSCAN,
  );
  const visibleLines = lines.slice(startLine, endLine);

  // Line number gutter width based on total line count
  const gutterWidth = `${Math.max(3, String(totalLines).length + 1)}ch`;

  // Throttled scroll handler to reduce re-renders during fast scrolling
  const rafRef = useRef<number>(0);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
    });
  }, []);

  // Track container height for accurate visible range calculation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerHeight(el.clientHeight);
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isDark = theme === "dark";

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        "h-full w-full overflow-auto font-mono text-[13px] leading-[20px]",
        isDark ? "bg-[#09090b] text-zinc-300" : "bg-white text-zinc-800",
        className,
      )}
      style={{ contain: "strict" }}
    >
      {/* Spacer to set correct scrollbar height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Only the visible lines */}
        <div
          style={{
            position: "absolute",
            top: startLine * LINE_HEIGHT,
            left: 0,
            right: 0,
          }}
        >
          {visibleLines.map((line, i) => {
            const lineNum = startLine + i + 1;
            return (
              <div
                key={lineNum}
                style={{ height: LINE_HEIGHT }}
                className="flex items-center"
              >
                {/* Line number */}
                <span
                  className={cn(
                    "shrink-0 text-right pr-4 select-none",
                    isDark ? "text-zinc-600" : "text-zinc-400",
                  )}
                  style={{ width: gutterWidth }}
                >
                  {lineNum}
                </span>
                {/* Line content */}
                <pre className="flex-1 whitespace-pre overflow-hidden m-0 p-0">
                  <JsonLine text={line} isDark={isDark} />
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Lightweight JSON syntax coloring for a single line.
 * Much cheaper than Monaco's full tokenizer.
 */
const JsonLine = React.memo(
  ({ text, isDark }: { text: string; isDark: boolean }) => {
    // For very long lines (e.g. minified JSON), truncate to prevent
    // the regex from hanging
    const displayText = text.length > 5000 ? text.slice(0, 5000) + " …" : text;

    // Color tokens: keys, strings, numbers, booleans, null
    const parts: React.ReactNode[] = [];
    // Simple regex to match JSON tokens
    const regex =
      /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(displayText)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        parts.push(displayText.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // Key (string followed by colon)
        const colonIndex = match[1].lastIndexOf(":");
        const key = match[1].slice(0, colonIndex);
        const colon = match[1].slice(colonIndex);
        parts.push(
          <span
            key={match.index}
            style={{ color: isDark ? "#7dd3fc" : "#0369a1" }}
          >
            {key}
          </span>,
        );
        parts.push(colon);
      } else if (match[2]) {
        // String value
        parts.push(
          <span
            key={match.index}
            style={{ color: isDark ? "#86efac" : "#15803d" }}
          >
            {match[2]}
          </span>,
        );
      } else if (match[3]) {
        // Number
        parts.push(
          <span
            key={match.index}
            style={{ color: isDark ? "#fda4af" : "#be123c" }}
          >
            {match[3]}
          </span>,
        );
      } else if (match[4]) {
        // Boolean
        parts.push(
          <span
            key={match.index}
            style={{ color: isDark ? "#c4b5fd" : "#7c3aed" }}
          >
            {match[4]}
          </span>,
        );
      } else if (match[5]) {
        // null
        parts.push(
          <span
            key={match.index}
            style={{ color: isDark ? "#9ca3af" : "#6b7280" }}
          >
            {match[5]}
          </span>,
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Remaining text
    if (lastIndex < displayText.length) {
      parts.push(displayText.slice(lastIndex));
    }

    return <>{parts.length > 0 ? parts : displayText}</>;
  },
);

JsonLine.displayName = "JsonLine";

export default VirtualizedCodeViewer;
