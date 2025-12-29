"use client";

import React, { useState } from "react";
import JsonTreeView, { TreeAction } from "./JsonTreeView";
import PropertyTable from "./PropertyTable";
import { ChevronsDown, ChevronsUp } from "lucide-react";

export default function TreeExplorer({ data }: { data: any }) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [tableData, setTableData] = useState<{
        data: any;
        name?: string;
    } | null>(null);
    const [treeAction, setTreeAction] = useState<TreeAction | null>(null);

    const onSelect = (path: string, nodeData: any, name?: string) => {
        // Always highlight the clicked node in the tree
        setSelectedPath(path);

        // Only update the table if the selected node is an Object or Array
        // This keeps the parent/context visible when clicking leaf nodes
        if (nodeData !== null && typeof nodeData === 'object') {
            setTableData({ data: nodeData, name });
        }
    };

    const handleExpandAll = () => {
        setTreeAction({ type: "EXPAND_ALL", nonce: Date.now() });
    };

    const handleCollapseAll = () => {
        setTreeAction({ type: "COLLAPSE_ALL", nonce: Date.now() });
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-white dark:bg-[#050505] flex-col md:flex-row">
            {/* Left Pane - Tree View */}
            {/* Use 60% width on Desktop as requested */}
            <div className="w-full md:w-[60%] min-w-[300px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto bg-white dark:bg-[#09090b]">
                {/* Header-like top bar to match the Right side if we want symmetry, or just clean */}
                <div className="flex items-center justify-between pl-4 pr-4 py-1 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-300 dark:border-zinc-700 h-11 shrink-0">
                    <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">JSON Structure</span>
                    <div className="flex items-center gap-1 mr-[150px] lg:mr-0">
                        <button
                            onClick={handleExpandAll}
                            className="group relative flex items-center justify-center p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        >
                            <ChevronsDown size={16} />
                            <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                Expand All
                            </span>
                        </button>
                        <button
                            onClick={handleCollapseAll}
                            className="group relative flex items-center justify-center p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        >
                            <ChevronsUp size={16} />
                            <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                Collapse All
                            </span>
                        </button>
                    </div>
                </div>
                <div className="p-2">
                    <JsonTreeView
                        data={data}
                        onSelect={onSelect}
                        selectedPath={selectedPath}
                        treeAction={treeAction}
                    />
                </div>
            </div>

            {/* Right Pane - Property Table */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-[#0a0a0a]">
                <PropertyTable
                    data={tableData?.data}
                    name={tableData?.name}
                />
            </div>
        </div>
    );
}
