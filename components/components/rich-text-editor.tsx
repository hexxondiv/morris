'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button } from '@/components/ui/button'

type Props = {
  value?: string
  onChange?: (value: string) => void
}

export default function RichTextEditor({ value = '', onChange }: Props) {
const editor = useEditor({
  extensions: [StarterKit],
  content: value,
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    onChange?.(html)
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
    },
  },
  // 🔥 This prevents SSR issues
  autofocus: false,
  editable: true,
  injectCSS: true,
  parseOptions: {
    preserveWhitespace: 'full',
  },
  // 👇 THIS is the key part
  immediatelyRender: false,
})


  if (!editor) return <p>Loading editor...</p>

  return (
    <div className="border rounded-md p-4 space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <Button
          variant={editor.isActive('bold') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Clear
        </Button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[200px] mt-2" />
    </div>
  )
}
