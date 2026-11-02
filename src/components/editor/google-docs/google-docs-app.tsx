"use client"

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Header from './header'
import Toolbar from './toolbar'
import Ruler from './ruler'
import FindReplace from './find-replace'
import FindReplaceDialog from './find-replace-dialog'
import OutlineSidebar, { DocumentTab } from './outline-sidebar'
import {
  WordCountDialog,
  PageSetupDialog,
  ImageUploadDialog,
  KeyboardShortcutsDialog,
  CommandSearchDialog,
  PageNumbersDialog,
  PageNumberConfig,
  HeaderFooterDialog,
  HeaderFooterConfig,
} from './editor-dialogs'
import { Editor } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import { getRandomColor, getGuestName } from './editor-utils'
import { generateDocxFromJSON } from '@/lib/docx-generator'
import { saveAs } from 'file-saver'

// Dynamically import editor with no SSR to avoid hydration issues
const EditorComponent = dynamic(() => import('./editor'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center w-full bg-[#f8f9fa] min-h-screen pt-16 sm:pt-[100px] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[816px] h-screen bg-white shadow-md py-8 px-6 sm:py-12 sm:px-16"
      >
        <div className="h-8 w-3/4 bg-gray-100 rounded mb-6 animate-pulse"></div>
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-50 rounded animate-pulse"></div>
          <div className="h-4 w-full bg-gray-50 rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>
          <div className="h-4 w-5/6 bg-gray-50 rounded animate-pulse" style={{ animationDelay: '200ms' }}></div>
        </div>
      </motion.div>
    </div>
  ),
})

const SummernoteEditorComponent = dynamic(() => import('@/components/editor/summernote/summernote-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center w-full bg-[#f8f9fa] min-h-[450px] p-8 items-center text-slate-500 font-medium">
      Loading Summernote Editor...
    </div>
  ),
})

function getSocketUrl(): string {
  if (typeof window === 'undefined') return ''
  const hostname = window.location.hostname
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')

  if (isLocal) {
    const configured = process.env.NEXT_PUBLIC_COLLAB_WS_URL
    if (configured) {
      const httpUrl = configured.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://')
      return httpUrl.replace('localhost', hostname).replace('127.0.0.1', hostname)
    }
    return `${window.location.protocol}//${hostname}:1234`
  }

  return window.location.origin
}


function parseInitialTabs(initialContent?: string, initialTitle?: string): { tabs: DocumentTab[]; activeTabId: string } {
  if (initialContent) {
    const match = initialContent.match(/<!--MENUSNAP_DOC_TABS:([\s\S]*?)-->/)
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1])
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { tabs: parsed, activeTabId: parsed[0].id }
        }
      } catch (e) {
        console.error('Failed to parse doc tabs:', e)
      }
    }
  }
  return {
    tabs: [{ id: 'tab-1', title: initialTitle || 'Tab 1', content: initialContent || '' }],
    activeTabId: 'tab-1',
  }
}

function serializeContentWithTabs(tabs: DocumentTab[], activeTabId: string): string {
  if (tabs.length <= 1) {
    return (tabs[0]?.content || '').replace(/<!--MENUSNAP_DOC_TABS:[\s\S]*?-->/g, '')
  }
  const cleanTabs = tabs.map((t) => ({
    id: t.id,
    title: t.title,
    content: t.content.replace(/<!--MENUSNAP_DOC_TABS:[\s\S]*?-->/g, ''),
  }))
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
  const cleanActiveContent = (activeTab?.content || '').replace(/<!--MENUSNAP_DOC_TABS:[\s\S]*?-->/g, '')
  return `<!--MENUSNAP_DOC_TABS:${JSON.stringify(cleanTabs)}-->\n${cleanActiveContent}`
}

