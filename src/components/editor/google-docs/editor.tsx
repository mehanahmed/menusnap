"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { FontFamily } from '@tiptap/extension-font-family'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Placeholder } from '@tiptap/extension-placeholder'
import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Plugin, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { io, Socket } from 'socket.io-client'
import { getRandomColor, getGuestName } from './editor-utils'





export const IndentExtension = Extension.create({
    name: 'indent',
    addOptions() {
        return {
            types: ['paragraph', 'heading', 'blockquote'],
            minIndent: 0,
            maxIndent: 216,
            indentStep: 36,
        }
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    indent: {
                        default: 0,
                        parseHTML: element => {
                            const ml = element.style.marginLeft || element.getAttribute('data-indent') || '0'
                            return parseInt(ml, 10) || 0
                        },
                        renderHTML: attributes => {
                            if (!attributes.indent || attributes.indent <= 0) {
                                return {}
                            }
                            return {
                                style: `margin-left: ${attributes.indent}px`,
                                'data-indent': attributes.indent,
                            }
                        },
                    },
                },
            },
        ]
    },
    addCommands() {
        return {
            indent: () => ({ tr, state, dispatch }: any) => {
                const { selection } = state
                if (this.editor.isActive('listItem')) {
                    return (this.editor.commands as any).sinkListItem?.('listItem')
                }

                const { from, to } = selection
                let changed = false
                state.doc.nodesBetween(from, to, (node: any, pos: number) => {
                    if (this.options.types.includes(node.type.name)) {
                        const currentIndent = node.attrs.indent || 0
                        const nextIndent = Math.min(this.options.maxIndent, currentIndent + this.options.indentStep)
                        if (nextIndent !== currentIndent) {
                            tr.setNodeMarkup(pos, undefined, {
                                ...node.attrs,
                                indent: nextIndent,
                            })
                            changed = true
                        }
                        return false
                    }
                })
                if (changed && dispatch) dispatch(tr)
                return changed
            },
            outdent: () => ({ tr, state, dispatch }: any) => {
                const { selection } = state
                if (this.editor.isActive('listItem')) {
                    return (this.editor.commands as any).liftListItem?.('listItem')
                }

                const { from, to } = selection
                let changed = false
                state.doc.nodesBetween(from, to, (node: any, pos: number) => {
                    if (this.options.types.includes(node.type.name)) {
                        const currentIndent = node.attrs.indent || 0
                        const prevIndent = Math.max(this.options.minIndent, currentIndent - this.options.indentStep)
                        if (prevIndent !== currentIndent) {
                            tr.setNodeMarkup(pos, undefined, {
                                ...node.attrs,
                                indent: prevIndent,
                            })
                            changed = true
                        }
                        return false
                    }
                })
                if (changed && dispatch) dispatch(tr)
                return changed
            },
        }
    },
    addKeyboardShortcuts() {
        return {
            'Mod-]': () => (this.editor.commands as any).indent(),
            'Mod-[': () => (this.editor.commands as any).outdent(),
        }
    }
})

export const PageBreak = Node.create({
    name: 'pageBreak',
    group: 'block',
    selectable: true,
    draggable: false,
    defining: true,
    isolating: true,
    parseHTML() {
        return [
            { tag: 'div[data-type="page-break"]' },
            { tag: 'div.doc-page-break' },
            { tag: 'hr.page-break' },
        ]
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break', class: 'doc-page-break' }), [
            'div', { class: 'doc-page-break-inner' },
            ['span', { class: 'doc-page-break-label' }, 'Page Break'],
        ]]
    },
    addCommands() {
        return {
            setPageBreak: () => ({ chain }: any) => {
                return chain().insertContent({ type: this.name }).run()
            }
        }
    },
    addKeyboardShortcuts() {
        return {
            'Mod-Enter': () => (this.editor.commands as any).setPageBreak(),
        }
    }
})

