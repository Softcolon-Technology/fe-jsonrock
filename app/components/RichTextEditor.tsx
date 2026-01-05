"use client";

import React, { useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { CharacterCount } from '@tiptap/extension-character-count';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import { Link as TiptapLink } from '@tiptap/extension-link';
import { Image as TiptapImage } from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import { Extension } from '@tiptap/core';
import {
    Bold, Italic, Underline as UnderlineIcon,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered,
    Highlighter, Quote,
    Undo, Redo, Code as CodeIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define FontSize Extension
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle', 'paragraph', 'heading'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace('px', ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}px`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }: any) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }: any) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    readOnly?: boolean;
    remoteContent?: string | null;
    forceLight?: boolean;
}

const ToolbarButton = ({ onClick, isActive, disabled, children, title, forceLight }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "p-1.5 rounded hover:bg-zinc-200 transition-colors flex items-center justify-center min-w-[28px]",
            !forceLight && "dark:hover:bg-zinc-800",
            isActive ?
                cn("bg-zinc-200 text-zinc-900", !forceLight && "dark:bg-zinc-700 dark:text-zinc-100") :
                cn("text-zinc-600", !forceLight && "dark:text-zinc-400"),
            disabled && "opacity-50 cursor-not-allowed"
        )}
    >
        {children}
    </button>
);

const ToolbarDivider = ({ forceLight }: { forceLight?: boolean }) => (
    <div className={cn("w-px h-5 bg-zinc-300 mx-1.5 my-auto shrink-0", !forceLight && "dark:bg-zinc-700")} />
);

const Toolbar = ({ editor, forceLight }: { editor: Editor | null, forceLight?: boolean }) => {
    if (!editor) return null;

    const headingLevel = editor.getAttributes('heading').level;
    const currentHeading = headingLevel ? `h${headingLevel}` : 'p';

    // Normalize font family: strip quotes to ensure robust matching against options
    const rawFont = editor.getAttributes('textStyle').fontFamily || '';
    const currentFont = rawFont.replace(/['"]/g, '');

    // Check both mark and node attributes for font size
    const currentFontSize = editor.getAttributes('textStyle').fontSize ||
        editor.getAttributes('heading').fontSize ||
        editor.getAttributes('paragraph').fontSize ||
        '12';

    return (
        <div className={cn("flex flex-col border-b border-zinc-200 bg-white shrink-0 z-10 sticky top-0", !forceLight && "dark:border-zinc-800 dark:bg-zinc-950")}>
            {/* Primary Toolbar Row */}
            <div className="flex items-center px-2 py-1.5 overflow-x-auto gap-0.5 no-scrollbar">

                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo" forceLight={forceLight}><Undo size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo" forceLight={forceLight}><Redo size={16} /></ToolbarButton>

                <ToolbarDivider forceLight={forceLight} />

                {/* Headings */}
                <select
                    className={cn(
                        "h-7 text-xs border border-zinc-200 rounded bg-transparent px-2 w-28 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer",
                        !forceLight && "dark:border-zinc-700"
                    )}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'p') {
                            editor.chain().focus().setParagraph().unsetMark('textStyle').run();
                        } else if (val.startsWith('h')) {
                            const level = parseInt(val.substring(1));
                            const sizes: Record<number, string> = {
                                1: '32', 2: '24', 3: '18.72', 4: '16', 5: '13.28', 6: '10.72'
                            };
                            editor.chain().focus()
                                .unsetMark('textStyle')
                                .setHeading({ level: level as any, fontSize: sizes[level] } as any)
                                .run();
                        }
                    }}
                    value={currentHeading}
                >
                    <option value="p">Normal text</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="h4">Heading 4</option>
                    <option value="h5">Heading 5</option>
                    <option value="h6">Heading 6</option>
                </select>

                <ToolbarDivider forceLight={forceLight} />

                {/* Fonts */}
                <select
                    className={cn(
                        "h-7 text-xs border border-zinc-200 rounded bg-transparent px-2 w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer",
                        !forceLight && "dark:border-zinc-700"
                    )}
                    onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                    value={currentFont}
                >
                    <option value="">Default</option>
                    <option value="Arial, sans-serif">Arial</option>
                    {/* Using single quotes inside the value string for consistency with CSS font-family syntax */}
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="'Georgia', serif">Georgia</option>
                    <option value="'Verdana', sans-serif">Verdana</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                    <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                </select>

                <ToolbarDivider forceLight={forceLight} />

                {/* Font Size */}
                <select
                    className={cn(
                        "h-7 text-xs border border-zinc-200 rounded bg-transparent px-2 w-16 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer",
                        !forceLight && "dark:border-zinc-700"
                    )}
                    onChange={(e) => {
                        const size = e.target.value;
                        editor.chain().focus().setMark('textStyle', { fontSize: size }).run();

                        // Fix cursor size on empty lines by setting attribute on the node
                        const { empty, $from } = editor.state.selection;
                        const parent = $from.parent;
                        if (empty && parent.content.size === 0 && (parent.type.name === 'paragraph' || parent.type.name === 'heading')) {
                            editor.commands.updateAttributes(parent.type.name, { fontSize: size });
                        }
                    }}
                    value={currentFontSize}
                >
                    <option value="" disabled>Size</option>
                    {[8, 9, 10, 10.72, 11, 12, 13.28, 14, 16, 18, 18.72, 20, 24, 30, 32, 36, 48, 60, 72, 96].map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>

                <ToolbarDivider forceLight={forceLight} />

                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold" forceLight={forceLight}><Bold size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic" forceLight={forceLight}><Italic size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline" forceLight={forceLight}><UnderlineIcon size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Highlight" forceLight={forceLight}><Highlighter size={16} /></ToolbarButton>

                <div className="flex items-center justify-center w-7 h-7 relative group" title="Text Color">
                    <div
                        className={cn("w-4 h-4 rounded border border-zinc-300 pointer-events-none absolute", !forceLight && "dark:border-zinc-600")}
                        style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                    />
                    <input
                        type="color"
                        onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                        value={editor.getAttributes('textStyle').color || '#000000'}
                        className="opacity-0 w-full h-full cursor-pointer absolute inset-0"
                        title="Text Color"
                    />
                </div>

                <ToolbarDivider forceLight={forceLight} />

                <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block" forceLight={forceLight}>
                    <CodeIcon size={16} />
                </ToolbarButton>

                <ToolbarDivider forceLight={forceLight} />

                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left" forceLight={forceLight}><AlignLeft size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center" forceLight={forceLight}><AlignCenter size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right" forceLight={forceLight}><AlignRight size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify" forceLight={forceLight}><AlignJustify size={16} /></ToolbarButton>

                <ToolbarDivider forceLight={forceLight} />

                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List" forceLight={forceLight}><List size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List" forceLight={forceLight}><ListOrdered size={16} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote" forceLight={forceLight}><Quote size={16} /></ToolbarButton>
            </div>
        </div>
    );
};

