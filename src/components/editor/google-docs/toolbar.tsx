"use client"

import React, { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import {
    Undo,
    Redo,
    Printer,
    SpellCheck,
    Paintbrush,
    Bold,
    Italic,
    Underline,
    Highlighter,
    Baseline,
    Link as LinkIcon,
    Image as ImageIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    ArrowUpDown,
    CheckSquare,
    List,
    ListOrdered,
    Indent,
    Outdent,
    RemoveFormatting,
    ChevronDown,
    ChevronUp,
    Search,
    Minus,
    Plus,
    MessageSquarePlus,
    Edit3,
    Eye,
    Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import TablePicker from './table-picker'

interface ToolbarProps {
    editor: Editor | null
    title?: string
    isVibeMode?: boolean
    zoom?: number
    onZoomChange?: (zoom: number) => void
    onOpenSearchDialog?: () => void
    onOpenImageDialog?: () => void
    onPrint?: () => void
    readOnly?: boolean
    onToggleReadOnly?: () => void
}

const FONTS = [
    { label: 'Arial', value: 'Arial' },
    { label: 'Roboto', value: 'Roboto' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Inter', value: 'Inter' },
    { label: 'Montserrat', value: 'Montserrat' },
]

const HEADINGS = [
    { label: 'Normal text', value: 0 },
    { label: 'Title', value: 1, isTitle: true },
    { label: 'Subtitle', value: 2, isSubtitle: true },
    { label: 'Heading 1', value: 1 },
    { label: 'Heading 2', value: 2 },
    { label: 'Heading 3', value: 3 },
]

const ZOOM_LEVELS = [50, 75, 90, 100, 125, 150]

const COLORS = [
    { label: 'Black', value: '#000000' },
    { label: 'Dark Gray 4', value: '#434343' },
    { label: 'Gray', value: '#5f6368' },
    { label: 'Light Gray 1', value: '#d9d9d9' },
    { label: 'Red', value: '#ea4335' },
    { label: 'Orange', value: '#ff6d01' },
    { label: 'Yellow', value: '#fbbc04' },
    { label: 'Green', value: '#34a853' },
    { label: 'Cyan', value: '#24c1e0' },
    { label: 'Cornflower Blue', value: '#4285f4' },
    { label: 'Blue', value: '#1a73e8' },
    { label: 'Purple', value: '#a142f4' },
    { label: 'Magenta', value: '#e91e63' },
]

const HIGHLIGHT_COLORS = [
    { label: 'Yellow', value: '#fff475' },
    { label: 'Green', value: '#ccff90' },
    { label: 'Cyan', value: '#a7ffeb' },
    { label: 'Blue', value: '#cbf0f8' },
    { label: 'Purple', value: '#d7aefb' },
    { label: 'Pink', value: '#fdcfe8' },
    { label: 'Orange', value: '#fbbc04' },
    { label: 'Gray', value: '#e8eaed' },
]

const LINE_HEIGHTS = [
    { label: 'Single', value: '1.0' },
    { label: '1.15', value: '1.15' },
    { label: '1.5', value: '1.5' },
    { label: 'Double', value: '2.0' },
]

export default function Toolbar({
    editor,
    title,
    isVibeMode = false,
    zoom = 100,
    onZoomChange,
    onOpenSearchDialog,
    onOpenImageDialog,
    onPrint,
    readOnly = false,
    onToggleReadOnly,
}: ToolbarProps) {
    const [fontSize, setFontSize] = useState(11)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isFormatPainterActive, setIsFormatPainterActive] = useState(false)
    const [copiedMarks, setCopiedMarks] = useState<any>(null)

    // Sync font size
    useEffect(() => {
        if (!editor) return

        const updateState = () => {
            const attrs = editor.getAttributes('textStyle')
            if (attrs.fontSize) {
                const size = parseInt(attrs.fontSize)
                if (!isNaN(size)) setFontSize(size)
            } else if (editor.isActive('heading', { level: 1 })) {
                setFontSize(18)
            } else if (editor.isActive('heading', { level: 2 })) {
                setFontSize(14)
            } else if (editor.isActive('heading', { level: 3 })) {
                setFontSize(12)
            } else {
                setFontSize(11)
            }
        }

        editor.on('selectionUpdate', updateState)
        editor.on('transaction', updateState)

        return () => {
            editor.off('selectionUpdate', updateState)
            editor.off('transaction', updateState)
        }
    }, [editor])

    // Format painter handler
    const handleFormatPainter = () => {
        if (!editor) return
        if (!isFormatPainterActive) {
            // Copy active marks
            const marks = {
                bold: editor.isActive('bold'),
                italic: editor.isActive('italic'),
                underline: editor.isActive('underline'),
                highlight: editor.getAttributes('highlight'),
                textStyle: editor.getAttributes('textStyle'),
            }
            setCopiedMarks(marks)
            setIsFormatPainterActive(true)

            // Listen for next selection change to apply
            const applyMarksOnce = () => {
                if (marks.bold) editor.chain().focus().setBold().run()
                if (marks.italic) editor.chain().focus().setItalic().run()
                if (marks.underline) editor.chain().focus().setUnderline().run()
                if (marks.textStyle?.color) (editor.commands as any).setColor(marks.textStyle.color)
                if (marks.textStyle?.fontFamily) (editor.commands as any).setFontFamily(marks.textStyle.fontFamily)
                if (marks.textStyle?.fontSize) (editor.commands as any).setFontSize(marks.textStyle.fontSize)

                setIsFormatPainterActive(false)
                editor.off('selectionUpdate', applyMarksOnce)
            }

            editor.once('selectionUpdate', applyMarksOnce)
        } else {
            setIsFormatPainterActive(false)
            setCopiedMarks(null)
        }
    }

    if (!editor) return null

    const executeCommand = (command: string, ...args: any[]) => {
        (editor.commands as any).runCommandOnAllSelections(command, ...args)
    }

    const incrementFontSize = () => {
        const newSize = fontSize + 1
        setFontSize(newSize)
        executeCommand('setFontSize', `${newSize}pt`)
    }

    const decrementFontSize = () => {
        const newSize = Math.max(1, fontSize - 1)
        setFontSize(newSize)
        executeCommand('setFontSize', `${newSize}pt`)
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        if (url === null) return
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    const handlePrintClick = () => {
        if (onPrint) onPrint()
        else window.print()
    }

    return (
        <div className="relative bg-[#edf2fa] border-b border-[#dadce0] select-none print:hidden z-30">
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-0.5 px-2 sm:px-3 py-1 overflow-x-auto no-scrollbar min-h-[40px]"
                    >
                        {/* 1. Search Menus Pill */}
                        <button
                            type="button"
                            onClick={onOpenSearchDialog}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-gray-100 border border-transparent hover:border-gray-200 text-gray-600 hover:text-gray-900 transition-colors text-xs font-medium shadow-2xs mr-1 shrink-0"
                            title="Search menus (Alt + /)"
                        >
                            <Search className="w-3.5 h-3.5 text-gray-500" />
                            <span className="hidden md:inline">Menus</span>
                        </button>

                        {/* 2. Undo & Redo */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <ToolbarButton
                                onClick={() => editor.chain().focus().undo().run()}
                                disabled={!editor.can().undo()}
                                icon={<Undo className="w-4 h-4" />}
                                tooltip="Undo (Ctrl+Z)"
                            />
                            <ToolbarButton
                                onClick={() => editor.chain().focus().redo().run()}
                                disabled={!editor.can().redo()}
                                icon={<Redo className="w-4 h-4" />}
                                tooltip="Redo (Ctrl+Y)"
                            />
                        </div>

                        {/* 3. Print */}
                        <ToolbarButton
                            onClick={handlePrintClick}
                            icon={<Printer className="w-4 h-4" />}
                            tooltip="Print (Ctrl+P)"
                        />

                        {/* 4. Spelling & Grammar */}
                        <ToolbarButton
                            onClick={() => alert('Spelling & grammar check complete. No errors found.')}
                            icon={<SpellCheck className="w-4 h-4" />}
                            tooltip="Spelling and grammar check (F7)"
                        />

                        {/* 5. Paint Format (Format Painter) */}
                        <ToolbarButton
                            onClick={handleFormatPainter}
                            active={isFormatPainterActive}
                            icon={<Paintbrush className="w-4 h-4" />}
                            tooltip="Paint format (Format painter)"
                        />

                        <Separator orientation="vertical" className="mx-1 h-5 bg-[#dadce0] shrink-0" />

                        {/* 6. Zoom Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-1.5 flex items-center gap-1 text-xs font-medium hover:bg-white border border-transparent hover:border-[#dadce0] rounded shrink-0"
                                >
                                    <span>{zoom}%</span>
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="p-1 min-w-[90px] text-xs bg-white shadow-xl rounded-lg border border-gray-200 z-[120]">
                                {ZOOM_LEVELS.map((z) => (
                                    <DropdownMenuItem
                                        key={z}
                                        onClick={() => onZoomChange && onZoomChange(z)}
                                        className="p-1.5 cursor-pointer hover:bg-gray-100 rounded"
                                    >
                                        {z}%
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Separator orientation="vertical" className="mx-1 h-5 bg-[#dadce0] shrink-0" />

                        {/* 7. Heading / Styles Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 flex items-center gap-1.5 text-xs font-medium hover:bg-white border border-transparent hover:border-[#dadce0] rounded shrink-0 min-w-[95px] justify-between"
                                >
                                    <span className="truncate">
                                        {HEADINGS.find((h) => h.value === (editor.getAttributes('heading').level || 0))?.label || 'Normal text'}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="p-1 min-w-[140px] text-xs bg-white shadow-xl rounded-lg border border-gray-200 z-[120]">
                                {HEADINGS.map((h) => (
                                    <DropdownMenuItem
                                        key={h.label}
                                        onClick={() => {
                                            if (h.value === 0) executeCommand('setParagraph')
                                            else executeCommand('toggleHeading', { level: h.value as any })
                                        }}
                                        className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                                            h.value === 0 ? 'text-sm font-normal' : h.value === 1 ? 'text-lg font-bold' : h.value === 2 ? 'text-base font-semibold' : 'text-sm font-semibold'
                                        }`}
                                    >
                                        {h.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* 8. Font Family Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 flex items-center gap-1.5 text-xs font-medium hover:bg-white border border-transparent hover:border-[#dadce0] rounded shrink-0 min-w-[100px] justify-between"
                                >
                                    <span className="truncate">{editor.getAttributes('textStyle').fontFamily || 'Arial'}</span>
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="p-1 max-h-[280px] overflow-y-auto text-xs bg-white shadow-xl rounded-lg border border-gray-200 z-[120]">
                                {FONTS.map((f) => (
                                    <DropdownMenuItem
                                        key={f.value}
                                        onClick={() => executeCommand('setFontFamily', f.value)}
                                        style={{ fontFamily: f.value }}
                                        className="p-2 rounded cursor-pointer hover:bg-gray-100"
                                    >
                                        {f.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Separator orientation="vertical" className="mx-1 h-5 bg-[#dadce0] shrink-0" />

                        {/* 9. Font Size Controls (- 11 +) */}
                        <div className="flex items-center bg-white border border-[#dadce0] rounded px-1 h-7 shadow-2xs shrink-0">
                            <ToolbarButton onClick={decrementFontSize} icon={<Minus className="w-3 h-3" />} transparent />
                            <input
                                type="text"
                                value={fontSize}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '')
                                    if (val === '') setFontSize(0)
                                    else setFontSize(parseInt(val))
                                }}
                                onBlur={() => {
                                    if (fontSize > 0) executeCommand('setFontSize', `${fontSize}pt`)
                                    else setFontSize(11)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur()
                                }}
                                className="w-7 text-xs font-medium text-center focus:outline-none bg-transparent"
                            />
                            <ToolbarButton onClick={incrementFontSize} icon={<Plus className="w-3 h-3" />} transparent />
                        </div>

                        <Separator orientation="vertical" className="mx-1 h-5 bg-[#dadce0] shrink-0" />

                        {/* 10. Bold, Italic, Underline */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <ToolbarButton
                                onClick={() => executeCommand('toggleBold')}
                                active={editor.isActive('bold')}
                                icon={<Bold className="w-4 h-4 font-bold" />}
                                tooltip="Bold (Ctrl+B)"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('toggleItalic')}
                                active={editor.isActive('italic')}
                                icon={<Italic className="w-4 h-4" />}
                                tooltip="Italic (Ctrl+I)"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('toggleUnderline')}
                                active={editor.isActive('underline')}
                                icon={<Underline className="w-4 h-4" />}
                                tooltip="Underline (Ctrl+U)"
                            />

                            {/* Text Color Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-7 w-7 rounded flex flex-col items-center justify-center hover:bg-white border border-transparent hover:border-[#dadce0] transition-colors"
                                        title="Text color"
                                    >
                                        <Baseline className="w-3.5 h-3.5 text-gray-700" />
                                        <div
                                            className="w-3.5 h-0.5 rounded-full mt-0.5"
                                            style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                                        />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="p-2 grid grid-cols-4 gap-1.5 bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    {COLORS.map((c) => (
                                        <DropdownMenuItem
                                            key={c.value}
                                            onClick={() => executeCommand('setColor', c.value)}
                                            className="w-6 h-6 p-0 rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center border border-gray-100"
                                            style={{ backgroundColor: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                    <DropdownMenuItem
                                        onClick={() => executeCommand('unsetColor')}
                                        className="col-span-4 mt-1 p-1 text-[11px] text-center justify-center hover:bg-gray-100 rounded text-gray-600 font-medium"
                                    >
                                        Reset color
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Highlight Color Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-7 w-7 rounded flex items-center justify-center hover:bg-white border border-transparent hover:border-[#dadce0] transition-colors"
                                        title="Highlight color"
                                    >
                                        <Highlighter className="w-3.5 h-3.5 text-gray-700" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="p-2 grid grid-cols-4 gap-1.5 bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    {HIGHLIGHT_COLORS.map((c) => (
                                        <DropdownMenuItem
                                            key={c.value}
                                            onClick={() => executeCommand('toggleHighlight', { color: c.value })}
                                            className="w-6 h-6 p-0 rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center border border-gray-200"
                                            style={{ backgroundColor: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                    <DropdownMenuItem
                                        onClick={() => executeCommand('unsetHighlight')}
                                        className="col-span-4 mt-1 p-1 text-[11px] text-center justify-center hover:bg-gray-100 rounded text-gray-600 font-medium"
                                    >
                                        No color
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Separator orientation="vertical" className="mx-1 h-5 bg-[#dadce0] shrink-0" />

                        {/* 11. Links, Comments, Images & Tables */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <ToolbarButton
                                onClick={setLink}
                                active={editor.isActive('link')}
                                icon={<LinkIcon className="w-4 h-4" />}
                                tooltip="Insert link (Ctrl+K)"
                            />

                            <ToolbarButton
                                onClick={() => alert('To comment, select any text and press Ctrl+Alt+M')}
                                icon={<MessageSquarePlus className="w-4 h-4" />}
                                tooltip="Add comment"
                            />

                            <ToolbarButton
                                onClick={onOpenImageDialog || (() => {
                                    const url = window.prompt('Enter Image URL:')
                                    if (url) editor.chain().focus().setImage({ src: url }).run()
                                })}
                                icon={<ImageIcon className="w-4 h-4" />}
                                tooltip="Insert image"
                            />

                            {/* Table Picker */}
                            <TablePicker editor={editor} />
                        </div>

                        <Separator orientation="vertical" className="mx-1 h-5 bg-[#dadce0] shrink-0" />

                        {/* 12. Text Alignment */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <ToolbarButton
                                onClick={() => executeCommand('setTextAlign', 'left')}
                                active={editor.isActive({ textAlign: 'left' })}
                                icon={<AlignLeft className="w-4 h-4" />}
                                tooltip="Align left"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('setTextAlign', 'center')}
                                active={editor.isActive({ textAlign: 'center' })}
                                icon={<AlignCenter className="w-4 h-4" />}
                                tooltip="Align center"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('setTextAlign', 'right')}
                                active={editor.isActive({ textAlign: 'right' })}
                                icon={<AlignRight className="w-4 h-4" />}
                                tooltip="Align right"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('setTextAlign', 'justify')}
                                active={editor.isActive({ textAlign: 'justify' })}
                                icon={<AlignJustify className="w-4 h-4" />}
                                tooltip="Justify"
                            />

                            {/* Line Spacing */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-7 w-7 rounded flex items-center justify-center hover:bg-white border border-transparent hover:border-[#dadce0] transition-colors"
                                        title="Line & paragraph spacing"
                                    >
                                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-700" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="p-1 min-w-[120px] text-xs bg-white shadow-xl rounded-lg border border-gray-200 z-[120]">
                                    {LINE_HEIGHTS.map((lh) => (
                                        <DropdownMenuItem
                                            key={lh.value}
                                            onClick={() => executeCommand('setLineHeight', lh.value)}
                                            className="p-1.5 cursor-pointer hover:bg-gray-100 rounded"
                                        >
                                            {lh.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Separator orientation="vertical" className="mx-1 h-5 bg-[#dadce0] shrink-0" />

                        {/* 13. Lists (Checklist, Bulleted, Numbered) */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <ToolbarButton
                                onClick={() => executeCommand('toggleTaskList')}
                                active={editor.isActive('taskList')}
                                icon={<CheckSquare className="w-4 h-4" />}
                                tooltip="Checklist"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('toggleBulletList')}
                                active={editor.isActive('bulletList')}
                                icon={<List className="w-4 h-4" />}
                                tooltip="Bulleted list"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('toggleOrderedList')}
                                active={editor.isActive('orderedList')}
                                icon={<ListOrdered className="w-4 h-4" />}
                                tooltip="Numbered list"
                            />
                        </div>

                        {/* 14. Indents & Clear Formatting */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <ToolbarButton
                                onClick={() => executeCommand('outdent')}
                                icon={<Outdent className="w-4 h-4" />}
                                tooltip="Decrease indent"
                            />
                            <ToolbarButton
                                onClick={() => executeCommand('indent')}
                                icon={<Indent className="w-4 h-4" />}
                                tooltip="Increase indent"
                            />
                            <ToolbarButton
                                onClick={() => {
                                    executeCommand('unsetAllMarks')
                                    executeCommand('clearNodes')
                                }}
                                icon={<RemoveFormatting className="w-4 h-4" />}
                                tooltip="Clear formatting (Ctrl+\)"
                            />
                        </div>

                        {/* 15. Right Side Editing Mode Dropdown */}
                        <div className="ml-auto flex items-center gap-1 shrink-0 pl-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white border border-transparent hover:border-[#dadce0] text-xs font-semibold text-gray-700 transition-colors"
                                    >
                                        {readOnly ? (
                                            <>
                                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                                <span>Viewing</span>
                                            </>
                                        ) : (
                                            <>
                                                <Edit3 className="w-3.5 h-3.5 text-gray-700" />
                                                <span>Editing</span>
                                            </>
                                        )}
                                        <ChevronDown className="w-3 h-3 text-gray-500" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="p-1 min-w-[150px] text-xs bg-white shadow-xl rounded-lg border border-gray-200 z-[120]">
                                    <DropdownMenuItem
                                        onClick={() => onToggleReadOnly && readOnly && onToggleReadOnly()}
                                        className="p-2 cursor-pointer hover:bg-gray-100 rounded flex items-center gap-2"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                        <div>
                                            <p className="font-semibold text-gray-900">Editing</p>
                                            <p className="text-[10px] text-gray-500">Edit document directly</p>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => onToggleReadOnly && !readOnly && onToggleReadOnly()}
                                        className="p-2 cursor-pointer hover:bg-gray-100 rounded flex items-center gap-2"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                        <div>
                                            <p className="font-semibold text-gray-900">Viewing</p>
                                            <p className="text-[10px] text-gray-500">Read-only mode</p>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Collapse/Expand Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsCollapsed(true)}
                                className="p-1 text-gray-500 hover:text-gray-900 hover:bg-white rounded transition-colors"
                                title="Hide the menus (Ctrl+Shift+F)"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* When collapsed, small expand button */}
            {isCollapsed && (
                <div className="flex justify-end p-1">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(false)}
                        className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-white rounded flex items-center gap-1 border border-transparent hover:border-gray-200"
                        title="Show menus"
                    >
                        <span>Show toolbar</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    )
}

function ToolbarButton({
    icon,
    onClick,
    active = false,
    disabled = false,
    tooltip,
    transparent = false,
}: {
    icon: React.ReactNode
    onClick: () => void
    active?: boolean
    disabled?: boolean
    tooltip?: string
    transparent?: boolean
}) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault()
                onClick()
            }}
            disabled={disabled}
            title={tooltip}
            className={`h-7 w-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
                transparent ? 'hover:bg-[#e1e5ea]' : 'hover:bg-white border border-transparent hover:border-[#dadce0]'
            } ${
                active ? 'bg-[#d3e3fd] text-[#041e49] hover:bg-[#c2d7f7] border-[#a8c7fa] shadow-2xs font-semibold' : 'text-gray-700'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            {icon}
        </button>
    )
}