export const TabNode = Node.create({
    name: 'tabNode',
    group: 'inline',
    inline: true,
    selectable: false,
    marks: '_',
    addAttributes() {
        return {
            width: {
                default: '24px',
                parseHTML: element => element.style.width,
                renderHTML: attributes => ({
                    style: `display: inline-block; width: ${attributes.width}; white-space: pre; border-bottom: 1px transparent;`,
                }),
            },
        }
    },
    parseHTML() {
        return [
            {
                tag: 'span[data-type="tab"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'tab' }), '\t']
    },
    renderText() {
        return '\t'
    },
})

export const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        }
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {}
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            }
                        },
                    },
                },
            },
        ]
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run()
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run()
            },
        }
    },
})

export const LineHeight = Extension.create({
    name: 'lineHeight',
    addOptions() {
        return {
            types: ['paragraph', 'heading', 'listItem'],
            defaultLineHeight: 'normal',
        }
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    lineHeight: {
                        default: null,
                        parseHTML: element => element.style.lineHeight,
                        renderHTML: attributes => {
                            if (!attributes.lineHeight) return {}
                            return { style: `line-height: ${attributes.lineHeight}` }
                        },
                    },
                },
            },
        ]
    },
    addCommands() {
        return {
            setLineHeight: (lineHeight: string) => ({ commands }) => {
                return this.options.types.every((type: string) => commands.updateAttributes(type, { lineHeight }))
            },
            unsetLineHeight: () => ({ commands }) => {
                return this.options.types.every((type: string) => commands.updateAttributes(type, { lineHeight: null }))
            },
        }
    },
})
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        pageBreak: {
            setPageBreak: () => ReturnType
        },
        indent: {
            indent: () => ReturnType
            outdent: () => ReturnType
        },
        fontSize: {
            setFontSize: (size: string) => ReturnType
            unsetFontSize: () => ReturnType
        },
        lineHeight: {
            setLineHeight: (height: string) => ReturnType
            unsetLineHeight: () => ReturnType
        },
        searchReplace: {
            setSearchTerm: (term: string) => ReturnType
            goToNextResult: () => ReturnType
            goToPrevResult: () => ReturnType
        },
        textCase: {
            setTextCase: (type: 'uppercase' | 'lowercase' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'dot') => ReturnType
        },
        multiSelection: {
            runCommandOnAllSelections: (commandName: string, ...args: any[]) => ReturnType
        }
    }
}

