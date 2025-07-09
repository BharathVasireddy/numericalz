'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
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
  Type,
  Palette,
  ChevronDown,
  Upload,
  Edit,
  Trash2
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'tiptap-bullet-list',
            style: 'list-style-type: disc; margin-left: 1.5rem; padding-left: 0.5rem;',
          },
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          HTMLAttributes: {
            class: 'tiptap-ordered-list',
            style: 'list-style-type: decimal; margin-left: 1.5rem; padding-left: 0.5rem;',
          },
          keepMarks: true,
          keepAttributes: true,
        },
        listItem: {
          HTMLAttributes: {
            class: 'tiptap-list-item',
            style: 'margin-bottom: 0.25rem; line-height: 1.6;',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'tiptap-blockquote',
            style: 'border-left: 4px solid #d1d5db; padding-left: 1rem; font-style: italic; color: #6b7280; margin: 1rem 0;',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'tiptap-paragraph',
            style: 'margin-bottom: 0.75rem; line-height: 1.6;',
          },
        },
        hardBreak: {
          HTMLAttributes: {
            class: 'tiptap-hard-break',
          },
          keepMarks: false,
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link text-blue-600 underline cursor-pointer hover:text-blue-800 transition-colors',
          rel: 'noopener noreferrer',
        },
        protocols: ['mailto', 'tel', 'http', 'https'],
        linkOnPaste: true,
        autolink: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
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
        class: 'tiptap-editor prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
        style: 'line-height: 1.6; word-break: break-word;',
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          // Handle Enter key in lists properly
          if (event.key === 'Enter') {
            const { state } = view
            const { selection } = state
            const { $from } = selection
            
            // Check if we're in a list
            if ($from.parent.type.name === 'listItem') {
              // Let TipTap handle list item creation naturally
              return false
            }
          }
          return false
        },
        paste: (view, event) => {
          // Handle pasted images from clipboard
          const clipboardData = event.clipboardData || (event as any).originalEvent?.clipboardData
          
          if (clipboardData && clipboardData.files && clipboardData.files.length > 0) {
            const file = clipboardData.files[0]
            if (file && file.type.startsWith('image/')) {
              event.preventDefault()
              
              // Convert file to base64
              const reader = new FileReader()
              reader.onload = (e) => {
                const base64 = e.target?.result as string
                if (base64 && editor) {
                  editor.chain().focus().setImage({ src: base64 }).run()
                  toast.success('Image pasted successfully')
                }
              }
              reader.readAsDataURL(file)
              
              return true
            }
          }
          return false
        },
        drop: (view, event) => {
          // Handle dropped images
          const files = event.dataTransfer?.files
          
          if (files && files.length > 0) {
            const file = files[0]
            if (file && file.type.startsWith('image/')) {
              event.preventDefault()
              
              // Convert file to base64
              const reader = new FileReader()
              reader.onload = (e) => {
                const base64 = e.target?.result as string
                if (base64 && editor) {
                  editor.chain().focus().setImage({ src: base64 }).run()
                  toast.success('Image dropped successfully')
                }
              }
              reader.readAsDataURL(file)
              
              return true
            }
          }
          return false
        },
        dragover: (view, event) => {
          // Allow drag over for image files
          const files = event.dataTransfer?.files
          if (files && files.length > 0) {
            const file = files[0]
            if (file && file.type.startsWith('image/')) {
              event.preventDefault()
              return true
            }
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



    const addImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file && editor) {
        // Convert file to base64
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          if (base64) {
            editor.chain().focus().setImage({ src: base64 }).run()
            toast.success('Image added successfully')
          }
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }, [editor])

  // Enhanced URL validation for web, email, and phone links
  const isValidUrl = (url: string): boolean => {
    const cleanUrl = url.trim()
    
    // Check for mailto: links
    if (cleanUrl.startsWith('mailto:')) {
      const email = cleanUrl.replace('mailto:', '')
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }
    
    // Check for tel: links
    if (cleanUrl.startsWith('tel:')) {
      const phone = cleanUrl.replace('tel:', '')
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,}$/
      return phoneRegex.test(phone)
    }
    
    // Check for http/https URLs
    try {
      const urlObj = cleanUrl.startsWith('http') ? new URL(cleanUrl) : new URL(`https://${cleanUrl}`)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const addLink = useCallback(() => {
    if (!editor) return
    
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to).trim()
    
    if (selectedText) {
      // User has selected text, turn it into a link
      const url = window.prompt('Enter link URL (web, email, or phone):\nExamples:\n• https://example.com\n• mailto:email@domain.com\n• tel:+1234567890', 'https://')
      if (url && url.trim() !== '' && url !== 'https://') {
        const cleanUrl = url.trim()
        if (isValidUrl(cleanUrl)) {
          const finalUrl = cleanUrl.startsWith('http') || cleanUrl.startsWith('mailto:') || cleanUrl.startsWith('tel:') 
            ? cleanUrl 
            : `https://${cleanUrl}`
          editor.chain().focus().setLink({ href: finalUrl }).run()
          toast.success('Link added successfully')
        } else {
          toast.error('Please enter a valid URL, email (mailto:), or phone number (tel:)')
        }
      }
    } else {
      // No text selected, insert a new link
      const url = window.prompt('Enter link URL (web, email, or phone):\nExamples:\n• https://example.com\n• mailto:email@domain.com\n• tel:+1234567890', 'https://')
      if (url && url.trim() !== '' && url !== 'https://') {
        const cleanUrl = url.trim()
        if (isValidUrl(cleanUrl)) {
          const finalUrl = cleanUrl.startsWith('http') || cleanUrl.startsWith('mailto:') || cleanUrl.startsWith('tel:') 
            ? cleanUrl 
            : `https://${cleanUrl}`
          const linkText = window.prompt('Enter link text:', cleanUrl) || cleanUrl
          if (linkText && linkText.trim()) {
            editor.chain().focus().insertContent(`<a href="${finalUrl}">${linkText.trim()}</a> `).run()
            toast.success('Link inserted successfully')
          }
        } else {
          toast.error('Please enter a valid URL, email (mailto:), or phone number (tel:)')
        }
      }
    }
  }, [editor])

  const editLink = useCallback(() => {
    if (!editor) return
    
    const currentLink = editor.getAttributes('link')
    const currentUrl = currentLink.href || ''
    const newUrl = window.prompt('Enter new link URL (web, email, or phone):\nExamples:\n• https://example.com\n• mailto:email@domain.com\n• tel:+1234567890', currentUrl)
    
    if (newUrl !== null && newUrl.trim() !== '' && newUrl !== currentUrl) {
      const cleanUrl = newUrl.trim()
      if (isValidUrl(cleanUrl)) {
        const finalUrl = cleanUrl.startsWith('http') || cleanUrl.startsWith('mailto:') || cleanUrl.startsWith('tel:') 
          ? cleanUrl 
          : `https://${cleanUrl}`
        editor.chain().focus().setLink({ href: finalUrl }).run()
        toast.success('Link updated successfully')
      } else {
        toast.error('Please enter a valid URL, email (mailto:), or phone number (tel:)')
      }
    }
  }, [editor])

  const removeLink = useCallback(() => {
    if (!editor) return
    
    editor.chain().focus().unsetLink().run()
    toast.success('Link removed successfully')
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
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) {
          onClick()
        }
      }}
      disabled={disabled}
      className="h-9 w-9 p-0"
      title={title}
    >
      {children}
    </Button>
  )

  return (
    <div className={`border rounded-lg ${className}`}>
      <style jsx global>{`
        .tiptap-editor {
          outline: none !important;
        }
        
        /* Fix text selection styling */
        .tiptap-editor ::selection {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        .tiptap-editor ::-moz-selection {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        .tiptap-editor .tiptap-bullet-list {
          list-style-type: disc !important;
          margin-left: 1.5rem !important;
          padding-left: 0.5rem !important;
          margin-bottom: 0.75rem !important;
        }
        
        .tiptap-editor .tiptap-ordered-list {
          list-style-type: decimal !important;
          margin-left: 1.5rem !important;
          padding-left: 0.5rem !important;
          margin-bottom: 0.75rem !important;
        }
        
        .tiptap-editor .tiptap-list-item {
          margin-bottom: 0.25rem !important;
          line-height: 1.6 !important;
          list-style-position: outside !important;
        }
        
        .tiptap-editor .tiptap-paragraph {
          margin-bottom: 0.75rem !important;
          line-height: 1.6 !important;
        }
        
        .tiptap-editor .tiptap-blockquote {
          border-left: 4px solid #d1d5db !important;
          padding-left: 1rem !important;
          font-style: italic !important;
          color: #6b7280 !important;
          margin: 1rem 0 !important;
        }
        
        .tiptap-editor .tiptap-link {
          color: #2563eb !important;
          text-decoration: underline !important;
          cursor: pointer !important;
          transition: color 0.2s ease !important;
        }
        
        .tiptap-editor .tiptap-link:hover {
          color: #1d4ed8 !important;
        }
        
        .tiptap-editor p:last-child {
          margin-bottom: 0 !important;
        }
        
        .tiptap-editor ul:last-child,
        .tiptap-editor ol:last-child {
          margin-bottom: 0 !important;
        }
        
        .tiptap-editor .tiptap-hard-break {
          display: block !important;
          height: 1em !important;
          width: 0 !important;
        }
      `}</style>
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
            Add Image
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={editor.isActive('link') ? "default" : "ghost"}
                  size="sm"
                  className="h-9 w-9 p-0"
                  title="Link Options"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <LinkIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom">
                {!editor.isActive('link') ? (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault()
                      addLink()
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Add Link
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault()
                        editLink()
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Link
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault()
                        removeLink()
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Link
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
            className="w-full min-h-[300px] font-mono text-sm border rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
            placeholder={placeholder}
            style={{
              backgroundColor: 'white',
              color: '#111827',
              lineHeight: '1.5'
            }}
          />
        </div>
      )}
    </div>
  )
} 