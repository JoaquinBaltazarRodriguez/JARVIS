"use client";

import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Palette,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Code,
  Minus,
  Table as TableIcon,
  Highlighter,
  Strikethrough
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface AdvancedRichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function AdvancedRichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Escribe aquí tu contenido...', 
  className = '' 
}: AdvancedRichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-full focus:outline-none min-h-[400px] p-4 break-words overflow-wrap-anywhere word-break-break-all',
      },
    },
  });

  // Auto-formato para ## y /h1
  React.useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

        // Auto-formato para subtítulos (##)
        if (textBefore.endsWith('##')) {
          event.preventDefault();
          editor
            .chain()
            .focus()
            .deleteRange({ from: $from.pos - 2, to: $from.pos })
            .setHeading({ level: 2 })
            .run();
          return;
        }

        // Auto-formato para títulos (/h1)
        if (textBefore.endsWith('/h1')) {
          event.preventDefault();
          editor
            .chain()
            .focus()
            .deleteRange({ from: $from.pos - 3, to: $from.pos })
            .setHeading({ level: 1 })
            .run();
          return;
        }

        // Auto-formato para título 3 (/h3)
        if (textBefore.endsWith('/h3')) {
          event.preventDefault();
          editor
            .chain()
            .focus()
            .deleteRange({ from: $from.pos - 3, to: $from.pos })
            .setHeading({ level: 3 })
            .run();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('URL de la imagen:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (showLinkInput) {
      if (linkUrl) {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setShowLinkInput(false);
      setLinkUrl('');
    } else {
      setShowLinkInput(true);
    }
  }, [editor, linkUrl, showLinkInput]);

  const addTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  }, [editor]);

  if (!editor) {
    return <div className="h-96 bg-gray-900 rounded-lg animate-pulse" />;
  }

  const ToolbarButton = ({ 
    onClick, 
    icon: Icon, 
    title, 
    isActive = false,
    disabled = false 
  }: { 
    onClick: () => void; 
    icon: any; 
    title: string; 
    isActive?: boolean;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 ${
        isActive 
          ? 'bg-cyan-600 text-white' 
          : 'hover:bg-gray-700 text-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={`border border-gray-700 rounded-lg bg-gray-900 ${className}`}>
      {/* Barra de herramientas */}
      <div className="border-b border-gray-700 p-3 flex flex-wrap gap-1 bg-gray-800/50">
        {/* Grupo de formato básico */}
        <div className="flex gap-1 border-r border-gray-600 pr-3 mr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={Bold}
            title="Negrita (Ctrl+B)"
            isActive={editor.isActive('bold')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={Italic}
            title="Cursiva (Ctrl+I)"
            isActive={editor.isActive('italic')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            icon={UnderlineIcon}
            title="Subrayado (Ctrl+U)"
            isActive={editor.isActive('underline')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            icon={Strikethrough}
            title="Tachado"
            isActive={editor.isActive('strike')}
          />
        </div>

        {/* Grupo de títulos */}
        <div className="flex gap-1 border-r border-gray-600 pr-3 mr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            icon={Heading1}
            title="Título 1 (o escribe /h1 + espacio)"
            isActive={editor.isActive('heading', { level: 1 })}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            icon={Heading2}
            title="Título 2 (o escribe ## + espacio)"
            isActive={editor.isActive('heading', { level: 2 })}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            icon={Heading3}
            title="Título 3 (o escribe /h3 + espacio)"
            isActive={editor.isActive('heading', { level: 3 })}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            icon={Type}
            title="Texto normal"
            isActive={editor.isActive('paragraph')}
          />
        </div>

        {/* Grupo de alineación */}
        <div className="flex gap-1 border-r border-gray-600 pr-3 mr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            icon={AlignLeft}
            title="Alinear a la izquierda"
            isActive={editor.isActive({ textAlign: 'left' })}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            icon={AlignCenter}
            title="Centrar"
            isActive={editor.isActive({ textAlign: 'center' })}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            icon={AlignRight}
            title="Alinear a la derecha"
            isActive={editor.isActive({ textAlign: 'right' })}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            icon={AlignJustify}
            title="Justificar"
            isActive={editor.isActive({ textAlign: 'justify' })}
          />
        </div>

        {/* Grupo de listas */}
        <div className="flex gap-1 border-r border-gray-600 pr-3 mr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon={List}
            title="Lista con viñetas"
            isActive={editor.isActive('bulletList')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            icon={ListOrdered}
            title="Lista numerada"
            isActive={editor.isActive('orderedList')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            icon={Quote}
            title="Cita"
            isActive={editor.isActive('blockquote')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            icon={Code}
            title="Código"
            isActive={editor.isActive('code')}
          />
        </div>

        {/* Grupo de colores y resaltado */}
        <div className="flex gap-1 border-r border-gray-600 pr-3 mr-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Color del texto">
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-600">
              {[
                { name: 'Negro', value: '#000000' },
                { name: 'Blanco', value: '#ffffff' },
                { name: 'Rojo', value: '#ef4444' },
                { name: 'Verde', value: '#22c55e' },
                { name: 'Azul', value: '#3b82f6' },
                { name: 'Amarillo', value: '#f59e0b' },
                { name: 'Púrpura', value: '#8b5cf6' },
                { name: 'Cian', value: '#06b6d4' },
              ].map((color) => (
                <DropdownMenuItem
                  key={color.value}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                  className="flex items-center gap-2 text-white hover:bg-gray-700"
                >
                  <div 
                    className="w-4 h-4 rounded border border-gray-500" 
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Resaltar texto">
                <Highlighter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-600">
              {[
                { name: 'Sin resaltado', value: 'transparent' },
                { name: 'Amarillo', value: '#fef3c7' },
                { name: 'Verde', value: '#dcfce7' },
                { name: 'Azul', value: '#dbeafe' },
                { name: 'Rosa', value: '#fce7f3' },
                { name: 'Púrpura', value: '#e9d5ff' },
              ].map((highlight) => (
                <DropdownMenuItem
                  key={highlight.value}
                  onClick={() => 
                    highlight.value === 'transparent' 
                      ? editor.chain().focus().unsetHighlight().run()
                      : editor.chain().focus().setHighlight({ color: highlight.value }).run()
                  }
                  className="flex items-center gap-2 text-white hover:bg-gray-700"
                >
                  <div 
                    className="w-4 h-4 rounded border border-gray-500" 
                    style={{ backgroundColor: highlight.value }}
                  />
                  {highlight.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Grupo de elementos */}
        <div className="flex gap-1 border-r border-gray-600 pr-3 mr-3">
          <ToolbarButton
            onClick={setLink}
            icon={LinkIcon}
            title="Insertar enlace"
            isActive={editor.isActive('link')}
          />
          <ToolbarButton
            onClick={addImage}
            icon={ImageIcon}
            title="Insertar imagen"
          />
          <ToolbarButton
            onClick={addTable}
            icon={TableIcon}
            title="Insertar tabla"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            icon={Minus}
            title="Línea horizontal"
          />
        </div>

        {/* Grupo de deshacer/rehacer */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            title="Deshacer (Ctrl+Z)"
            disabled={!editor.can().undo()}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            title="Rehacer (Ctrl+Shift+Z)"
            disabled={!editor.can().redo()}
          />
        </div>
      </div>

      {/* Input para enlaces */}
      {showLinkInput && (
        <div className="border-b border-gray-700 p-3 bg-gray-800/30">
          <div className="flex gap-2 items-center">
            <Input
              type="url"
              placeholder="https://ejemplo.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setLink();
                } else if (e.key === 'Escape') {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }
              }}
            />
            <Button onClick={setLink} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
              Agregar
            </Button>
            <Button 
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl('');
              }} 
              variant="ghost" 
              size="sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Editor de contenido */}
      <div className="relative">
        <div className="w-full overflow-hidden">
          <EditorContent 
            editor={editor} 
            className="min-h-[400px] text-white bg-gray-900 rounded-b-lg w-full
              [&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:max-w-full [&_.ProseMirror]:overflow-hidden [&_.ProseMirror]:break-all [&_.ProseMirror]:whitespace-pre-wrap
              [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:text-cyan-400 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:break-all [&_.ProseMirror_h1]:whitespace-pre-wrap
              [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:text-cyan-300 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:break-all [&_.ProseMirror_h2]:whitespace-pre-wrap
              [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_h3]:text-cyan-200 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:break-all [&_.ProseMirror_h3]:whitespace-pre-wrap
              [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p]:break-all [&_.ProseMirror_p]:whitespace-pre-wrap
              [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ul]:mb-3
              [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_ol]:mb-3
              [&_.ProseMirror_li]:mb-1 [&_.ProseMirror_li]:break-all [&_.ProseMirror_li]:whitespace-pre-wrap
              [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-cyan-500 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-gray-300 [&_.ProseMirror_blockquote]:break-all [&_.ProseMirror_blockquote]:whitespace-pre-wrap
              [&_.ProseMirror_code]:bg-gray-800 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-cyan-300 [&_.ProseMirror_code]:break-all
              [&_.ProseMirror_pre]:bg-gray-800 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:break-all
              [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:table-auto [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:mb-4
              [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-600 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_td]:break-all [&_.ProseMirror_td]:max-w-0
              [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-600 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-800 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_th]:break-all [&_.ProseMirror_th]:max-w-0
              [&_.ProseMirror_hr]:border-gray-600 [&_.ProseMirror_hr]:my-6
            "
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap'
            }}
          />
        </div>
        
        {/* Placeholder cuando está vacío */}
        {editor.isEmpty && (
          <div className="absolute top-4 left-4 text-gray-500 pointer-events-none">
            <div>{placeholder}</div>
            <div className="text-sm mt-2 text-gray-600">
              💡 Consejos: Escribe <code>##</code> + espacio para subtítulos, <code>/h1</code> + espacio para títulos
            </div>
          </div>
        )}
      </div>

      {/* Información de atajos */}
      <div className="border-t border-gray-700 px-4 py-2 text-xs text-gray-500 bg-gray-800/30">
        <div className="flex flex-wrap gap-4">
          <span><kbd className="bg-gray-700 px-1 rounded">Ctrl+B</kbd> Negrita</span>
          <span><kbd className="bg-gray-700 px-1 rounded">Ctrl+I</kbd> Cursiva</span>
          <span><kbd className="bg-gray-700 px-1 rounded">Ctrl+U</kbd> Subrayado</span>
          <span><kbd className="bg-gray-700 px-1 rounded">##</kbd> + Espacio = Subtítulo</span>
          <span><kbd className="bg-gray-700 px-1 rounded">/h1</kbd> + Espacio = Título</span>
          <span><kbd className="bg-gray-700 px-1 rounded">/h3</kbd> + Espacio = Título 3</span>
        </div>
      </div>
    </div>
  );
}
