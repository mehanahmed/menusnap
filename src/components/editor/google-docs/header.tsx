"use client"

import React, { useState, useRef, useEffect } from 'react'
import {
    FileText,
    Star,
    Share2,
    Edit3,
    Cloud,
    Folder,
    Clock,
    Check,
    Lock,
    X,
    Eye,
    ChevronDown,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    ArrowUpDown,
    Columns3,
    List,
    ListOrdered,
    CheckSquare,
    PanelTop,
    Hash,
    RotateCw,
    Scan,
    Table as TableIcon,
    Image as ImageIcon,
    Minus,
    RemoveFormatting,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Editor } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import TablePicker from './table-picker'

interface HeaderProps {
    title: string
    onTitleChange: (title: string) => void
    isSaving?: boolean
    readOnly?: boolean
    docId?: string
    onlineUsers?: any[]
    isConnected?: boolean
    customActions?: React.ReactNode
    onShare?: (mode: 'editor' | 'viewer') => void
    editorMode?: 'google-docs' | 'summernote'
    onModeChange?: (mode: 'google-docs' | 'summernote') => void
    editor?: Editor | null
    onOpenDialog?: (dialogName: 'wordcount' | 'pagesetup' | 'shortcuts' | 'image' | 'findreplace' | 'pagenumbers') => void
    isPageless?: boolean
    onTogglePageless?: () => void
    orientation?: 'portrait' | 'landscape'
    onToggleOrientation?: () => void
    columnCount?: number
    onColumnCountChange?: (count: number) => void
    onDownloadDocx?: () => void
    onDownloadPdf?: () => void
    onDownloadTxt?: () => void
    onDownloadHtml?: () => void
    onToggleRuler?: () => void
    isRulerVisible?: boolean
    onToggleOutline?: () => void
    isOutlineVisible?: boolean
}

