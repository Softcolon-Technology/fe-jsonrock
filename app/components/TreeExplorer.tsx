"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, ChevronsDown, ChevronsUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNodeSlim } from "@/workers/json-format.worker";

/**
 * TreeExplorer that works with the worker's TreeNodeSlim data.
 * This is much more memory efficient than rendering from raw parsed JSON
 * because the tree is already depth/count limited by the worker.
 */
export default function TreeExplorer({ data }: { data: TreeNodeSlim | null }) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [tableData, setTableData] = useState<{
        node: TreeNodeSlim;
        path: string;
    } | null>(null);
    const [expandAll, setExpandAll] = useState<number>(0); // nonce for expand-all
    const [collapseAll, setCollapseAll] = useState<number>(0);

    const onSelect = (path: string, node: TreeNodeSlim) => {
        setSelectedPath(path);
        if (node.type === "object" || node.type === "array") {
            setTableData({ node, path });
        }
    };

    // Resizing Logic
    const [leftWidth, setLeftWidth] = useState(60);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const startResizing = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsDragging(false);
    }, []);

    const resize = React.useCallback((e: MouseEvent) => {
        if (isDragging && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const newPercentage = (offsetX / rect.width) * 100;
            if (newPercentage > 20 && newPercentage < 80) {
                setLeftWidth(newPercentage);
            }
        }
    }, [isDragging]);

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
        } else {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isDragging, resize, stopResizing]);

    if (!data) {
        return <div className="text-zinc-500 p-4 text-sm">No data to display</div>;
    }

    return (
        <div
            ref={containerRef}
            className="flex h-full w-full overflow-hidden bg-white dark:bg-[#050505] flex-col md:flex-row select-none"
            style={{ "--tree-left-width": `${leftWidth}%` } as React.CSSProperties}
        >
            {/* Left Pane - Tree View */}
            <div className="w-full md:w-(--tree-left-width) min-w-[200px] border-r border-zinc-200 dark:border-zinc-800 overflow-auto bg-white dark:bg-[#09090b] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pl-4 pr-4 py-1 bg-linear-to-b from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-300 dark:border-zinc-700 h-11 shrink-0">
                    <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">JSON Structure</span>
                    <div className="flex items-center gap-1 mr-[150px] lg:mr-0 z-50">
                        <button
                            onClick={() => setExpandAll(Date.now())}
                            className="group relative flex items-center justify-center p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        >
                            <ChevronsDown size={16} />
                            <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                Expand All
                            </span>
                        </button>
                        <button
                            onClick={() => setCollapseAll(Date.now())}
                            className="group relative flex items-center justify-center p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        >
                            <ChevronsUp size={16} />
                            <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                Collapse All
                            </span>
                        </button>
                    </div>
                </div>
                <div className="p-2 flex-1">
                    <SlimTreeNode
                        node={data}
                        path="$"
                        initiallyExpanded={true}
                        selectedPath={selectedPath}
                        onSelect={onSelect}
                        expandAllNonce={expandAll}
                        collapseAllNonce={collapseAll}
                    />
                </div>
            </div>

            {/* Drag Handle */}
            <div
                className="hidden md:flex w-1 bg-transparent cursor-col-resize z-40 items-center justify-center transition-colors shrink-0"
                onMouseDown={startResizing}
            />

            {/* Right Pane - Property Table */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-[#0a0a0a] min-w-[200px]">
                <SlimPropertyTable
                    node={tableData?.node ?? null}
                />
            </div>
        </div>
    );
}

// --- Slim Tree Node ---

interface SlimTreeNodeProps {
    node: TreeNodeSlim;
    path: string;
    initiallyExpanded?: boolean;
    selectedPath: string | null;
    onSelect: (path: string, node: TreeNodeSlim) => void;
    expandAllNonce: number;
    collapseAllNonce: number;
}

const SlimTreeNode: React.FC<SlimTreeNodeProps> = React.memo(({
    node,
    path,
    initiallyExpanded = false,
    selectedPath,
    onSelect,
    expandAllNonce,
    collapseAllNonce,
}) => {
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const [copied, setCopied] = useState(false);

    // Expand/Collapse all effects
    React.useEffect(() => {
        if (expandAllNonce > 0) setExpanded(true);
    }, [expandAllNonce]);

    React.useEffect(() => {
        if (collapseAllNonce > 0) setExpanded(false);
    }, [collapseAllNonce]);

    const isComplex = node.type === "object" || node.type === "array";
    const hasChildren = isComplex && node.children && node.children.length > 0;
    const isSelected = selectedPath === path;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = isComplex
            ? `${node.key}: ${node.type}[${node.childCount}]`
            : `"${node.key}": ${JSON.stringify(node.value)}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(path, node);
    };

    const renderIcon = () => {
        if (node.type === "array") return <span className="text-zinc-500 font-bold px-1 text-[10px]">[]</span>;
        if (node.type === "object") return <span className="text-zinc-500 font-bold px-1 text-[10px]">{"{}"}</span>;
        return <div className="w-1.5 h-1.5 rounded-sm bg-blue-500/50 mx-1" />;
    };

    const renderValue = () => {
        switch (node.type) {
            case "string":
                return <span className="text-red-400">&quot;{String(node.value)}&quot;</span>;
            case "number":
                return <span className="text-blue-400">{String(node.value)}</span>;
            case "boolean":
                return <span className="text-purple-400">{String(node.value)}</span>;
            case "null":
                return <span className="text-zinc-500">null</span>;
            default:
                return null;
        }
    };

    return (
        <div className="font-mono text-xs leading-5 select-none whitespace-nowrap">
            <div
                className={cn(
                    "flex items-center rounded-sm px-1 -ml-1 cursor-pointer transition-colors group border border-transparent min-w-full w-fit",
                    isSelected
                        ? "bg-[#e5f3ff] dark:bg-[#004b91]/30 border-[#cce8ff] dark:border-[#003366]"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                )}
                onClick={handleSelect}
            >
                {/* Expander Icon */}
                <div
                    className="w-4 h-4 mr-0.5 flex items-center justify-center shrink-0 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200 text-zinc-400"
                    onClick={hasChildren ? toggleExpand : undefined}
                >
                    {hasChildren && (
                        expanded ?
                            <div className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800 w-[9px] h-[9px] flex items-center justify-center rounded-[1px] shadow-sm"><span className="text-[7px] leading-none mb-px font-bold text-zinc-600 dark:text-zinc-300">-</span></div> :
                            <div className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800 w-[9px] h-[9px] flex items-center justify-center rounded-[1px] shadow-sm"><span className="text-[7px] leading-none mb-px font-bold text-zinc-600 dark:text-zinc-300">+</span></div>
                    )}
                </div>

                {/* Icon based on type */}
                <div className="mr-1 flex items-center opacity-70">
                    {renderIcon()}
                </div>

                {/* Key Name */}
                <span className="mr-1.5 text-black dark:text-zinc-200 font-medium">
                    {node.key}
                </span>

                {/* Value or Complex Type Info */}
                {isComplex ? (
                    <span className="text-zinc-400 text-[10px]">
                        {node.type === "array" ? `[${node.childCount}]` : `{${node.childCount}}`}
                    </span>
                ) : (
                    <div className="flex items-center gap-1.5 group/value">
                        <span className="text-zinc-400 select-none">:</span>
                        {renderValue()}
                    </div>
                )}

                {/* Truncation indicator */}
                {node.truncated && (
                    <span className="ml-2 text-[10px] text-amber-500 flex items-center gap-0.5" title="Children truncated for performance">
                        <AlertTriangle size={10} />
                        truncated
                    </span>
                )}

                {/* Inline Actions */}
                <button
                    onClick={handleCopy}
                    className="ml-auto sticky right-2 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all shrink-0 backdrop-blur-sm"
                    title="Copy JSON"
                >
                    {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-zinc-400" />}
                </button>
            </div>

            {/* Children */}
            {hasChildren && expanded && (
                <div className="ml-[5px] border-l border-dotted border-zinc-300 dark:border-zinc-700 pl-3">
                    {node.children!.map((child, index) => {
                        const nextPath = node.type === "array"
                            ? `${path}[${index}]`
                            : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(child.key)
                                ? `${path}.${child.key}`
                                : `${path}["${child.key}"]`;
                        return (
                            <SlimTreeNode
                                key={child.key + "-" + index}
                                node={child}
                                path={nextPath}
                                initiallyExpanded={false}
                                selectedPath={selectedPath}
                                onSelect={onSelect}
                                expandAllNonce={expandAllNonce}
                                collapseAllNonce={collapseAllNonce}
                            />
                        );
                    })}
                    {node.truncated && (
                        <div className="text-[10px] text-amber-500 py-1 pl-2 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            {(node.childCount ?? 0) - (node.children?.length ?? 0)} more items not shown
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

SlimTreeNode.displayName = "SlimTreeNode";

// --- Slim Property Table ---

function SlimPropertyTable({ node }: { node: TreeNodeSlim | null }) {
    const entries = useMemo(() => {
        if (!node) return [];
        if (node.type === "object" || node.type === "array") {
            return node.children ?? [];
        }
        return [node];
    }, [node]);

    if (!node) return null;

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-[#050505] border-l border-zinc-200 dark:border-zinc-800 font-sans text-sm">
            {/* Header */}
            <div className="flex items-center px-2 py-1 bg-linear-to-b from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-300 dark:border-zinc-700 h-7 shrink-0" />

            {/* Table Header */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 select-none">
                <div className="flex-1 px-2 py-1 border-r border-zinc-300 dark:border-zinc-700 flex items-center">
                    Name
                </div>
                <div className="flex-2 px-2 py-1 flex items-center">
                    Value
                </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto bg-white dark:bg-[#0a0a0a]">
                <table className="w-full min-w-[300px] border-collapse text-xs">
                    <tbody>
                        {entries.map((child, index) => {
                            const isComplex = child.type === "object" || child.type === "array";
                            const displayVal = isComplex
                                ? `${child.type === "array" ? "Array" : "Object"}[${child.childCount}]`
                                : child.type === "null"
                                    ? "null"
                                    : String(child.value);

                            return (
                                <tr key={child.key + "-" + index} className="even:bg-zinc-50 dark:even:bg-zinc-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 group">
                                    <td className="w-1/3 border-r border-b border-zinc-200 dark:border-zinc-800 px-2 py-1 align-top text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[150px]">
                                        {child.key}
                                    </td>
                                    <td className="w-2/3 border-b border-zinc-200 dark:border-zinc-800 px-2 py-1 align-top text-zinc-600 dark:text-zinc-400 font-mono truncate max-w-[200px]">
                                        <div className="flex items-center justify-between">
                                            <span className={cn(isComplex && "text-zinc-400 italic")}>{displayVal}</span>
                                            <SlimCopyButton value={displayVal} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {entries.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-2 py-4 text-center text-zinc-400 italic">
                                    Empty
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SlimCopyButton({ value }: { value: string }) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="hidden group-hover:block ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            title="Copy Value"
        >
            {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
        </button>
    );
}
