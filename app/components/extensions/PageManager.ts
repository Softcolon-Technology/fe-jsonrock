import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * PageManager Extension
 * 
 * Manages automatic page creation and content overflow:
 * 1. Monitors content height within each page
 * 2. When content overflows, moves excess to next page (creates if needed)
 * 3. Code blocks are handled by CSS (max-height + scrollbar) - NOT by this plugin
 */

export interface PageManagerOptions {
    pageHeight: number;
    marginTop: number;
    marginBottom: number;
}

export const PageManager = Extension.create<PageManagerOptions>({
    name: 'pageManager',

    addOptions() {
        return {
            pageHeight: 1123,
            marginTop: 96,
            marginBottom: 96,
        };
    },

    addProseMirrorPlugins() {
        const { pageHeight, marginTop, marginBottom } = this.options;
        const contentHeight = pageHeight - marginTop - marginBottom;
        const pluginKey = new PluginKey('pageManager');

        return [
            new Plugin({
                key: pluginKey,
                view(editorView) {
                    let timeout: ReturnType<typeof setTimeout> | null = null;
                    let isProcessing = false;
                    let operationCount = 0;
                    const MAX_OPERATIONS = 30;

                    const checkOverflow = () => {
                        if (isProcessing || operationCount >= MAX_OPERATIONS) return;
                        isProcessing = true;
                        operationCount++;

                        try {
                            const { state } = editorView;
                            const { doc, schema } = state;

                            // Find all page nodes
                            const pageContentDivs = editorView.dom.querySelectorAll('[data-page-content]');

                            let actionTaken = false;

                            // Check each page for overflow
                            for (let pageIndex = 0; pageIndex < pageContentDivs.length; pageIndex++) {
                                if (actionTaken) break;

                                const pageDiv = pageContentDivs[pageIndex] as HTMLElement;
                                const blocks = pageDiv.children;

                                let accumulatedHeight = 0;
                                let overflowBlockIndex = -1;

                                for (let i = 0; i < blocks.length; i++) {
                                    const block = blocks[i] as HTMLElement;

                                    // For code blocks, use their CSS max-height (they scroll internally)
                                    // Don't count them as overflow - they handle their own scrolling
                                    if (block.tagName === 'PRE') {
                                        // Code blocks have CSS max-height, use offsetHeight (capped by max-height)
                                        accumulatedHeight += block.offsetHeight;
                                    } else {
                                        const blockHeight = block.offsetHeight;
                                        if (accumulatedHeight + blockHeight > contentHeight + 5) {
                                            overflowBlockIndex = i;
                                            break;
                                        }
                                        accumulatedHeight += blockHeight;
                                    }
                                }

                                if (overflowBlockIndex < 0) continue;

                                // Find the page node in document
                                let targetPageNode: any = null;
                                let targetPagePos = 0;
                                let currentPageIndex = 0;

                                doc.forEach((node, offset) => {
                                    if (node.type.name === 'page') {
                                        if (currentPageIndex === pageIndex) {
                                            targetPageNode = node;
                                            targetPagePos = offset;
                                        }
                                        currentPageIndex++;
                                    }
                                });

                                if (!targetPageNode || overflowBlockIndex <= 0) continue;

                                // Calculate document position of the overflowing block
                                let blockPos = targetPagePos + 1;
                                for (let i = 0; i < overflowBlockIndex; i++) {
                                    blockPos += targetPageNode.child(i).nodeSize;
                                }

                                // Collect content to move to next page
                                const contentToMove: any[] = [];
                                for (let i = overflowBlockIndex; i < targetPageNode.childCount; i++) {
                                    contentToMove.push(targetPageNode.child(i));
                                }

                                if (contentToMove.length > 0) {
                                    const tr = state.tr;

                                    // Create new page with moved content
                                    const newPage = schema.nodes.page.create(null, contentToMove);

                                    // Delete moved content from current page
                                    const deleteFrom = blockPos;
                                    const deleteTo = targetPagePos + targetPageNode.nodeSize - 1;
                                    tr.delete(deleteFrom, deleteTo);

                                    // Insert new page
                                    const insertPos = targetPagePos + targetPageNode.nodeSize - (deleteTo - deleteFrom);
                                    tr.insert(insertPos, newPage);

                                    editorView.dispatch(tr);
                                    actionTaken = true;
                                }
                            }

                            // If we took action, schedule another check
                            if (actionTaken) {
                                scheduleCheck(100);
                            } else {
                                operationCount = 0;
                            }
                        } catch (e) {
                            console.error('PageManager error:', e);
                        } finally {
                            isProcessing = false;
                        }
                    };

                    const scheduleCheck = (delay = 150) => {
                        if (timeout) clearTimeout(timeout);
                        timeout = setTimeout(checkOverflow, delay);
                    };

                    // Initial check
                    setTimeout(() => scheduleCheck(500), 500);

                    return {
                        update(view, prevState) {
                            if (!view.state.doc.eq(prevState.doc)) {
                                operationCount = 0;
                                scheduleCheck(100);
                            }
                        },
                        destroy() {
                            if (timeout) clearTimeout(timeout);
                        },
                    };
                },
            }),
        ];
    },
});
