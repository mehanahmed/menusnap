"use client"

import React, { useEffect, useState } from 'react'
import { Editor } from '@tiptap/react'
import { FileText, Plus, MoreVertical, ChevronLeft, ChevronRight, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
    documentTitle: string
}

export default function OutlineSidebar({
    editor,
    isOpen,
    onToggle,
    documentTitle,
}: OutlineSidebarProps) {
    const [headings, setHeadings] = useState<OutlineItem[]>([])

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
    }, [editor])

    const scrollToHeading = (pos: number) => {
        if (!editor) return
        editor.commands.setTextSelection(pos + 1)
        editor.commands.scrollIntoView()
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
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Add tab"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Active Tab Pill */}
                    <div className="mt-3 flex items-center justify-between px-3 py-2 bg-[#d3e3fd]/60 rounded-xl text-blue-900 border border-blue-200/50">
                        <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs font-semibold truncate font-sans">
                                {documentTitle || 'Tab 1'}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="text-blue-700/60 hover:text-blue-900 p-0.5 rounded transition-colors"
                        >
                            <MoreVertical className="w-3.5 h-3.5" />
                        </button>
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
