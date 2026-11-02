"use client"

import React, { useState } from 'react'
import { Editor } from '@tiptap/react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_ROWS = 8
const MAX_COLS = 8

export default function TablePicker({
    editor,
    children,
}: {
    editor?: Editor | null
    children?: React.ReactNode
}) {
    const [hoveredRow, setHoveredRow] = useState(0)
    const [hoveredCol, setHoveredCol] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const handleSelect = (rows: number, cols: number) => {
        if (!editor) return
        editor
            .chain()
            .focus()
            .insertTable({ rows, cols, withHeaderRow: true })
            .run()
        setIsOpen(false)
        setHoveredRow(0)
        setHoveredCol(0)
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                {children || (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md hover:bg-white border border-transparent hover:border-[#dadce0] hover:shadow-sm"
                        title="Insert table"
                    >
                        <TableIcon className="w-4 h-4 text-gray-600" />
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="p-3 bg-white rounded-xl shadow-2xl border border-gray-200 z-[120]"
            >
                <div className="text-center text-xs font-semibold text-gray-700 pb-2 border-b border-gray-100">
                    {hoveredRow > 0 && hoveredCol > 0 ? (
                        <span className="text-blue-600 font-mono font-bold">
                            {hoveredRow} × {hoveredCol} Table
                        </span>
                    ) : (
                        <span>Insert table</span>
                    )}
                </div>

                <div
                    className="grid gap-1 pt-2"
                    style={{
                        gridTemplateColumns: `repeat(${MAX_COLS}, minmax(0, 1fr))`,
                    }}
                    onMouseLeave={() => {
                        setHoveredRow(0)
                        setHoveredCol(0)
                    }}
                >
                    {Array.from({ length: MAX_ROWS }).map((_, rIdx) =>
                        Array.from({ length: MAX_COLS }).map((_, cIdx) => {
                            const row = rIdx + 1
                            const col = cIdx + 1
                            const isHighlighted = row <= hoveredRow && col <= hoveredCol

                            return (
                                <div
                                    key={`${row}-${col}`}
                                    onMouseEnter={() => {
                                        setHoveredRow(row)
                                        setHoveredCol(col)
                                    }}
                                    onClick={() => handleSelect(row, col)}
                                    className={`w-5 h-5 rounded-xs border transition-colors cursor-pointer ${
                                        isHighlighted
                                            ? 'bg-blue-100 border-blue-500 shadow-2xs'
                                            : 'bg-white border-gray-300 hover:border-blue-400'
                                    }`}
                                />
                            )
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