export default function GoogleDocsApp({
  initialTitle = 'Untitled Document',
  initialContent = '',
  onSave,
  readOnly = false,
  hideHeader = false,
  docId,
  showWatermark = false,
  customPaperHeader,
  isVibeMode = false,
  customActions,
  onUpdateContent,
  onTitleChange,
  hideRuler = false,
  onShare,
}: {
  initialTitle?: string
  initialContent?: string
  onSave?: (data: { title: string; content: string }) => void
  readOnly?: boolean
  hideHeader?: boolean
  docId?: string
  showWatermark?: boolean
  customPaperHeader?: React.ReactNode
  isVibeMode?: boolean
  customActions?: React.ReactNode
  onUpdateContent?: (html: string) => void
  onTitleChange?: (title: string) => void
  hideRuler?: boolean
  onShare?: (mode: 'editor' | 'viewer') => void
}) {
  const [editorMode, setEditorMode] = useState<'google-docs' | 'summernote'>('google-docs')
  const [title, setTitle] = useState(initialTitle)

  // Track active tab with refs to guarantee ZERO data loss across tab switches
  const activeTabIdRef = useRef<string>('tab-1')
  const tabsRef = useRef<DocumentTab[]>([])
  const isSwitchingTabRef = useRef<boolean>(false)
  const isInitializedRef = useRef<boolean>(false)

  const [tabs, setTabs] = useState<DocumentTab[]>(() => {
    const parsed = parseInitialTabs(initialContent, initialTitle)
    activeTabIdRef.current = parsed.activeTabId
    tabsRef.current = parsed.tabs
    return parsed.tabs
  })
  const [activeTabId, setActiveTabId] = useState<string>(activeTabIdRef.current)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [currentReadOnly, setCurrentReadOnly] = useState(readOnly)
  const [content, setContent] = useState<string>(() => {
    const active = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    return active?.content || initialContent || ''
  })

  // Keep tabsRef in sync with state
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  // Handle initial async content from DB without overwriting tabs
  useEffect(() => {
    if (!isInitializedRef.current && initialContent) {
      isInitializedRef.current = true
      const parsed = parseInitialTabs(initialContent, initialTitle)
      tabsRef.current = parsed.tabs
      activeTabIdRef.current = parsed.activeTabId
      setTabs(parsed.tabs)
      setActiveTabId(parsed.activeTabId)
      const activeContent = parsed.tabs.find((t) => t.id === parsed.activeTabId)?.content || initialContent
      setContent(activeContent)
      if (editor) {
        editor.commands.setContent(activeContent, { emitUpdate: false })
      }
    }
  }, [initialContent, initialTitle, editor])

  // Layout & Visibility States
  const [isRulerVisible, setIsRulerVisible] = useState(!hideRuler)
  const [isOutlineOpen, setIsOutlineOpen] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [margins, setMargins] = useState({ left: 56, right: 56, indent: 0, tabStops: [] as any[] })

  // Dialog States
  const [isFindOpen, setIsFindOpen] = useState(false)
  const [isFindReplaceDialogOpen, setIsFindReplaceDialogOpen] = useState(false)
  const [isWordCountOpen, setIsWordCountOpen] = useState(false)
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false)
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false)
  const [isPageNumbersOpen, setIsPageNumbersOpen] = useState(false)
  const [isHeaderFooterDialogOpen, setIsHeaderFooterDialogOpen] = useState(false)
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>({
    headerText: '',
    footerText: '',
    showPageNumber: true,
    pageNumberPosition: 'header',
    showOnFirstPage: true,
  })
  const headerInputRef = useRef<HTMLInputElement>(null)
  const footerInputRef = useRef<HTMLInputElement>(null)
  const [pageNumberConfig, setPageNumberConfig] = useState<PageNumberConfig>({
    enabled: true,
    position: 'header',
    showOnFirstPage: true,
    startAt: 1,
    numberingType: 'startAt',
  })
  const [isPageless, setIsPageless] = useState(false)
  const [columnCount, setColumnCount] = useState<number>(1)

  // Page Setup Config
  const [pageSettings, setPageSettings] = useState({
    orientation: 'portrait' as 'portrait' | 'landscape',
    paperSize: 'letter' as 'letter' | 'a4' | 'legal',
    pageColor: '#ffffff',
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
  })


  const handleFocusHeaderFooter = useCallback((type: 'header' | 'footer') => {
    if (type === 'header') {
      setTimeout(() => headerInputRef.current?.focus(), 60)
    } else {
      setTimeout(() => footerInputRef.current?.focus(), 60)
    }
  }, [])

  // Collaboration Socket State
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])

  // Keep content and title synced when initial values load asynchronously
  useEffect(() => {
    if (initialContent && initialContent !== content && !content) {
      setContent(initialContent)
    }
  }, [initialContent])

  useEffect(() => {
    if (initialTitle && initialTitle !== title) {
      setTitle(initialTitle)
    }
  }, [initialTitle])

  // Responsive outline initial state: auto-collapse on smaller mobile screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOutlineOpen(false)
    }
  }, [])

  // Socket initialization
  useEffect(() => {
    if (!docId) return

    const socketUrl = getSocketUrl()
    if (!socketUrl) return

    let socketInstance: Socket | null = null
    try {
      socketInstance = io(socketUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      })

      const user = { name: getGuestName(), color: getRandomColor() }

      socketInstance.on('connect', () => {
        setIsConnected(true)
        socketInstance?.emit('join-room', { docId, user })
      })

      socketInstance.on('disconnect', () => {
        setIsConnected(false)
      })

      socketInstance.on('connect_error', () => {
        setIsConnected(false)
      })

      socketInstance.on('users-update', (users: any[]) => {
        setOnlineUsers(users)
      })

      setSocket(socketInstance)
    } catch (e) {
      console.warn('Socket connect skipped:', e)
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect()
      }
    }
  }, [docId])

  // Keyboard Shortcuts (Ctrl+F, Ctrl+H, Ctrl+P, Alt+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey

      if (isCtrl && e.key === 'f') {
        e.preventDefault()
        setIsFindOpen(true)
      } else if (isCtrl && e.key === 'h') {
        e.preventDefault()
        setIsFindReplaceDialogOpen(true)
      } else if (isCtrl && e.key === 'p') {
        e.preventDefault()
        window.print()
      } else if (e.altKey && e.key === '/') {
        e.preventDefault()
        setIsCommandSearchOpen(true)
      } else if (isCtrl && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setIsWordCountOpen(true)
      } else if (isCtrl && e.key === '/') {
        e.preventDefault()
        setIsShortcutsOpen(true)
      } else if (e.key === 'Escape') {
        setIsFindOpen(false)
        setIsFindReplaceDialogOpen(false)
        setIsWordCountOpen(false)
        setIsPageSetupOpen(false)
        setIsShortcutsOpen(false)
        setIsImageUploadOpen(false)
        setIsCommandSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title) {
        setIsSaving(true)
        const serialized = serializeContentWithTabs(tabs, activeTabId)
        if (onSave) onSave({ title, content: serialized })
        setTimeout(() => setIsSaving(false), 500)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [title, tabs, activeTabId, onSave])

  // Title sync
  useEffect(() => {
    document.title = `${title} | MenuSnap`
  }, [title])


  const handleContentChange = useCallback((newHtml: string) => {
    if (isSwitchingTabRef.current) return
    setContent(newHtml)
    const currentTabId = activeTabIdRef.current
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === currentTabId ? { ...t, content: newHtml } : t))
      tabsRef.current = updated
      return updated
    })
    if (onUpdateContent) onUpdateContent(newHtml)
  }, [onUpdateContent])

  const handleAddTab = useCallback(() => {
    const currentHtml = editor ? editor.getHTML() : content
    const currentTabId = activeTabIdRef.current
    const currentTabs = tabsRef.current

    const newId = `tab-${Date.now()}`
    const newTitle = `Tab ${currentTabs.length + 1}`
    const newTab: DocumentTab = {
      id: newId,
      title: newTitle,
      content: '<p></p>',
    }

    const updatedTabs = currentTabs.map((t) => (t.id === currentTabId ? { ...t, content: currentHtml } : t))
    const allTabs = [...updatedTabs, newTab]

    isSwitchingTabRef.current = true
    activeTabIdRef.current = newId
    tabsRef.current = allTabs
    setTabs(allTabs)
    setActiveTabId(newId)
    setContent('<p></p>')

    if (editor) {
      editor.commands.setContent('<p></p>', { emitUpdate: false })
      editor.commands.focus()
    }

    setTimeout(() => {
      isSwitchingTabRef.current = false
    }, 100)
  }, [editor, content])

  const handleSelectTab = useCallback((targetTabId: string) => {
    if (targetTabId === activeTabIdRef.current) return

    const currentHtml = editor ? editor.getHTML() : content
    const currentTabId = activeTabIdRef.current
    const currentTabs = tabsRef.current

    const updatedTabs = currentTabs.map((t) => (t.id === currentTabId ? { ...t, content: currentHtml } : t))
    const targetTab = updatedTabs.find((t) => t.id === targetTabId)
    if (!targetTab) return

    isSwitchingTabRef.current = true
    activeTabIdRef.current = targetTabId
    tabsRef.current = updatedTabs
    setTabs(updatedTabs)
    setActiveTabId(targetTabId)
    setContent(targetTab.content)

    if (editor) {
      editor.commands.setContent(targetTab.content, { emitUpdate: false })
      editor.commands.focus()
    }

    setTimeout(() => {
      isSwitchingTabRef.current = false
    }, 100)
  }, [editor, content])

  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    const cleanTitle = newTitle.trim()
    if (!cleanTitle) return
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === tabId ? { ...t, title: cleanTitle } : t))
      tabsRef.current = updated
      return updated
    })
  }, [])

  const handleDuplicateTab = useCallback((tabId: string) => {
    const currentHtml = editor ? editor.getHTML() : content
    const currentTabId = activeTabIdRef.current
    const currentTabs = tabsRef.current
    const targetTab = currentTabs.find((t) => t.id === tabId)
    if (!targetTab) return

    const tabContent = tabId === currentTabId ? currentHtml : targetTab.content
    const newId = `tab-${Date.now()}`
    const newTab: DocumentTab = {
      id: newId,
      title: `${targetTab.title} (Copy)`,
      content: tabContent,
    }

    const index = currentTabs.findIndex((t) => t.id === tabId)
    const updatedCurrent = currentTabs.map((t) => (t.id === currentTabId ? { ...t, content: currentHtml } : t))
    const newTabs = [...updatedCurrent]
    newTabs.splice(index + 1, 0, newTab)

    isSwitchingTabRef.current = true
    activeTabIdRef.current = newId
    tabsRef.current = newTabs
    setTabs(newTabs)
    setActiveTabId(newId)
    setContent(newTab.content)

    if (editor) {
      editor.commands.setContent(newTab.content, { emitUpdate: false })
      editor.commands.focus()
    }

    setTimeout(() => {
      isSwitchingTabRef.current = false
    }, 100)
  }, [editor, content])

  const handleDeleteTab = useCallback((tabId: string) => {
    const currentTabs = tabsRef.current
    if (currentTabs.length <= 1) return
    const remaining = currentTabs.filter((t) => t.id !== tabId)
    if (activeTabIdRef.current === tabId) {
      const nextActive = remaining[0]
      isSwitchingTabRef.current = true
      activeTabIdRef.current = nextActive.id
      tabsRef.current = remaining
      setTabs(remaining)
      setActiveTabId(nextActive.id)
      setContent(nextActive.content)

      if (editor) {
        editor.commands.setContent(nextActive.content, { emitUpdate: false })
        editor.commands.focus()
      }

      setTimeout(() => {
        isSwitchingTabRef.current = false
      }, 100)
    } else {
      tabsRef.current = remaining
      setTabs(remaining)
    }
  }, [editor])

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
      document.title = `${newTitle} | MenuSnap`
      if (onTitleChange) onTitleChange(newTitle)
    },
    [onTitleChange]
  )

  // Download Handlers
  const handleDownloadDocx = async () => {
    if (!editor) return
    try {
      const json = editor.getJSON()
      const blob = await generateDocxFromJSON(json)
      saveAs(blob, `${title || 'document'}.docx`)
    } catch (error) {
      console.error('Failed to export DOCX:', error)
    }
  }

  const handleDownloadPdf = () => {
    window.print()
  }

  const handleDownloadTxt = () => {
    if (!editor) return
    const text = editor.getText()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `${title || 'document'}.txt`)
  }

  const handleDownloadHtml = () => {
    if (!editor) return
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${editor.getHTML()}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    saveAs(blob, `${title || 'document'}.html`)
  }

  // Open Dialog router
  const handleOpenDialog = (dialog: 'wordcount' | 'pagesetup' | 'shortcuts' | 'image' | 'findreplace' | 'pagenumbers' | 'headerfooter') => {
    if (dialog === 'wordcount') setIsWordCountOpen(true)
    else if (dialog === 'pagesetup') setIsPageSetupOpen(true)
    else if (dialog === 'shortcuts') setIsShortcutsOpen(true)
    else if (dialog === 'image') setIsImageUploadOpen(true)
    else if (dialog === 'findreplace') setIsFindReplaceDialogOpen(true)
    else if (dialog === 'pagenumbers') setIsPageNumbersOpen(true)
  }

  // Calculate paper container dimensions based on pageSettings and orientation
  const isLandscape = pageSettings.orientation === 'landscape'
  const maxPaperWidth = isLandscape
    ? pageSettings.paperSize === 'a4'
      ? '1122px'
      : '1056px'
    : pageSettings.paperSize === 'a4'
    ? '794px'
    : '816px'

  return (
    <div
      className="flex flex-col bg-[#f8f9fa] h-screen overflow-hidden shadow-inner font-sans select-text"
      style={
        {
          '--editor-left-margin': `${margins.left}px`,
          '--editor-right-margin': `${margins.right}px`,
          '--editor-first-line-indent': `${margins.indent}px`,
        } as React.CSSProperties
      }
    >
      {/* 1. Header (Docs Icon, Editable Title, Full Menubar & Right Actions) */}
      {!hideHeader && (
        <div className="flex flex-col bg-white border-b border-[#dadce0] shadow-2xs z-40 shrink-0 print:hidden">
          <Header
            title={title}
            onTitleChange={handleTitleChange}
            isSaving={isSaving}
            readOnly={currentReadOnly}
            docId={docId}
            onlineUsers={onlineUsers}
            isConnected={isConnected}
            customActions={customActions}
            onShare={onShare}
            editorMode={editorMode}
            onModeChange={setEditorMode}
            editor={editor}
            onOpenDialog={handleOpenDialog}
            onDownloadDocx={handleDownloadDocx}
            onDownloadPdf={handleDownloadPdf}
            onDownloadTxt={handleDownloadTxt}
            onDownloadHtml={handleDownloadHtml}
            onToggleRuler={() => setIsRulerVisible((prev) => !prev)}
            isRulerVisible={isRulerVisible}
            onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
            isOutlineVisible={isOutlineOpen}
            isPageless={isPageless}
            onTogglePageless={() => setIsPageless((prev) => !prev)}
            onFocusHeaderFooter={handleFocusHeaderFooter}
            orientation={pageSettings.orientation}
            onToggleOrientation={() => setPageSettings(prev => ({ ...prev, orientation: prev.orientation === 'portrait' ? 'landscape' : 'portrait' }))}
            columnCount={columnCount}
            onColumnCountChange={setColumnCount}
          />

          {/* 2. Toolbar & Ruler */}
          {!currentReadOnly && editorMode === 'google-docs' && (
            <div className="flex flex-col print:hidden">
              <Toolbar
                editor={editor}
                title={title}
                isVibeMode={isVibeMode}
                zoom={zoom}
                onZoomChange={setZoom}
                onOpenSearchDialog={() => setIsCommandSearchOpen(true)}
                onOpenImageDialog={() => setIsImageUploadOpen(true)}
                onPrint={() => window.print()}
                readOnly={currentReadOnly}
                onToggleReadOnly={() => setCurrentReadOnly((prev) => !prev)}
              />
              {isRulerVisible && (
                <Ruler
                  onMarginsChange={setMargins}
                  onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
                  isOutlineOpen={isOutlineOpen}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Main Workspace: Left Outline Sidebar + Center Document Sheet */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Document Outline Sidebar */}
        {editorMode === 'google-docs' && (
          <OutlineSidebar
            editor={editor}
            isOpen={isOutlineOpen}
            onToggle={() => setIsOutlineOpen((prev) => !prev)}
            documentTitle={title}
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onAddTab={handleAddTab}
            onRenameTab={handleRenameTab}
            onDuplicateTab={handleDuplicateTab}
            onDeleteTab={handleDeleteTab}
          />
        )}

        {/* Center Scrollable Document Canvas */}
        <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
          <div className="flex justify-center py-6 px-2 sm:py-8 sm:px-6">
            {editorMode === 'summernote' ? (
              <div className="w-full max-w-5xl">
                <SummernoteEditorComponent
                  initialContent={content}
                  readOnly={currentReadOnly}
                  hideRuler={!isRulerVisible}
                  minHeight={500}
                  onChange={(html) => {
                    handleContentChange(html)
                  }}
                />
              </div>
            ) : (
              <div
                className="w-full transition-transform duration-200 flex justify-center"
                style={{
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : 'none',
                  transformOrigin: 'top center',
                }}
              >
                <EditorComponent
                  content={content}
                  onChange={handleContentChange}
                  onReady={setEditor}
                  readOnly={currentReadOnly}
                  showWatermark={showWatermark}
                  customPaperHeader={
                    customPaperHeader || (
                      <div className="w-full px-12 sm:px-16 pt-5 pb-2 text-xs text-gray-500 font-sans border-b border-transparent hover:border-blue-200/60 focus-within:border-blue-400 transition-colors flex items-center justify-between group print:px-8 print:pt-4">
                        <input
                          ref={headerInputRef}
                          type="text"
                          value={headerFooterConfig.headerText}
                          onChange={(e) => setHeaderFooterConfig((prev) => ({ ...prev, headerText: e.target.value }))}
                          placeholder="Header (click to edit)..."
                          className="bg-transparent border-none outline-none text-xs text-gray-700 placeholder:text-gray-300 focus:placeholder:text-gray-400 flex-1 mr-4 focus:text-gray-900 font-sans"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          {headerFooterConfig.showPageNumber && headerFooterConfig.pageNumberPosition === 'header' && (
                            <span
                              onClick={() => setIsPageNumbersOpen(true)}
                              className="cursor-pointer hover:bg-gray-100 hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors text-xs font-normal"
                              title="Page numbers (click to configure)"
                            >
                              {pageNumberConfig.startAt}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  }
                  customPaperFooter={
                    <div className="w-full px-12 sm:px-16 pb-6 pt-3 text-xs text-gray-500 font-sans border-t border-transparent hover:border-blue-200/60 focus-within:border-blue-400 transition-colors flex items-center justify-between group print:px-8 print:pb-4">
                      <input
                        ref={footerInputRef}
                        type="text"
                        value={headerFooterConfig.footerText}
                        onChange={(e) => setHeaderFooterConfig((prev) => ({ ...prev, footerText: e.target.value }))}
                        placeholder="Footer (click to edit)..."
                        className="bg-transparent border-none outline-none text-xs text-gray-700 placeholder:text-gray-300 focus:placeholder:text-gray-400 flex-1 mr-4 focus:text-gray-900 font-sans"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        {headerFooterConfig.showPageNumber && headerFooterConfig.pageNumberPosition === 'footer' && (
                          <span
                            onClick={() => setIsPageNumbersOpen(true)}
                            className="cursor-pointer hover:bg-gray-100 hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors text-xs font-normal"
                            title="Page numbers (click to configure)"
                          >
                            {pageNumberConfig.startAt}
                          </span>
                        )}
                      </div>
                    </div>
                  }
                  tabStops={margins.tabStops}
                  docId={docId}
                  socket={socket}
                  onlineUsers={onlineUsers}
                  onUpdateContent={onUpdateContent}
                  columnCount={columnCount}
                  maxPaperWidth={maxPaperWidth}
                  pageColor={pageSettings.pageColor}
                  isPageless={isPageless}
                  activeTabId={activeTabId}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ======================================================== */}
      {/* Dialog Modals                                            */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isFindOpen && (
          <FindReplace
            isOpen={isFindOpen}
            onClose={() => setIsFindOpen(false)}
            editor={editor}
            onOpenDialog={() => {
              setIsFindOpen(false)
              setIsFindReplaceDialogOpen(true)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFindReplaceDialogOpen && (
          <FindReplaceDialog
            isOpen={isFindReplaceDialogOpen}
            onClose={() => setIsFindReplaceDialogOpen(false)}
            editor={editor}
          />
        )}
      </AnimatePresence>

      <WordCountDialog
        isOpen={isWordCountOpen}
        onClose={() => setIsWordCountOpen(false)}
        editor={editor}
      />

      <PageSetupDialog
        isOpen={isPageSetupOpen}
        onClose={() => setIsPageSetupOpen(false)}
        pageSettings={pageSettings}
        onApply={(updated) => setPageSettings(updated)}
      />

      <KeyboardShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <ImageUploadDialog
        isOpen={isImageUploadOpen}
        onClose={() => setIsImageUploadOpen(false)}
        editor={editor}
      />

      <CommandSearchDialog
        isOpen={isCommandSearchOpen}
        onClose={() => setIsCommandSearchOpen(false)}
        editor={editor}
        onAction={(actionKey) => {
          if (actionKey === 'wordcount') setIsWordCountOpen(true)
          else if (actionKey === 'pagesetup') setIsPageSetupOpen(true)
          else if (actionKey === 'image') setIsImageUploadOpen(true)
          else if (actionKey === 'downloadDocx') handleDownloadDocx()
          else if (actionKey === 'findReplace') setIsFindReplaceDialogOpen(true)
        }}
      />

      {/* Global CSS for Google Docs Paper, Tables, Selections, and Print */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .search-result {
          background-color: #ceead6;
          color: black;
          border-radius: 2px;
        }

        .search-result-current {
          background-color: #f7e200;
          color: black;
          border-radius: 2px;
          box-shadow: 0 0 0 1px #fbc02d;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }


        /* Page break in web view: visually divides the page like Google Docs */
        .doc-page-break {
          position: relative;
          display: block;
          width: calc(100% + var(--editor-left-margin, 56px) + var(--editor-right-margin, 56px));
          margin-left: calc(-1 * var(--editor-left-margin, 56px));
          margin-right: calc(-1 * var(--editor-right-margin, 56px));
          margin-top: 2rem;
          margin-bottom: 2rem;
          user-select: none;
          cursor: pointer;
        }

        .doc-page-break-inner {
          height: 24px;
          background-color: #f1f3f4;
          border-top: 1px solid #dadce0;
          border-bottom: 1px solid #dadce0;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .doc-page-break-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #70757a;
          background-color: #f1f3f4;
          padding: 0 12px;
        }

        @media print {
          .doc-page-break {
            display: none !important;
            page-break-before: always !important;
            break-before: page !important;
          }
        }

        .multi-selection-highlight {
          background-color: #c2e7ff !important;
          color: inherit !important;
          border-radius: 2px;
        }

        .ProseMirror {
          user-select: text !important;
          -webkit-user-select: text !important;
          padding-left: var(--editor-left-margin, 56px);
          padding-right: var(--editor-right-margin, 56px);
          font-family: 'Arial', 'Roboto', 'Inter', system-ui, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #202124;
          transition: all 0.2s ease;
          white-space: pre-wrap;
          tab-size: 4;
          -moz-tab-size: 4;
          min-height: 1056px;
        }

        @media (max-width: 640px) {
          .ProseMirror {
             padding-left: 16px !important;
             padding-right: 16px !important;
          }
        }

        /* Standard Google Docs Table Styles */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
        }

        .ProseMirror td,
        .ProseMirror th {
          min-width: 2em;
          border: 1px solid #dadce0;
          padding: 8px 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }

        .ProseMirror th {
          font-weight: bold;
          background-color: #f8f9fa;
          color: #202124;
        }

        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(66, 133, 244, 0.15);
          pointer-events: none;
        }

        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #4285f4;
          pointer-events: none;
        }

        .ProseMirror * {
          user-select: text;
        }

        .ProseMirror ::selection {
          background-color: #c2e7ff;
        }

        .ProseMirror p {
          text-indent: var(--editor-first-line-indent, 0px);
          margin-bottom: 0;
        }

        .ProseMirror h1 { font-size: 20pt; font-weight: bold; margin-bottom: 12px; color: #202124; }
        .ProseMirror h2 { font-size: 16pt; font-weight: bold; margin-bottom: 8px; color: #202124; }
        .ProseMirror h3 { font-size: 13pt; font-weight: bold; margin-bottom: 6px; color: #3c4043; }

        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror li {
          margin-bottom: 0.25rem;
        }

        .ProseMirror blockquote {
          border-left: 3px solid #dadce0;
          padding-left: 1rem;
          color: #5f6368;
          font-style: italic;
          margin-bottom: 1rem;
        }

        ::selection {
          background: #c2dbff;
          color: #000;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f3f4;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #dadce0;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #bdc1c6;
        }

        /* Clean Print View: Hides UI chrome and centers document pages */
        @media print {
          @page {
            margin: 0.5in;
          }
          header, aside, .print\\:hidden, div[role="toolbar"] {
            display: none !important;
          }
          body, html, main, .bg-\\[\\#f8f9fa\\] {
            background: white !important;
            overflow: visible !important;
            height: auto !important;
          }
          .shadow-lg, .shadow-xl, .shadow-md {
            box-shadow: none !important;
          }
          .border, .border-gray-200 {
            border: none !important;
          }
          .ProseMirror {
            padding: 0 !important;
            min-height: auto !important;
          }
        }
      `,
        }}
      />
    </div>
  )
}