export function toTitleCase(str: string): string {
    return str.toLowerCase().replace(/(^|[^\p{L}\p{N}'])\p{L}/gu, match => match.toUpperCase())
}

export const TextCase = Extension.create({
    name: 'textCase',
    addCommands() {
        return {
            setTextCase: (type: 'uppercase' | 'lowercase' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'dot') => ({ state, tr, dispatch, editor }: any) => {
                const getWords = (str: string) => {
                    return str
                        .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
                        .replace(/[_-]/g, ' ') // split snake/kebab
                        .replace(/\./g, ' ') // split dot.case
                        .trim()
                        .split(/\s+/)
                }

                const transformText = (text: string) => {
                    switch (type) {
                        case 'uppercase': return text.toUpperCase()
                        case 'lowercase': return text.toLowerCase()
                        case 'title': return toTitleCase(text)
                        case 'sentence': return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
                        case 'camel': { 
                            const words = getWords(text)
                            return words.length > 0 ? words[0].toLowerCase() + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('') : text
                        }
                        case 'pascal': return getWords(text).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
                        case 'snake': return getWords(text).map(word => word.toLowerCase()).join('_')
                        case 'kebab': return getWords(text).map(word => word.toLowerCase()).join('-')
                        case 'constant': return getWords(text).map(word => word.toUpperCase()).join('_')
                        case 'dot': return getWords(text).map(word => word.toLowerCase()).join('.')
                        default: return text
                    }
                }

                // Gather all multi-selection ranges + active selection
                const multiRanges = (editor?.storage as any)?.multiSelection?.ranges as { from: number; to: number }[] || []
                const curSel = tr.selection || state.selection
                const allRanges: { from: number; to: number }[] = [...multiRanges]

                if (curSel && curSel.from !== curSel.to) {
                    if (!allRanges.some(r => r.from === curSel.from && r.to === curSel.to)) {
                        allRanges.push({ from: curSel.from, to: curSel.to })
                    }
                }

                const docSize = tr.doc.content.size
                const validRanges = allRanges.filter(r => r.from < r.to && r.from >= 0 && r.to <= docSize)
                if (validRanges.length === 0) return false

                // Collect changes across all ranges
                const changes: { start: number; end: number; transformed: string }[] = []

                validRanges.forEach(range => {
                    state.doc.nodesBetween(range.from, range.to, (node: any, pos: number) => {
                        if (node.isText && node.text) {
                            const nodeStart = Math.max(range.from, pos)
                            const nodeEnd = Math.min(range.to, pos + node.nodeSize)
                            const text = node.text.slice(nodeStart - pos, nodeEnd - pos) || ''
                            const transformed = transformText(text)
                            if (transformed !== text) {
                                changes.push({ start: nodeStart, end: nodeEnd, transformed })
                            }
                        }
                    })
                })

                if (changes.length === 0) return false

                // Apply transformations in REVERSE order to preserve position integrity
                changes.sort((a, b) => b.start - a.start)
                for (let i = 0; i < changes.length; i++) {
                    const { start, end, transformed } = changes[i]
                    tr.insertText(transformed, start, end)
                }

                if ((editor?.storage as any)?.multiSelection) {
                    (editor.storage as any).multiSelection.ranges = validRanges.map(r => ({
                        from: tr.mapping.map(r.from),
                        to: tr.mapping.map(r.to)
                    }))
                }

                if (dispatch) dispatch(tr)
                return true
            },
        }
    }
})

export const MultiSelection = Extension.create({
    name: 'multiSelection',
    addStorage() {
        return {
            ranges: [] as { from: number, to: number }[],
        }
    },
    addCommands() {
        return {
            runCommandOnAllSelections: (commandName: string, ...args: any[]) => ({ editor }: any) => {
                const ranges = [...(this.storage.ranges || [])]
                const { from, to } = editor.state.selection
                if (from !== to && !ranges.some(r => r.from === from && r.to === to)) {
                    ranges.push({ from, to })
                }

                const docSize = editor.state.doc.content.size
                const validRanges = ranges.filter(r => r.from < r.to && r.from >= 0 && r.to <= docSize)

                if (validRanges.length === 0) {
                    if (typeof (editor.chain().focus() as any)[commandName] === 'function') {
                        return (editor.chain().focus() as any)[commandName](...args).run()
                    }
                    return false
                }

                // 1. Text Case
                if (commandName === 'setTextCase') {
                    return (editor.commands as any).setTextCase(...args)
                }

                // 2. Custom text transformation
                if (commandName === 'transformText') {
                    const transform = args[0]
                    if (typeof transform !== 'function') return false
                    const tr = editor.state.tr
                    const sortedRanges = [...validRanges].sort((a, b) => b.from - a.from)
                    const newRanges: { from: number; to: number }[] = []

                    sortedRanges.forEach(range => {
                        const text = tr.doc.textBetween(range.from, range.to)
                        const transformed = transform(text)
                        tr.insertText(transformed, range.from, range.to)
                        newRanges.unshift({ from: range.from, to: range.from + transformed.length })
                    })
                    this.storage.ranges = newRanges
                    editor.view.dispatch(tr)
                    return true
                }

                // 3. Mark Toggles (Bold, Italic, Underline, Strike, Subscript, Superscript)
                const markToggleMap: Record<string, string> = {
                    toggleBold: 'bold',
                    toggleItalic: 'italic',
                    toggleUnderline: 'underline',
                    toggleStrike: 'strike',
                    toggleSubscript: 'subscript',
                    toggleSuperscript: 'superscript',
                }

                if (markToggleMap[commandName]) {
                    const markName = markToggleMap[commandName]
                    const markType = editor.schema.marks[markName]
                    if (!markType) return false

                    let allHaveMark = true
                    for (const range of validRanges) {
                        if (!editor.state.doc.rangeHasMark(range.from, range.to, markType)) {
                            allHaveMark = false
                            break
                        }
                    }
                    const shouldAdd = !allHaveMark
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        if (shouldAdd) {
                            tr.addMark(range.from, range.to, markType.create())
                        } else {
                            tr.removeMark(range.from, range.to, markType)
                        }
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                // 4. TextStyle attributes (color, fontSize, fontFamily)
                if (commandName === 'setColor') {
                    const color = args[0]
                    const markType = editor.schema.marks.textStyle
                    if (!markType) return false
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        tr.addMark(range.from, range.to, markType.create({ color }))
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                if (commandName === 'unsetColor') {
                    const markType = editor.schema.marks.textStyle
                    if (!markType) return false
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        tr.addMark(range.from, range.to, markType.create({ color: null }))
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                if (commandName === 'setFontSize') {
                    const fontSize = args[0]
                    const markType = editor.schema.marks.textStyle
                    if (!markType) return false
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        tr.addMark(range.from, range.to, markType.create({ fontSize }))
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                if (commandName === 'setFontFamily') {
                    const fontFamily = args[0]
                    const markType = editor.schema.marks.textStyle
                    if (!markType) return false
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        tr.addMark(range.from, range.to, markType.create({ fontFamily }))
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                // 5. Highlight
                if (commandName === 'toggleHighlight' || commandName === 'setHighlight') {
                    const color = args[0]?.color || args[0] || '#fff475'
                    const markType = editor.schema.marks.highlight
                    if (!markType) return false
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        tr.addMark(range.from, range.to, markType.create({ color }))
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                if (commandName === 'unsetHighlight') {
                    const markType = editor.schema.marks.highlight
                    if (!markType) return false
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        tr.removeMark(range.from, range.to, markType)
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                // 6. Clear formatting
                if (commandName === 'unsetAllMarks') {
                    const tr = editor.state.tr
                    validRanges.forEach(range => {
                        tr.removeMark(range.from, range.to, null)
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                // 7. Text alignment
                if (commandName === 'setTextAlign') {
                    const alignment = args[0]
                    const tr = editor.state.tr
                    const seen = new Set<number>()
                    validRanges.forEach(range => {
                        tr.doc.nodesBetween(range.from, range.to, (node: any, pos: number) => {
                            if (['paragraph', 'heading'].includes(node.type.name) && !seen.has(pos)) {
                                seen.add(pos)
                                tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: alignment })
                            }
                        })
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                // 8. Indent / Outdent
                if (commandName === 'indent' || commandName === 'outdent') {
                    const isIndent = commandName === 'indent'
                    const tr = editor.state.tr
                    const seen = new Set<number>()
                    validRanges.forEach(range => {
                        tr.doc.nodesBetween(range.from, range.to, (node: any, pos: number) => {
                            if (['paragraph', 'heading', 'blockquote'].includes(node.type.name) && !seen.has(pos)) {
                                seen.add(pos)
                                const currentIndent = node.attrs.indent || 0
                                const nextIndent = isIndent
                                    ? Math.min(216, currentIndent + 36)
                                    : Math.max(0, currentIndent - 36)
                                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: nextIndent })
                            }
                        })
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                // 9. Line height
                if (commandName === 'setLineHeight') {
                    const lineHeight = args[0]
                    const tr = editor.state.tr
                    const seen = new Set<number>()
                    validRanges.forEach(range => {
                        tr.doc.nodesBetween(range.from, range.to, (node: any, pos: number) => {
                            if (['paragraph', 'heading', 'listItem'].includes(node.type.name) && !seen.has(pos)) {
                                seen.add(pos)
                                tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight })
                            }
                        })
                    })
                    editor.view.dispatch(tr)
                    return true
                }

                // Fallback for other commands
                const sortedRanges = [...validRanges].sort((a, b) => b.from - a.from)
                sortedRanges.forEach((range) => {
                    try {
                        const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, range.from, range.to))
                        editor.view.dispatch(tr)
                        if (typeof (editor.commands as any)[commandName] === 'function') {
                            (editor.commands as any)[commandName](...args)
                        }
                    } catch (e) {
                        console.error('MultiSelection fallback error:', e)
                    }
                })

                editor.commands.focus()
                return true
            }
        }
    },
    addKeyboardShortcuts() {
        return {
            'Mod-b': () => {
                if (this.storage.ranges && this.storage.ranges.length > 0) {
                    return (this.editor.commands as any).runCommandOnAllSelections('toggleBold')
                }
                return false
            },
            'Mod-i': () => {
                if (this.storage.ranges && this.storage.ranges.length > 0) {
                    return (this.editor.commands as any).runCommandOnAllSelections('toggleItalic')
                }
                return false
            },
            'Mod-u': () => {
                if (this.storage.ranges && this.storage.ranges.length > 0) {
                    return (this.editor.commands as any).runCommandOnAllSelections('toggleUnderline')
                }
                return false
            },
            'Mod-]': () => {
                if (this.storage.ranges && this.storage.ranges.length > 0) {
                    return (this.editor.commands as any).runCommandOnAllSelections('indent')
                }
                return false
            },
            'Mod-[': () => {
                if (this.storage.ranges && this.storage.ranges.length > 0) {
                    return (this.editor.commands as any).runCommandOnAllSelections('outdent')
                }
                return false
            },
            Backspace: () => {
                const ranges = [...(this.storage.ranges || [])]
                const { from, to } = this.editor.state.selection
                if (from !== to && !ranges.some(r => r.from === from && r.to === to)) {
                    ranges.push({ from, to })
                }
                if (ranges.length > 1 || (ranges.length === 1 && this.storage.ranges.length > 0)) {
                    const sorted = [...ranges].sort((a, b) => b.from - a.from)
                    const tr = this.editor.state.tr
                    sorted.forEach((r: { from: number; to: number }) => {
                        if (r.from < r.to) tr.delete(r.from, r.to)
                    })
                    this.storage.ranges = []
                    this.editor.view.dispatch(tr)
                    return true
                }
                return false
            },
            Delete: () => {
                const ranges = [...(this.storage.ranges || [])]
                const { from, to } = this.editor.state.selection
                if (from !== to && !ranges.some(r => r.from === from && r.to === to)) {
                    ranges.push({ from, to })
                }
                if (ranges.length > 1 || (ranges.length === 1 && this.storage.ranges.length > 0)) {
                    const sorted = [...ranges].sort((a, b) => b.from - a.from)
                    const tr = this.editor.state.tr
                    sorted.forEach((r: { from: number; to: number }) => {
                        if (r.from < r.to) tr.delete(r.from, r.to)
                    })
                    this.storage.ranges = []
                    this.editor.view.dispatch(tr)
                    return true
                }
                return false
            },
            Escape: () => {
                if (this.storage.ranges.length > 0) {
                    this.storage.ranges = []
                    this.editor.view.dispatch(this.editor.state.tr)
                    return true
                }
                return false
            }
        }
    },
    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    decorations: (state) => {
                        const ranges = this.storage.ranges as { from: number; to: number }[]
                        if (!ranges || ranges.length === 0) return DecorationSet.empty

                        const docSize = state.doc.content.size
                        const validRanges = ranges.filter((r: { from: number; to: number }) => r.from >= 0 && r.to <= docSize && r.from < r.to)
                        if (validRanges.length === 0) return DecorationSet.empty

                        const decorations = validRanges.map((range: { from: number, to: number }) => 
                            Decoration.inline(range.from, range.to, { class: 'multi-selection-highlight' })
                        )
                        return DecorationSet.create(state.doc, decorations)
                    },
                    handleTextInput: (view, from, to, text) => {
                        const ranges = [...(this.storage.ranges || [])]
                        const curSel = view.state.selection
                        if (curSel.from !== curSel.to && !ranges.some(r => r.from === curSel.from && r.to === curSel.to)) {
                            ranges.push({ from: curSel.from, to: curSel.to })
                        }
                        const docSize = view.state.doc.content.size
                        const validRanges = ranges.filter(r => r.from < r.to && r.from >= 0 && r.to <= docSize)
                        if (validRanges.length > 1) {
                            const sorted = [...validRanges].sort((a, b) => b.from - a.from)
                            const tr = view.state.tr
                            sorted.forEach(r => {
                                tr.insertText(text, r.from, r.to)
                            })
                            this.storage.ranges = []
                            view.dispatch(tr)
                            return true
                        }
                        return false
                    },
                    handleDOMEvents: {
                        mousedown: (view, event) => {
                            const isCtrl = event.ctrlKey || event.metaKey
                            if (isCtrl) {
                                // Capture existing active selection before user begins clicking/selecting new text
                                const { from, to } = view.state.selection
                                if (from !== to) {
                                    if (!this.storage.ranges.some((r: any) => r.from === from && r.to === to)) {
                                        this.storage.ranges.push({ from, to })
                                    }
                                }
                            } else {
                                // Normal click without Ctrl clears previous multi-selection without canceling mouse drag
                                if (this.storage.ranges.length > 0) {
                                    this.storage.ranges = []
                                    view.dispatch(view.state.tr)
                                }
                            }
                            return false
                        },
                        dragstart: (view, event) => {
                            // Prevent native HTML5 drag and drop of selected text when dragging with Ctrl
                            if (event.ctrlKey || event.metaKey) {
                                event.preventDefault()
                                return true
                            }
                            return false
                        },
                        mouseup: (view, event) => {
                            const isCtrl = event.ctrlKey || event.metaKey
                            if (isCtrl) {
                                setTimeout(() => {
                                    if (view.isDestroyed) return
                                    const { from, to } = view.state.selection
                                    if (from !== to) {
                                        if (!this.storage.ranges.some((r: any) => r.from === from && r.to === to)) {
                                            this.storage.ranges.push({ from, to })
                                            view.dispatch(view.state.tr)
                                        }
                                    }
                                }, 15)
                            }
                            return false
                        }
                    }
                }
            })
        ]
    }
})


interface EditorProps {
    content: string;
    onChange: (html: string) => void;
    onReady: (editor: any) => void;
    readOnly?: boolean;
    showWatermark?: boolean;
    customPaperHeader?: React.ReactNode;
    customPaperFooter?: React.ReactNode;
    tabStops?: { position: number, type: 'left' | 'center' | 'right' }[];
    docId?: string;
    socket?: Socket | null;
    onlineUsers?: any[];
    onUpdateContent?: (html: string) => void;
    columnCount?: number;
    maxPaperWidth?: string;
    pageColor?: string;
    isPageless?: boolean;
    activeTabId?: string;
}

export default function GoogleDocsEditor(props: EditorProps) {
    const { socket, onlineUsers = [] } = props
    return <GoogleDocsEditorInner {...props} socket={socket || null} onlineUsers={onlineUsers} />
}

function GoogleDocsEditorInner({ 
    content, 
    onChange, 
    onReady, 
    readOnly = false, 
    showWatermark = false, 
    customPaperHeader, 
    customPaperFooter, 
    tabStops = [], 
    docId,
    socket,
    onlineUsers,
    onUpdateContent,
    columnCount = 1,
    maxPaperWidth = '816px',
    pageColor = '#ffffff',
    isPageless = false,
    activeTabId,
}: EditorProps & { socket: Socket | null, onlineUsers: any[] }) {

    const pageHeightNum = useMemo(() => {
        if (maxPaperWidth === '1122px' || maxPaperWidth === '794px') return 1122
        if (maxPaperWidth === '1344px') return 1344
        return 1056
    }, [maxPaperWidth])

    const paperContainerRef = useRef<HTMLDivElement>(null)

    const isRemoteUpdate = useRef(false)
    const socketRef = useRef(socket)
    socketRef.current = socket

    const editor = useEditor({
        parseOptions: {
            preserveWhitespace: 'full',
        },
        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true, keepAttributes: false },
                orderedList: { keepMarks: true, keepAttributes: false },
                underline: false,
                link: false,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
            }),
            Image.configure({
                HTMLAttributes: { class: 'max-w-full h-auto rounded-lg shadow-sm block mx-auto my-4' },
            }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle, FontFamily, FontSize, Color, LineHeight,
            Highlight.configure({ multicolor: true }),
            TaskList, 
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: 'Write something or type "/" for commands...' }),
            TabNode,
            PageBreak,
            IndentExtension,
            TextCase,
            MultiSelection,
            Extension.create({
                name: 'tabKey',
                priority: 1000,
                addStorage() { return { tabStops: [] as any[] } },
                addKeyboardShortcuts() {
                    return {
                        Tab: () => {
                            const { state, view } = this.editor
                            const { selection } = state
                            const coords = view.coordsAtPos(selection.from)
                            const editorPort = view.dom.getBoundingClientRect()
                            const currentX = coords.left - editorPort.left
                            const stops = this.storage.tabStops || []
                            const sortedStops = [...stops].sort((a: any, b: any) => a.position - b.position)
                            const nextStop = sortedStops.find(t => t.position > currentX + 2)
                            let tabWidth = 48 
                            if (nextStop) tabWidth = nextStop.position - currentX
                            else {
                                const nextDefault = Math.ceil((currentX + 1) / 48) * 48
                                tabWidth = nextDefault - currentX
                                if (tabWidth < 10) tabWidth += 48
                            }
                            return this.editor.chain().focus().insertContent([{ type: 'tabNode', attrs: { width: `${tabWidth}px` } }]).run()
                        },
                    }
                },
            }),
            Extension.create({
                name: 'searchReplace',
                addStorage() { return { searchTerm: '', results: [] as { from: number; to: number }[], currentIndex: 0 } },
                addCommands() {
                    return {
                        setSearchTerm: (term: string) => ({ editor }: { editor: any }) => {
                            this.storage.searchTerm = term
                            this.storage.results = []
                            this.storage.currentIndex = 0
                            if (term) {
                                const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
                                editor.state.doc.descendants((node: any, pos: number) => {
                                    if (node.isText) {
                                        const text = node.text || ''
                                        let match
                                        while ((match = regex.exec(text)) !== null) {
                                            this.storage.results.push({ from: pos + match.index, to: pos + match.index + match[0].length })
                                        }
                                    }
                                })
                            }
                            const { tr } = editor.state
                            editor.view.dispatch(tr)
                            return true
                        },
                        goToNextResult: () => ({ editor }: { editor: any }) => {
                            if (this.storage.results.length === 0) return false
                            this.storage.currentIndex = (this.storage.currentIndex + 1) % this.storage.results.length
                            const result = this.storage.results[this.storage.currentIndex]
                            editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, result.from)).scrollIntoView())
                            return true
                        },
                        goToPrevResult: () => ({ editor }: { editor: any }) => {
                            if (this.storage.results.length === 0) return false
                            this.storage.currentIndex = (this.storage.currentIndex - 1 + this.storage.results.length) % this.storage.results.length
                            const result = this.storage.results[this.storage.currentIndex]
                            editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, result.from)).scrollIntoView())
                            return true
                        },
                    } as any
                },
                addProseMirrorPlugins() {
                    return [
                        new Plugin({
                            props: {
                                decorations: (state: any) => {
                                    const decorations: any[] = []
                                    if (this.storage.searchTerm && this.storage.results.length > 0) {
                                        this.storage.results.forEach((result: any, index: number) => {
                                            const isCurrent = index === this.storage.currentIndex
                                            decorations.push(Decoration.inline(result.from, result.to, {
                                                class: isCurrent ? 'search-result-current' : 'search-result',
                                                style: isCurrent ? 'background-color: #f7e200; color: black;' : 'background-color: #ceead6; color: black;'
                                            }))
                                        })
                                    }
                                    return DecorationSet.create(state.doc, decorations)
                                }
                            }
                        })
                    ]
                }
            }),
            Extension.create({
                name: 'clipboardCustomizer',
                addProseMirrorPlugins() {
                    return [
                        new Plugin({
                            props: {
                                clipboardTextSerializer: (slice) => {
                                    const serialize = (node: any): string => {
                                        if (node.type.name === 'tabNode') return '\t'
                                        if (node.type.name === 'hardBreak') return '\n'
                                        if (node.isText) return node.text || ''
                                        
                                        let childText = ''
                                        node.content.forEach((child: any, _: any, index: number) => {
                                            if (node.type.name === 'bulletList' && child.type.name === 'listItem') {
                                                childText += '• ' + serialize(child)
                                            } else if (node.type.name === 'orderedList' && child.type.name === 'listItem') {
                                                childText += `${index + 1}. ` + serialize(child)
                                            } else {
                                                childText += serialize(child)
                                            }
                                        })
                                        
                                        return node.isBlock ? childText + '\n' : childText
                                    }
                                    
                                    let result = ''
                                    slice.content.forEach(node => {
                                        result += serialize(node)
                                    })
                                    return result.trimEnd().replace(/\u200b/g, '')
                                }
                            }
                        })
                    ]
                }
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onChange(html)
            if (onUpdateContent) onUpdateContent(html)
            if (!isRemoteUpdate.current && socketRef.current && docId) {
                socketRef.current.emit('content-change', { docId, content: html })
            }
            isRemoteUpdate.current = false
        },
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: `focus:outline-none min-[1056px]:min-h-[1056px] min-h-[1056px] w-full max-w-[816px] ${customPaperHeader ? 'pb-12 pt-6' : 'py-12'} ${readOnly ? 'cursor-default' : 'cursor-text'}`,
            },
        },
        autofocus: false,
        immediatelyRender: false,
    }, [docId]) // Stable editor instance, does not reset when socket connects




    useEffect(() => {
        if (editor) onReady(editor)
    }, [editor, onReady])

    useEffect(() => {
        if (!editor || !socket || !docId) return

        const handleDocUpdate = (newContent: string) => {
            if (editor.getHTML() !== newContent) {
                isRemoteUpdate.current = true
                editor.commands.setContent(newContent, { emitUpdate: false })
                onChange(newContent)
                if (onUpdateContent) onUpdateContent(newContent)
            }
        }

        socket.on('document-update', handleDocUpdate)

        return () => {
            socket.off('document-update', handleDocUpdate)
        }
    }, [editor, socket, docId, onChange, onUpdateContent])

    const loadedDocIdRef = React.useRef<string | null>(null)
    const initialContentLoadedRef = React.useRef<boolean>(false)
    useEffect(() => {
        if (!editor) return
        const currentId = docId || 'default'
        if (loadedDocIdRef.current !== currentId) {
            loadedDocIdRef.current = currentId
            initialContentLoadedRef.current = false
        }
        if (content && !initialContentLoadedRef.current) {
            initialContentLoadedRef.current = true
            editor.commands.setContent(content)
        }
    }, [editor, content, docId])

    useEffect(() => {
        if (editor && tabStops) (editor.storage as any).tabKey.tabStops = tabStops
    }, [editor, tabStops])

    const paperMinHeight = isPageless ? undefined : `${pageHeightNum}px`

    return (
        <div className="flex justify-center w-full min-h-full relative print:p-0">
            <div 
                className={`mt-2 sm:mt-4 mb-10 w-full mx-auto px-0 sm:px-4 transition-all duration-200 print:m-0 print:p-0 ${isPageless ? 'max-w-5xl px-8 py-6' : ''}`}
                style={{ maxWidth: isPageless ? '100%' : (maxPaperWidth || '816px') }}
            >
                <div 
                    ref={paperContainerRef}
                    className={`shadow-xl border border-gray-200 w-full relative print:shadow-none print:border-none ${showWatermark ? 'bg-watermark' : ''} ${isPageless ? 'shadow-none border-none' : 'rounded-xs'}`}
                    style={{
                        backgroundColor: pageColor || '#ffffff',
                        minHeight: paperMinHeight,
                    }}
                >
                    {customPaperHeader}
                    <div 
                        className="w-full"
                        style={{
                            columnCount: columnCount && columnCount > 1 ? columnCount : undefined,
                            columnGap: columnCount && columnCount > 1 ? '2.5rem' : undefined,
                            columnRule: columnCount && columnCount > 1 ? '1px solid #e5e7eb' : undefined,
                        }}
                    >
                        <EditorContent editor={editor} />
                    </div>

                    {customPaperFooter}
                </div>
            </div>
        </div>
    )
}