export default function Header({
    title,
    onTitleChange,
    isSaving = false,
    readOnly = false,
    docId,
    onlineUsers = [],
    isConnected = false,
    customActions,
    onShare,
    editorMode = 'google-docs',
    onModeChange,
    editor,
    onOpenDialog,
    onDownloadDocx,
    onDownloadPdf,
    onDownloadTxt,
    onDownloadHtml,
    onToggleRuler,
    isRulerVisible = true,
    onToggleOutline,
    isOutlineVisible = false,
    isPageless = false,
    onTogglePageless,
    orientation = 'portrait',
    onToggleOrientation,
    columnCount = 1,
    onColumnCountChange,
}: HeaderProps) {
    const [isStarred, setIsStarred] = useState(false)
    const [showShareMenu, setShowShareMenu] = useState(false)
    const [copiedType, setCopiedType] = useState<'editor' | 'viewer' | null>(null)
    const [isListening, setIsListening] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close share menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowShareMenu(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const copyLink = (type: 'editor' | 'viewer') => {
        if (onShare) {
            onShare(type)
            setCopiedType(type)
            setTimeout(() => setCopiedType(null), 2000)
            return
        }
        if (!docId) return
        const path = type === 'editor' ? `/docs/edit/${docId}` : `/docs/view/${docId}`
        const url = `${window.location.origin}${path}`
        navigator.clipboard.writeText(url).then(() => {
            setCopiedType(type)
            setTimeout(() => setCopiedType(null), 2000)
        })
    }

    // Voice typing using Web Speech API
    const handleVoiceTyping = () => {
        if (typeof window === 'undefined') return
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert('Voice typing is not supported in this browser. Please use Chrome or Edge.')
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        if (!isListening) {
            recognition.start()
            setIsListening(true)
            recognition.onresult = (event: any) => {
                const current = event.resultIndex
                const transcript = event.results[current][0].transcript
                if (event.results[current].isFinal && editor) {
                    editor.chain().focus().insertContent(` ${transcript} `).run()
                }
            }
            recognition.onerror = () => setIsListening(false)
            recognition.onend = () => setIsListening(false)
        } else {
            recognition.stop()
            setIsListening(false)
        }
    }


    const changeFontSize = (delta: number) => {
        if (!editor) return
        const current = parseInt(editor.getAttributes('textStyle').fontSize || '11') || 11
        const next = Math.max(6, Math.min(96, current + delta))
        ;(editor.commands as any).setFontSize?.(`${next}pt`)
    }

    const transformSelectedText = (transform: (text: string) => string) => {
        if (!editor) return
        const { from, to } = editor.state.selection
        if (from === to) return
        const text = editor.state.doc.textBetween(from, to)
        editor.chain().focus().insertContentAt({ from, to }, transform(text)).run()
    }

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {})
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {})
            }
        }
    }

    return (
        <header className="flex flex-col bg-[#f9fbfd] border-b border-[#dadce0] z-40 select-none print:hidden">
            {/* Top Bar: Doc Icon, Title, Action Icons, and Profile/Share */}
            <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Blue Docs Icon */}
                    <div className="p-1 cursor-pointer hover:bg-gray-100 rounded-full transition-colors shrink-0">
                        <div className="bg-[#4285f4] p-1.5 rounded-sm shadow-xs relative">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                        {/* Title Row + Star + Move + Cloud Save */}
                        <div className="flex items-center gap-1.5">
                            {readOnly ? (
                                <span className="text-base sm:text-lg font-medium px-1 rounded font-sans cursor-default truncate max-w-[300px] sm:max-w-[450px]">
                                    {title}
                                </span>
                            ) : (
                                <input
                                    className="text-base sm:text-lg font-normal text-gray-800 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[#4285f4] px-1.5 py-0.5 rounded hover:bg-gray-100 transition-all font-sans truncate"
                                    value={title}
                                    onChange={(e) => onTitleChange(e.target.value)}
                                    maxLength={104}
                                    style={{ width: `${Math.min(Math.max(title.length, 6) + 1, 45)}ch`, maxWidth: '450px' }}
                                />
                            )}

                            {/* Star Icon */}
                            <button
                                type="button"
                                onClick={() => setIsStarred(!isStarred)}
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                                title={isStarred ? 'Starred' : 'Star'}
                            >
                                <Star
                                    className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`}
                                />
                            </button>

                            {/* Move / Folder Icon */}
                            <button
                                type="button"
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors hidden sm:inline-flex"
                                title="Move to folder"
                            >
                                <Folder className="w-4 h-4" />
                            </button>

                            {/* Cloud Save Status Icon */}
                            <div
                                className="flex items-center gap-1 text-gray-500 p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                title={isSaving ? 'Saving to cloud...' : isConnected ? 'Document saved to cloud' : 'Offline'}
                            >
                                <Cloud className={`w-4 h-4 ${isSaving ? 'animate-pulse text-amber-500' : 'text-gray-500'}`} />
                                {!isSaving && <Check className="w-2.5 h-2.5 -ml-2 -mt-1 text-emerald-600 stroke-[3]" />}
                            </div>
                        </div>

                        {/* ======================================================== */}
                        {/* Menubar (File, Edit, View, Insert, Format, Tools, Help)  */}
                        {/* ======================================================== */}
                        <div className="flex items-center gap-0.5 -ml-1 text-[13px] font-normal text-[#202124] overflow-x-auto no-scrollbar">
                            {/* 1. FILE MENU */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-0.5 rounded-sm hover:bg-gray-200/80 transition-colors cursor-pointer">
                                        File
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[220px] p-1.5 text-xs bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    <DropdownMenuItem onClick={() => window.open('/docs/edit/new', '_blank')} className="cursor-pointer">
                                        New document
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.open('/m-admin/magic-docs', '_self')} className="cursor-pointer">
                                        Open document...
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onTitleChange(`${title} (Copy)`)} className="cursor-pointer">
                                        Make a copy
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer">Download</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[180px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={onDownloadPdf || (() => window.print())} className="cursor-pointer font-medium">
                                                PDF Document (.pdf)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={onDownloadDocx} className="cursor-pointer">
                                                Microsoft Word (.docx)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={onDownloadTxt} className="cursor-pointer">
                                                Plain Text (.txt)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={onDownloadHtml} className="cursor-pointer">
                                                Web Page (.html)
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('pagesetup')} className="cursor-pointer">
                                        Page setup
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.print()} className="cursor-pointer flex justify-between">
                                        <span>Print</span>
                                        <span className="text-gray-400 font-mono">Ctrl+P</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 2. EDIT MENU */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-0.5 rounded-sm hover:bg-gray-200/80 transition-colors cursor-pointer">
                                        Edit
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[220px] p-1.5 text-xs bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    <DropdownMenuItem onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="cursor-pointer flex justify-between">
                                        <span>Undo</span>
                                        <span className="text-gray-400 font-mono">Ctrl+Z</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="cursor-pointer flex justify-between">
                                        <span>Redo</span>
                                        <span className="text-gray-400 font-mono">Ctrl+Y</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => document.execCommand('copy')} className="cursor-pointer flex justify-between">
                                        <span>Copy</span>
                                        <span className="text-gray-400 font-mono">Ctrl+C</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor?.chain().focus().selectAll().run()} className="cursor-pointer flex justify-between">
                                        <span>Select all</span>
                                        <span className="text-gray-400 font-mono">Ctrl+A</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('findreplace')} className="cursor-pointer flex justify-between">
                                        <span>Find and replace</span>
                                        <span className="text-gray-400 font-mono">Ctrl+H</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 3. VIEW MENU */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-0.5 rounded-sm hover:bg-gray-200/80 transition-colors cursor-pointer">
                                        View
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[220px] p-1.5 text-xs bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    <DropdownMenuItem onClick={onToggleRuler} className="cursor-pointer flex items-center justify-between">
                                        <span>Show ruler</span>
                                        {isRulerVisible && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onToggleOutline} className="cursor-pointer flex items-center justify-between">
                                        <span>Show document outline</span>
                                        {isOutlineVisible && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={toggleFullScreen} className="cursor-pointer">
                                        Full screen
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 4. INSERT MENU */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-0.5 rounded-sm hover:bg-gray-200/80 transition-colors cursor-pointer">
                                        Insert
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[220px] p-1.5 text-xs bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('image')} className="cursor-pointer">
                                        Image...
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer">Table</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="p-2 bg-white shadow-xl rounded-lg border border-gray-200">
                                            <TablePicker editor={editor || null}>
                                                <div className="cursor-pointer p-2 hover:bg-blue-50 rounded text-xs text-blue-600 font-semibold">
                                                    Open Interactive Table Grid...
                                                </div>
                                            </TablePicker>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="cursor-pointer">
                                        Horizontal line
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor?.chain().focus().setHardBreak().run()} className="cursor-pointer flex justify-between">
                                        <span>Page break</span>
                                        <span className="text-gray-400 font-mono">Ctrl+Enter</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('pagenumbers')} className="cursor-pointer flex items-center gap-2">
                                        <Hash className="w-3.5 h-3.5 text-gray-500" />
                                        <span>Page numbers...</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const url = window.prompt('Enter Link URL:')
                                            if (url && editor) editor.chain().focus().setLink({ href: url }).run()
                                        }}
                                        className="cursor-pointer flex justify-between"
                                    >
                                        <span>Link</span>
                                        <span className="text-gray-400 font-mono">Ctrl+K</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 5. FORMAT MENU */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-0.5 rounded-sm hover:bg-gray-200/80 transition-colors cursor-pointer">
                                        Format
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[240px] p-1.5 text-xs bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    {/* 1. Text */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <Bold className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Text</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[200px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.runCommandOnAllSelections('toggleBold')} className="cursor-pointer flex justify-between items-center">
                                                <span className="font-bold">Bold</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+B</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.runCommandOnAllSelections('toggleItalic')} className="cursor-pointer flex justify-between items-center">
                                                <span className="italic">Italic</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+I</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.runCommandOnAllSelections('toggleUnderline')} className="cursor-pointer flex justify-between items-center">
                                                <span className="underline">Underline</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+U</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleStrike().run()} className="cursor-pointer flex justify-between items-center">
                                                <span className="line-through">Strikethrough</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Alt+Shift+5</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.toggleSubscript?.()} className="cursor-pointer flex justify-between items-center">
                                                <span>Subscript</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+,</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.toggleSuperscript?.()} className="cursor-pointer flex justify-between items-center">
                                                <span>Superscript</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+.</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className="cursor-pointer">Size</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="min-w-[180px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                                    <DropdownMenuItem onClick={() => changeFontSize(1)} className="cursor-pointer flex justify-between items-center">
                                                        <span>Increase font size</span>
                                                        <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+.</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => changeFontSize(-1)} className="cursor-pointer flex justify-between items-center">
                                                        <span>Decrease font size</span>
                                                        <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+,</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className="cursor-pointer">Capitalization</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="min-w-[140px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                                    <DropdownMenuItem onClick={() => transformSelectedText(t => t.toLowerCase())} className="cursor-pointer">
                                                        lowercase
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => transformSelectedText(t => t.toUpperCase())} className="cursor-pointer uppercase">
                                                        UPPERCASE
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => transformSelectedText(t => t.replace(/\b\w/g, c => c.toUpperCase()))} className="cursor-pointer">
                                                        Title Case
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* 2. Paragraph styles */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <AlignLeft className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Paragraph styles</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[180px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().setParagraph().run()} className="cursor-pointer">
                                                Normal text
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className="cursor-pointer font-bold text-base">
                                                Title
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="cursor-pointer font-medium text-gray-600">
                                                Subtitle
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className="cursor-pointer font-bold text-base">
                                                Heading 1
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="cursor-pointer font-bold text-sm">
                                                Heading 2
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="cursor-pointer font-bold text-xs">
                                                Heading 3
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} className="cursor-pointer text-gray-500">
                                                Reset styles
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* 3. Align and indent */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <AlignLeft className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Align and indent</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[180px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setTextAlign('left')} className="cursor-pointer flex justify-between items-center">
                                                <span>Left</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+L</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setTextAlign('center')} className="cursor-pointer flex justify-between items-center">
                                                <span>Center</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+E</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setTextAlign('right')} className="cursor-pointer flex justify-between items-center">
                                                <span>Right</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+R</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setTextAlign('justify')} className="cursor-pointer flex justify-between items-center">
                                                <span>Justified</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+J</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.sinkListItem?.('listItem')} className="cursor-pointer flex justify-between items-center">
                                                <span>Increase indent</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+]</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.liftListItem?.('listItem')} className="cursor-pointer flex justify-between items-center">
                                                <span>Decrease indent</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+[</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onOpenDialog?.('pagesetup')} className="cursor-pointer">
                                                Indentation options...
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* 4. Line & paragraph spacing */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <ArrowUpDown className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Line & paragraph spacing</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[180px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setLineHeight('1.0')} className="cursor-pointer">
                                                Single
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setLineHeight('1.15')} className="cursor-pointer">
                                                1.15
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setLineHeight('1.5')} className="cursor-pointer">
                                                1.5
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setLineHeight('2.0')} className="cursor-pointer">
                                                Double
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setLineHeight('1.3')} className="cursor-pointer">
                                                Add space before paragraph
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => (editor?.commands as any)?.setLineHeight('1.3')} className="cursor-pointer">
                                                Add space after paragraph
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onOpenDialog?.('pagesetup')} className="cursor-pointer">
                                                Custom spacing...
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* 5. Columns */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <Columns3 className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Columns</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[150px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => onColumnCountChange?.(1)} className="cursor-pointer flex items-center justify-between">
                                                <span>1 column</span>
                                                {(!columnCount || columnCount === 1) && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onColumnCountChange?.(2)} className="cursor-pointer flex items-center justify-between">
                                                <span>2 columns</span>
                                                {columnCount === 2 && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onColumnCountChange?.(3)} className="cursor-pointer flex items-center justify-between">
                                                <span>3 columns</span>
                                                {columnCount === 3 && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* 6. Bullets and numbering */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <List className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Bullets and numbering</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[180px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="cursor-pointer flex justify-between items-center">
                                                <span>Numbered list</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+7</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleBulletList().run()} className="cursor-pointer flex justify-between items-center">
                                                <span>Bulleted list</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+8</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleTaskList().run()} className="cursor-pointer flex justify-between items-center">
                                                <span>Checklist</span>
                                                <span className="text-gray-400 font-mono text-[11px]">Ctrl+Shift+9</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />

                                    {/* 7. Headers and footers */}
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('pagenumbers')} className="cursor-pointer flex items-center gap-2">
                                        <PanelTop className="w-3.5 h-3.5 text-gray-700" />
                                        <span>Headers and footers</span>
                                    </DropdownMenuItem>

                                    {/* 8. Page numbers */}
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('pagenumbers')} className="cursor-pointer flex items-center gap-2">
                                        <Hash className="w-3.5 h-3.5 text-gray-700" />
                                        <span>Page numbers</span>
                                    </DropdownMenuItem>

                                    {/* 9. Page orientation */}
                                    <DropdownMenuItem onClick={onToggleOrientation || (() => onOpenDialog?.('pagesetup'))} className="cursor-pointer flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <RotateCw className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Page orientation</span>
                                        </div>
                                        <span className="text-gray-400 text-[11px] capitalize">{orientation || 'Portrait'}</span>
                                    </DropdownMenuItem>

                                    {/* 10. Switch to pageless format */}
                                    <DropdownMenuItem onClick={onTogglePageless} className="cursor-pointer flex items-center gap-2">
                                        <Scan className="w-3.5 h-3.5 text-gray-700" />
                                        <span>{isPageless ? 'Switch to pages format' : 'Switch to pageless format'}</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    {/* 11. Table */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <TableIcon className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Table</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[190px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().addRowBefore().run()} className="cursor-pointer">
                                                Insert row above
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().addRowAfter().run()} className="cursor-pointer">
                                                Insert row below
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().addColumnBefore().run()} className="cursor-pointer">
                                                Insert column left
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().addColumnAfter().run()} className="cursor-pointer">
                                                Insert column right
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().deleteRow().run()} className="cursor-pointer text-red-600">
                                                Delete row
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().deleteColumn().run()} className="cursor-pointer text-red-600">
                                                Delete column
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().deleteTable().run()} className="cursor-pointer text-red-600 font-medium">
                                                Delete table
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().mergeCells().run()} className="cursor-pointer">
                                                Merge cells
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().splitCell().run()} className="cursor-pointer">
                                                Split cell
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* 12. Image */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <ImageIcon className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Image</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[160px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => onOpenDialog?.('image')} className="cursor-pointer">
                                                Image options...
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onOpenDialog?.('image')} className="cursor-pointer">
                                                Replace image...
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* 13. Borders and lines */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2">
                                            <Minus className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Borders and lines</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="min-w-[170px] p-1 text-xs bg-white shadow-xl rounded-lg border border-gray-200">
                                            <DropdownMenuItem onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="cursor-pointer">
                                                Horizontal line
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onOpenDialog?.('pagesetup')} className="cursor-pointer">
                                                Border styling...
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />

                                    {/* 14. Clear formatting */}
                                    <DropdownMenuItem onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} className="cursor-pointer flex justify-between items-center font-medium">
                                        <div className="flex items-center gap-2">
                                            <RemoveFormatting className="w-3.5 h-3.5 text-gray-700" />
                                            <span>Clear formatting</span>
                                        </div>
                                        <span className="text-gray-400 font-mono text-[11px]">Ctrl+\</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 6. TOOLS MENU */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-0.5 rounded-sm hover:bg-gray-200/80 transition-colors cursor-pointer">
                                        Tools
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[220px] p-1.5 text-xs bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('wordcount')} className="cursor-pointer flex justify-between">
                                        <span>Word count</span>
                                        <span className="text-gray-400 font-mono">Ctrl+Shift+C</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleVoiceTyping} className="cursor-pointer flex items-center justify-between">
                                        <span>Voice typing {isListening ? '(Listening...)' : ''}</span>
                                        <span className="text-gray-400 font-mono">Ctrl+Shift+S</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 7. HELP MENU */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="px-2 py-0.5 rounded-sm hover:bg-gray-200/80 transition-colors cursor-pointer">
                                        Help
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="min-w-[200px] p-1.5 text-xs bg-white shadow-xl rounded-xl border border-gray-200 z-[120]">
                                    <DropdownMenuItem onClick={() => onOpenDialog?.('shortcuts')} className="cursor-pointer flex justify-between">
                                        <span>Keyboard shortcuts</span>
                                        <span className="text-gray-400 font-mono">Ctrl+/</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Right Actions: Editor Mode Toggle, Version History, Comments, Share & User Avatar */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {onModeChange && !readOnly && (
                        <div className="hidden md:flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-medium border border-slate-300/60 shadow-inner">
                            <button
                                type="button"
                                onClick={() => onModeChange('google-docs')}
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                    editorMode === 'google-docs' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Google Docs
                            </button>
                            <button
                                type="button"
                                onClick={() => onModeChange('summernote')}
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                    editorMode === 'summernote' ? 'bg-white text-amber-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Summernote
                            </button>
                        </div>
                    )}

                    {customActions}

                    {/* Version History Button */}
                    <button
                        type="button"
                        onClick={() => alert(`Document History: Last updated at ${new Date().toLocaleTimeString()}`)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors hidden sm:inline-flex"
                        title="Version history"
                    >
                        <Clock className="w-4 h-4" />
                    </button>

                    

                    {/* Online Live Presence Avatars */}
                    {onlineUsers.length > 0 && (
                        <div className="flex -space-x-2 mr-1">
                            {onlineUsers.map((u, i) => (
                                <div
                                    key={i}
                                    className="w-7 h-7 rounded-full border-2 border-white overflow-hidden shadow-xs cursor-pointer"
                                    title={u.name}
                                >
                                    <img
                                        src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${u.name}&backgroundColor=${u.color?.replace('#', '') || '4285f4'}`}
                                        alt={u.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Blue Pill Share Button matching Google Docs */}
                    <div className="relative" ref={dropdownRef}>
                        <Button
                            onClick={() => setShowShareMenu((prev) => !prev)}
                            className="bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3d7ef] gap-1.5 rounded-full px-4 h-9 font-semibold text-xs sm:text-sm shadow-none transition-all duration-200 cursor-pointer"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Share</span>
                            <ChevronDown className="w-3 h-3 ml-0.5" />
                        </Button>

                        <AnimatePresence>
                            {showShareMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[130]"
                                >
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                        <span className="text-xs font-semibold text-gray-800">Share document</span>
                                        <button onClick={() => setShowShareMenu(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => copyLink('editor')}
                                        disabled={!docId}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors text-left"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                            <Edit3 className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800">Share as Editor</p>
                                            <p className="text-[10px] text-gray-500">Anyone with link can edit</p>
                                        </div>
                                        {copiedType === 'editor' && <Check className="w-4 h-4 text-emerald-600" />}
                                    </button>

                                    <button
                                        onClick={() => copyLink('viewer')}
                                        disabled={!docId}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors text-left border-t border-gray-50"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Eye className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800">Share as Viewer</p>
                                            <p className="text-[10px] text-gray-500">Read-only link</p>
                                        </div>
                                        {copiedType === 'viewer' && <Check className="w-4 h-4 text-emerald-600" />}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>



                    {/* User Profile Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer ring-2 ring-white">
                        <span>A</span>
                    </div>
                </div>
            </div>
        </header>
    )
}
