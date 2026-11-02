"use client"

import React, { useEffect, useState } from 'react'
import { Editor } from '@tiptap/react'
import { FileText, Plus, MoreVertical, ChevronLeft, ChevronRight, Pencil, Copy, Trash2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface DocumentTab {
    id: string
    title: string
    content: string
}

interface OutlineItem {
    id: string
    text: string
    level: number
    pos: number
}

interface OutlineSidebarProps {
    editor: Editor | null
    isOpen: boolean
    onToggle: () => void
    documentTitle?: string
    tabs?: DocumentTab[]
    activeTabId?: string
    onSelectTab?: (tabId: string) => void
    onAddTab?: () => void
    onRenameTab?: (tabId: string, newTitle: string) => void
    onDuplicateTab?: (tabId: string) => void
    onDeleteTab?: (tabId: string) => void
}

export default function OutlineSidebar({
    editor,
    isOpen,
    onToggle,
    documentTitle = 'Tab 1',
    tabs = [],
    activeTabId,
    onSelectTab,
    onAddTab,
    onRenameTab,
    onDuplicateTab,
    onDeleteTab,
}: OutlineSidebarProps) {
    const [headings, setHeadings] = useState<OutlineItem[]>([])
    const [editingTabId, setEditingTabId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState('')

    // Effective tabs list (fall back to a single tab if tabs prop is empty)
    const effectiveTabs: DocumentTab[] = tabs.length > 0 ? tabs : [
        { id: 'tab-1', title: documentTitle || 'Tab 1', content: '' }
    ]
    const currentActiveId = activeTabId || effectiveTabs[0].id

    // Parse headings from the active TipTap editor document
    useEffect(() => {
        if (!editor) return

        const extractHeadings = () => {
            const items: OutlineItem[] = []
            const { doc } = editor.state

            doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    const text = node.textContent.trim()
                    if (text) {
                        items.push({
                            id: `heading-${pos}`,
                            text,
                            level: node.attrs.level || 1,
                            pos,
                        })
                    }
                }
            })

            setHeadings(items)
        }

        extractHeadings()
        editor.on('update', extractHeadings)
        return () => {
            editor.off('update', extractHeadings)
        }
    }, [editor, activeTabId])

    const scrollToHeading = (pos: number) => {
        if (!editor) return
        editor.commands.setTextSelection(pos + 1)
        editor.commands.scrollIntoView()
    }

    const startRename = (tabId: string, currentTitle: string) => {
        setEditingTabId(tabId)
        setEditingTitle(currentTitle)
    }

    const handleFinishRename = (tabId: string) => {
        if (editingTitle.trim()) {
            onRenameTab?.(tabId, editingTitle.trim())
        }
        setEditingTabId(null)
    }

    return (
        <aside
            className={`fixed sm:sticky top-[108px] sm:top-0 left-0 h-[calc(100vh-108px)] sm:h-full bg-white border-r border-[#dadce0] transition-all duration-300 z-30 shrink-0 select-none print:hidden ${
                isOpen ? 'w-64 sm:w-72 shadow-lg sm:shadow-none' : 'w-0 border-r-0'
            }`}
        >
            {/* Collapse/Expand Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-4 w-6 h-6 bg-white border border-[#dadce0] rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm z-40 transition-colors cursor-pointer"
                title={isOpen ? 'Collapse outline (Ctrl+Alt+A)' : 'Show document outline'}
            >
                {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {isOpen && (
                <div className="w-64 sm:w-72 h-full flex flex-col p-4 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-800 font-sans tracking-tight">
                            Document tabs
                        </span>
                        <button
                            type="button"
                            onClick={onAddTab}
                            className="p-1 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Add tab"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Tabs List */}
                    <div className="mt-3 space-y-1">
                        {effectiveTabs.map((tab) => {
                            const isActive = tab.id === currentActiveId
                            const isEditing = editingTabId === tab.id

                            return (
                                <div
                                    key={tab.id}
                                    onClick={() => !isEditing && onSelectTab?.(tab.id)}
                                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer border ${
                                        isActive
                                            ? 'bg-[#d3e3fd]/60 text-blue-900 border-blue-200/50 font-medium'
                                            : 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                                        <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleFinishRename(tab.id)
                                                    if (e.key === 'Escape') setEditingTabId(null)
                                                }}
                                                onBlur={() => handleFinishRename(tab.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full bg-white text-gray-900 px-1 py-0.5 text-xs rounded border border-blue-400 outline-none"
                                            />
                                        ) : (
                                            <span 
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation()
                                                    startRename(tab.id, tab.title)
                                                }}
                                                className="truncate font-sans select-none"
                                                title={`${tab.title} (Double-click to rename)`}
                                            >
                                                {tab.title}
                                            </span>
                                        )}
                                    </div>

                                    {!isEditing && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className={`p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-black/5 ${
                                                        isActive ? 'text-blue-700 opacity-80' : 'text-gray-400 hover:text-gray-700'
                                                    }`}
                                                    title="Tab options"
                                                >
                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-36 text-xs bg-white shadow-xl rounded-lg border border-gray-200 p-1">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        startRename(tab.id, tab.title)
                                                    }}
                                                    className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-100 text-xs"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 text-gray-500" />
                                                    <span>Rename</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDuplicateTab?.(tab.id)
                                                    }}
                                                    className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-100 text-xs"
                                                >
                                                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                                                    <span>Duplicate</span>
                                                </DropdownMenuItem>
                                                {effectiveTabs.length > 1 && (
                                                    <>
                                                        <DropdownMenuSeparator className="my-1 border-t border-gray-100" />
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onDeleteTab?.(tab.id)
                                                            }}
                                                            className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded text-red-600 hover:bg-red-50 text-xs"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Headings Tree / Outline */}
                    <div className="mt-6 flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2 px-1">
                            Outline
                        </span>

                        {headings.length === 0 ? (
                            <p className="text-[11px] text-gray-400 italic px-2 py-4 leading-relaxed font-sans">
                                Headings that you add to the document will appear here.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {headings.map((h) => (
                                    <button
                                        key={h.id}
                                        type="button"
                                        onClick={() => scrollToHeading(h.pos)}
                                        className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50/80 hover:text-blue-700 transition-colors truncate block font-sans ${
                                            h.level === 1 ? 'font-bold' : h.level === 2 ? 'pl-5 text-gray-600' : 'pl-8 text-gray-500 text-[11px]'
                                        }`}
                                        title={h.text}
                                    >
                                        {h.text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </aside>
    )
}