const StatusBar = ({ editor, forceLight }: { editor: Editor | null, forceLight?: boolean }) => {
    if (!editor) return null;

    return (
        <div className={cn("flex items-center justify-between px-4 py-1.5 border-t border-zinc-200 bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-medium", !forceLight && "dark:border-zinc-800 dark:bg-zinc-900/50")}>
            <div className="flex gap-4">
                <span>Words: {editor.storage.characterCount.words()}</span>
                <span>Characters: {editor.storage.characterCount.characters()}</span>
            </div>
            <div>
                {/* Right aligned status items if needed */}
                Rich Text Mode
            </div>
        </div>
    );
};

const RichTextEditor = ({ content, onChange, readOnly, remoteContent, forceLight }: RichTextEditorProps) => {
    const isRemoteUpdate = React.useRef(false);
    const [, forceUpdate] = React.useState({});

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                bulletList: {
                    HTMLAttributes: {
                        class: 'list-disc list-outside ml-4',
                    },
                },
                orderedList: {
                    HTMLAttributes: {
                        class: 'list-decimal list-outside ml-4',
                    },
                },
                listItem: {
                    HTMLAttributes: {
                        class: 'pl-1',
                    },
                },
                blockquote: {
                    HTMLAttributes: {
                        class: cn('border-l-4 border-zinc-300 pl-4 italic my-4', !forceLight && "dark:border-zinc-700"),
                    },
                },
            }),
            CodeBlock.configure({
                HTMLAttributes: {
                    class: cn('not-prose bg-zinc-100 p-3 rounded-md border border-zinc-200 font-mono text-sm shadow-sm my-2 block whitespace-pre overflow-x-auto', !forceLight && "dark:bg-zinc-800 dark:border-zinc-700"),
                },
            }),
            Underline,
            TextStyle,
            Color,
            FontSize,
            CharacterCount,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            FontFamily,
            Highlight,
            TiptapLink.configure({ openOnClick: false }),
            TiptapImage
        ],
        content: content,
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: cn('prose focus:outline-none max-w-none min-h-[800px] w-full', !forceLight && "dark:prose-invert"),
            },
        },
        onUpdate: ({ editor }) => {
            if (isRemoteUpdate.current) return;
            onChange(editor.getHTML());
        },
        onSelectionUpdate: ({ editor }) => {
            forceUpdate({});
            // Sync cursor size for empty nodes: copy active mark size to node attribute
            const { empty, $from } = editor.state.selection;
            if (empty) {
                const parent = $from.parent;
                if (parent.content.size === 0 && (parent.type.name === 'paragraph' || parent.type.name === 'heading')) {
                    const activeFontSize = editor.getAttributes('textStyle').fontSize;
                    if (activeFontSize && parent.attrs.fontSize !== activeFontSize) {
                        editor.commands.updateAttributes(parent.type.name, { fontSize: activeFontSize });
                    }
                }
            }
        },
        onTransaction: () => forceUpdate({}),
    });

    // Handle Remote Updates
    React.useEffect(() => {
        if (remoteContent && editor) {
            const currentHTML = editor.getHTML();
            if (currentHTML !== remoteContent) {
                isRemoteUpdate.current = true;
                editor.commands.setContent(remoteContent);
                isRemoteUpdate.current = false;
            }
        }
    }, [remoteContent, editor]);

    // Cleanup
    React.useEffect(() => {
        return () => {
            editor?.destroy();
        };
    }, [editor]);

    return (
        <div className={cn("flex flex-col h-full bg-zinc-100", !forceLight && "dark:bg-[#050505]")}>
            <Toolbar editor={editor} forceLight={forceLight} />
            <div
                className="flex-1 overflow-y-auto p-4 lg:p-8 flex justify-center"
                onClick={() => editor?.commands.focus()}
            >
                <div
                    className={cn("w-full max-w-[850px] bg-white shadow-xl border border-zinc-200 min-h-[1000px] p-12 lg:p-16 cursor-text transition-all duration-300", !forceLight && "dark:bg-[#09090b] dark:border-zinc-800/50")}
                    style={{
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.01)'
                    }}
                >
                    <EditorContent editor={editor} />
                </div>
            </div>
            <StatusBar editor={editor} forceLight={forceLight} />
        </div>
    );
};

export default React.memo(RichTextEditor);
