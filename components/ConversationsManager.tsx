"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MessageCircle, Edit2, Trash2, Plus, X } from "lucide-react"
import { ConversationsDB, type Conversation } from "@/lib/conversations"

interface ConversationsManagerProps {
  isOpen: boolean
  onClose: () => void
  currentConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
}

export function ConversationsManager({
  isOpen,
  onClose,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationsManagerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen])

  const loadConversations = () => {
    const allConversations = ConversationsDB.getAll()
    setConversations(allConversations)
  }

  const handleEdit = (conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      ConversationsDB.updateTitle(editingId, editTitle.trim())
      loadConversations()
      setEditingId(null)
      setEditTitle("")
    }
  }

  const handleDelete = (conversationId: string) => {
    if (confirm("¿Está seguro de eliminar esta conversación?")) {
      ConversationsDB.delete(conversationId)
      loadConversations()
    }
  }

  const handleNewConversation = () => {
    onNewConversation()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-900/95 border-cyan-500/30 p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <MessageCircle className="h-6 w-6 text-cyan-400 mr-3" />
            <h2 className="text-xl font-bold text-cyan-400">Historial de Conversaciones</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleNewConversation} className="bg-cyan-600 hover:bg-cyan-700 text-white" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-cyan-400">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No hay conversaciones guardadas</p>
              <Button onClick={handleNewConversation} className="bg-cyan-600 hover:bg-cyan-700 text-white mt-4">
                Crear primera conversación
              </Button>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  currentConversationId === conversation.id
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-gray-600 bg-gray-800/50 hover:border-cyan-500/50"
                }`}
                onClick={() => {
                  if (!editingId) {
                    onSelectConversation(conversation.id)
                    onClose()
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {editingId === conversation.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 bg-gray-700 border border-cyan-500/30 rounded px-2 py-1 text-cyan-100 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") handleSaveEdit()
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          autoFocus
                        />
                        <Button onClick={handleSaveEdit} size="sm" className="bg-green-600 hover:bg-green-700">
                          ✓
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="outline"
                          className="border-gray-500"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium text-cyan-100 mb-1">{conversation.title}</h3>
                        <p className="text-gray-400 text-sm">
                          {conversation.messages.length} mensajes • {conversation.updatedAt.toLocaleDateString()}
                        </p>
                        {conversation.messages.length > 0 && (
                          <p className="text-gray-500 text-xs mt-1 truncate">
                            Último: {conversation.messages[conversation.messages.length - 1].text.substring(0, 50)}...
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {editingId !== conversation.id && (
                    <div className="flex gap-1 ml-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(conversation)
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-cyan-400"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(conversation.id)
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm text-center">
            💡 Las conversaciones mantienen el contexto para que JARVIS recuerde el historial
          </p>
        </div>
      </Card>
    </div>
  )
}
