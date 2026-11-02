"use client"

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Editor } from '@tiptap/react'
import { Upload, Link as LinkIcon, Image as ImageIcon, Search } from 'lucide-react'

// ==========================================
// 1. Word Count Dialog
// ==========================================
export function WordCountDialog({
    isOpen,
    onClose,
    editor,
}: {
    isOpen: boolean
    onClose: () => void
    editor: Editor | null
}) {
    if (!editor) return null

    const text = editor.getText()
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const characters = text.length
    const charactersNoSpaces = text.replace(/\s+/g, '').length
    const pages = Math.max(1, Math.ceil(words / 450))
    const readingTimeMin = Math.max(1, Math.ceil(words / 200))

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl shadow-2xl border border-gray-100">
                <DialogHeader className="pb-3 border-b border-gray-100">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                        Word count
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 text-sm">
                    <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-medium">Pages</span>
                        <span className="font-semibold text-gray-900 font-mono">{pages}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-medium">Words</span>
                        <span className="font-semibold text-gray-900 font-mono">{words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-medium">Characters</span>
                        <span className="font-semibold text-gray-900 font-mono">{characters.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-medium">Characters excluding spaces</span>
                        <span className="font-semibold text-gray-900 font-mono">{charactersNoSpaces.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                        <span className="text-gray-500 font-medium">Estimated reading time</span>
                        <span className="font-semibold text-gray-900 font-mono">~{readingTimeMin} min</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onClose} className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 rounded-full text-xs font-semibold">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ==========================================
// 2. Page Setup Dialog
// ==========================================
export function PageSetupDialog({
    isOpen,
    onClose,
    pageSettings,
    onApply,
}: {
    isOpen: boolean
    onClose: () => void
    pageSettings: {
        orientation: 'portrait' | 'landscape'
        paperSize: 'letter' | 'a4' | 'legal'
        pageColor: string
        margins: { top: number; bottom: number; left: number; right: number }
    }
    onApply: (settings: any) => void
}) {
    const [settings, setSettings] = useState(pageSettings)

    const handleSave = () => {
        onApply(settings)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl shadow-2xl border border-gray-100">
                <DialogHeader className="pb-3 border-b border-gray-100">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                        Page setup
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-5 text-xs">
                    {/* Orientation */}
                    <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Orientation</Label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={settings.orientation === 'portrait'}
                                    onChange={() => setSettings(s => ({ ...s, orientation: 'portrait' }))}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-gray-800">Portrait</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={settings.orientation === 'landscape'}
                                    onChange={() => setSettings(s => ({ ...s, orientation: 'landscape' }))}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-gray-800">Landscape</span>
                            </label>
                        </div>
                    </div>

                    {/* Paper Size */}
                    <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Paper size</Label>
                        <select
                            value={settings.paperSize}
                            onChange={(e) => setSettings(s => ({ ...s, paperSize: e.target.value as any }))}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="letter">Letter (8.5 × 11 in)</option>
                            <option value="a4">A4 (210 × 297 mm)</option>
                            <option value="legal">Legal (8.5 × 14 in)</option>
                        </select>
                    </div>

                    {/* Margins */}
                    <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Margins (inches)</Label>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                                <span className="text-[10px] text-gray-400">Top</span>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={settings.margins.top}
                                    onChange={(e) => setSettings(s => ({ ...s, margins: { ...s.margins, top: Number(e.target.value) || 0 } }))}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400">Bottom</span>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={settings.margins.bottom}
                                    onChange={(e) => setSettings(s => ({ ...s, margins: { ...s.margins, bottom: Number(e.target.value) || 0 } }))}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400">Left</span>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={settings.margins.left}
                                    onChange={(e) => setSettings(s => ({ ...s, margins: { ...s.margins, left: Number(e.target.value) || 0 } }))}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400">Right</span>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={settings.margins.right}
                                    onChange={(e) => setSettings(s => ({ ...s, margins: { ...s.margins, right: Number(e.target.value) || 0 } }))}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Page Color */}
                    <div className="space-y-2">
                        <Label className="font-semibold text-gray-700">Page color</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={settings.pageColor}
                                onChange={(e) => setSettings(s => ({ ...s, pageColor: e.target.value }))}
                                className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0"
                            />
                            <span className="font-mono text-gray-500 uppercase">{settings.pageColor}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} className="rounded-full text-xs">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 rounded-full text-xs font-semibold">
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ==========================================
// 3. Image Upload & Inserter Dialog
// ==========================================
export function ImageUploadDialog({
    isOpen,
    onClose,
    editor,
}: {
    isOpen: boolean
    onClose: () => void
    editor: Editor | null
}) {
    const [imageUrl, setImageUrl] = useState('')
    const [isUploading, setIsUploading] = useState(false)

    const handleInsertUrl = () => {
        if (!editor || !imageUrl.trim()) return
        editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
        setImageUrl('')
        onClose()
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !editor) return

        setIsUploading(true)
        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            if (dataUrl) {
                editor.chain().focus().setImage({ src: dataUrl }).run()
            }
            setIsUploading(false)
            onClose()
        }
        reader.readAsDataURL(file)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl shadow-2xl border border-gray-100">
                <DialogHeader className="pb-3 border-b border-gray-100">
                    <DialogTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        Insert image
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="upload" className="w-full pt-2">
                    <TabsList className="grid grid-cols-2 h-9 p-1 bg-gray-100 rounded-lg">
                        <TabsTrigger value="upload" className="text-xs font-semibold">
                            Upload from Computer
                        </TabsTrigger>
                        <TabsTrigger value="url" className="text-xs font-semibold">
                            By URL
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="pt-4 space-y-4">
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer bg-gray-50/50 hover:bg-blue-50/20 transition-all">
                            <Upload className="w-8 h-8 text-blue-600 mb-2" />
                            <span className="text-xs font-semibold text-gray-700">Choose an image or drag & drop</span>
                            <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, WebP, GIF supported</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                        </label>
                        {isUploading && (
                            <p className="text-xs text-center text-blue-600 font-medium">Processing image...</p>
                        )}
                    </TabsContent>

                    <TabsContent value="url" className="pt-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-700">Image Web Link (URL)</Label>
                            <Input
                                placeholder="https://example.com/image.jpg"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>
                        <Button
                            onClick={handleInsertUrl}
                            disabled={!imageUrl.trim()}
                            className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold h-9"
                        >
                            Insert
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

// ==========================================
// 4. Keyboard Shortcuts Dialog
// ==========================================
export function KeyboardShortcutsDialog({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) {
    const shortcuts = [
        { label: 'Undo', key: 'Ctrl + Z' },
        { label: 'Redo', key: 'Ctrl + Y' },
        { label: 'Bold', key: 'Ctrl + B' },
        { label: 'Italic', key: 'Ctrl + I' },
        { label: 'Underline', key: 'Ctrl + U' },
        { label: 'Strikethrough', key: 'Alt + Shift + 5' },
        { label: 'Insert Link', key: 'Ctrl + K' },
        { label: 'Find and Replace', key: 'Ctrl + H / Ctrl + F' },
        { label: 'Print Document', key: 'Ctrl + P' },
        { label: 'Clear Formatting', key: 'Ctrl + \\' },
        { label: 'Numbered List', key: 'Ctrl + Shift + 7' },
        { label: 'Bulleted List', key: 'Ctrl + Shift + 8' },
        { label: 'Checklist', key: 'Ctrl + Shift + 9' },
        { label: 'Multi-select text', key: 'Hold Ctrl + Drag' },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto">
                <DialogHeader className="pb-3 border-b border-gray-100">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                        Keyboard shortcuts
                    </DialogTitle>
                </DialogHeader>
                <div className="py-3 divide-y divide-gray-100 text-xs">
                    {shortcuts.map((s, idx) => (
                        <div key={idx} className="flex justify-between py-2">
                            <span className="text-gray-700 font-medium">{s.label}</span>
                            <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-[11px] text-gray-600 font-semibold shadow-2xs">
                                {s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={onClose} className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 rounded-full text-xs font-semibold">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ==========================================
// 5. Quick Menus / Command Palette Dialog
// ==========================================
export function CommandSearchDialog({
    isOpen,
    onClose,
    editor,
    onAction,
}: {
    isOpen: boolean
    onClose: () => void
    editor: Editor | null
    onAction: (actionKey: string) => void
}) {
    const [search, setSearch] = useState('')

    const allCommands = [
        { label: 'Bold text', key: 'bold', action: () => editor?.chain().focus().toggleBold().run() },
        { label: 'Italic text', key: 'italic', action: () => editor?.chain().focus().toggleItalic().run() },
        { label: 'Underline text', key: 'underline', action: () => editor?.chain().focus().toggleUnderline().run() },
        { label: 'Insert Table', key: 'table', action: () => onAction('table') },
        { label: 'Insert Image', key: 'image', action: () => onAction('image') },
        { label: 'Insert Link', key: 'link', action: () => onAction('link') },
        { label: 'Word Count', key: 'wordcount', action: () => onAction('wordcount') },
        { label: 'Page Setup', key: 'pagesetup', action: () => onAction('pagesetup') },
        { label: 'Print Document', key: 'print', action: () => window.print() },
        { label: 'Clear Formatting', key: 'clear', action: () => editor?.chain().focus().unsetAllMarks().clearNodes().run() },
        { label: 'Bullet List', key: 'bullet', action: () => editor?.chain().focus().toggleBulletList().run() },
        { label: 'Numbered List', key: 'ordered', action: () => editor?.chain().focus().toggleOrderedList().run() },
        { label: 'Checklist', key: 'checklist', action: () => editor?.chain().focus().toggleTaskList().run() },
        { label: 'Align Left', key: 'alignLeft', action: () => (editor?.commands as any)?.setTextAlign('left') },
        { label: 'Align Center', key: 'alignCenter', action: () => (editor?.commands as any)?.setTextAlign('center') },
        { label: 'Align Right', key: 'alignRight', action: () => (editor?.commands as any)?.setTextAlign('right') },
        { label: 'Download Word (.docx)', key: 'downloadDocx', action: () => onAction('downloadDocx') },
        { label: 'Find and Replace', key: 'findReplace', action: () => onAction('findReplace') },
    ]

    const filtered = allCommands.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))

    const handleSelect = (cmd: typeof allCommands[0]) => {
        cmd.action()
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white p-4 rounded-2xl shadow-2xl border border-gray-100">
                <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-100">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                        autoFocus
                        placeholder="Search menus (Alt + /)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-none shadow-none text-xs focus-visible:ring-0 px-0 h-8"
                    />
                </div>
                <div className="py-2 max-h-[300px] overflow-y-auto space-y-1">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No matching commands</p>
                    ) : (
                        filtered.map((cmd) => (
                            <button
                                key={cmd.key}
                                onClick={() => handleSelect(cmd)}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-xs text-gray-700 font-medium flex items-center justify-between transition-colors"
                            >
                                <span>{cmd.label}</span>
                            </button>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ==========================================
// 6. Page Numbers Dialog
// ==========================================
export interface PageNumberConfig {
    enabled: boolean
    position: 'header' | 'footer'
    showOnFirstPage: boolean
    startAt: number
    numberingType: 'startAt' | 'continue'
}

export function PageNumbersDialog({
    isOpen,
    onClose,
    config,
    onApply,
}: {
    isOpen: boolean
    onClose: () => void
    config: PageNumberConfig
    onApply: (newConfig: PageNumberConfig) => void
}) {
    const [position, setPosition] = useState<'header' | 'footer'>(config.position || 'header')
    const [showOnFirstPage, setShowOnFirstPage] = useState<boolean>(config.showOnFirstPage ?? true)
    const [numberingType, setNumberingType] = useState<'startAt' | 'continue'>(config.numberingType || 'startAt')
    const [startAt, setStartAt] = useState<number>(config.startAt ?? 1)

    React.useEffect(() => {
        if (isOpen) {
            setPosition(config.position || 'header')
            setShowOnFirstPage(config.showOnFirstPage ?? true)
            setNumberingType(config.numberingType || 'startAt')
            setStartAt(config.startAt ?? 1)
        }
    }, [isOpen, config])

    const handleApply = () => {
        onApply({
            enabled: true,
            position,
            showOnFirstPage,
            startAt: Math.max(1, startAt || 1),
            numberingType,
        })
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[360px] bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 z-[140]">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                        Page numbers
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 space-y-5 text-xs text-gray-800 font-sans">
                    {/* Position */}
                    <div className="space-y-2.5">
                        <span className="font-semibold text-gray-700 block">Position</span>
                        <div className="space-y-2 pl-1">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="pageNumberPosition"
                                    checked={position === 'header'}
                                    onChange={() => setPosition('header')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-gray-700">Header</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="pageNumberPosition"
                                    checked={position === 'footer'}
                                    onChange={() => setPosition('footer')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-gray-700">Footer</span>
                            </label>
                        </div>
                        <label className="flex items-center gap-2.5 pl-1 pt-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showOnFirstPage}
                                onChange={(e) => setShowOnFirstPage(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-gray-700">Show on first page</span>
                        </label>
                    </div>

                    {/* Numbering */}
                    <div className="space-y-2.5 pt-2 border-t border-gray-100">
                        <span className="font-semibold text-gray-700 block">Numbering</span>
                        <div className="space-y-2.5 pl-1">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="numberingType"
                                    checked={numberingType === 'startAt'}
                                    onChange={() => setNumberingType('startAt')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-gray-700">Start at</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={startAt}
                                    onChange={(e) => setStartAt(Math.max(1, parseInt(e.target.value) || 1))}
                                    disabled={numberingType !== 'startAt'}
                                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-center ml-2"
                                />
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="numberingType"
                                    checked={numberingType === 'continue'}
                                    onChange={() => setNumberingType('continue')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-gray-700">Continue from previous section</span>
                            </label>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-3 border-t border-gray-100 flex justify-end gap-2 items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full text-xs text-gray-600 hover:text-gray-900 px-4"
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleApply}
                        className="bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full text-xs font-semibold px-5 shadow-xs"
                    >
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
