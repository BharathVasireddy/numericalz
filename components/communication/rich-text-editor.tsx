'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  List, 
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Table as TableIcon,
  Type,
  Palette,
  ChevronDown,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  EMAIL_VARIABLES, 
  VARIABLES_BY_CATEGORY, 
  CATEGORY_LABELS,
  formatVariable,
  type EmailVariable
} from '@/lib/email-variables'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  templateCategory?: string
  placeholder?: string
  className?: string
}

const categoryIcons = {
  client: '👤',
  user: '👨‍💼', 
  workflow: '🔄',
  dates: '📅',
  system: '⚙️'
}

export function RichTextEditor({ 
  content, 
  onChange, 
  templateCategory,
  placeholder = "Start writing your email template...",
  className 
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
        protocols: ['mailto', 'tel'],
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-50 font-medium',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      TextStyle,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onCreate: ({ editor }) => {
      // Ensure editor is properly initialized
      if (content && !editor.getText()) {
        editor.commands.setContent(content)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4 border-0 outline-none',
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          // Handle keyboard shortcuts
          if (event.key === 'Enter' && event.metaKey) {
            event.preventDefault()
            return true
          }
          return false
        },
      },
    },
  })

  const insertVariable = useCallback((variable: EmailVariable) => {
    if (editor) {
      const formattedVariable = formatVariable(variable.key)
      editor.chain().focus().insertContent(formattedVariable).run()
      toast.success(`Inserted: ${formattedVariable}`)
    }
  }, [editor])

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setShowLinkInput(false)
    }
  }, [editor, linkUrl])

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const insertTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }, [editor])

  if (!editor) {
    return <div className="animate-pulse bg-muted h-64 rounded-md" />
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children,
    title 
  }: { 
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled && editor) {
          onClick()
          editor.chain().focus().run()
        }
      }}
      disabled={disabled}
      className={`h-9 w-9 p-0 transition-all ${
        isActive 
          ? 'bg-primary text-primary-foreground shadow-sm' 
          : 'hover:bg-muted hover:text-foreground'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={title}
    >
      {children}
    </Button>
  )

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'visual' | 'code')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addImage}>
            <ImageIcon className="h-5 w-5 mr-2" />
            Add media
          </Button>
          
          {/* Add Shortcodes Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Add Shortcodes
                <ChevronDown className="h-5 w-5 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
              {Object.entries(VARIABLES_BY_CATEGORY).map(([category, variables]) => (
                <div key={category}>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                    {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                  </DropdownMenuLabel>
                  {variables.slice(0, 8).map((variable) => (
                    <DropdownMenuItem
                      key={variable.key}
                      onClick={() => insertVariable(variable)}
                      className="flex flex-col items-start p-3"
                    >
                      <div className="font-medium text-sm">{variable.label}</div>
                      <div className="text-xs text-muted-foreground">{formatVariable(variable.key)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{variable.example}</div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {activeTab === 'visual' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-3 border-b bg-muted/25">
            {/* Format Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Paragraph <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                  Paragraph
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                  Heading 3
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Basic Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-5 w-5" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Quote and Link */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="h-5 w-5" />
            </ToolbarButton>

            {!showLinkInput ? (
              <ToolbarButton 
                onClick={() => setShowLinkInput(true)}
                title="Add Link"
              >
                <LinkIcon className="h-5 w-5" />
              </ToolbarButton>
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Enter URL"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-32 h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addLink()
                    if (e.key === 'Escape') setShowLinkInput(false)
                  }}
                />
                <Button size="sm" onClick={addLink}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>×</Button>
              </div>
            )}

            <div className="w-px h-6 bg-border mx-1" />

            {/* Alignment */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Align Left"
            >
              <AlignLeft className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Align Center"
            >
              <AlignCenter className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Align Right"
            >
              <AlignRight className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Table */}
            <ToolbarButton 
              onClick={insertTable}
              title="Insert Table"
            >
              <TableIcon className="h-5 w-5" />
            </ToolbarButton>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-5 w-5" />
            </ToolbarButton>
          </div>

          {/* Editor Content */}
          <div className="min-h-[300px]">
            <EditorContent editor={editor} />
          </div>
        </>
      )}

      {activeTab === 'code' && (
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[300px] font-mono text-sm border rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
          />
        </div>
      )}
    </div>
  )
} 