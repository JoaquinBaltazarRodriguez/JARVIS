"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ContactsDB, type Contact } from "@/lib/database"
import { Phone, Plus, Trash2, X } from "lucide-react"

interface ContactsManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function ContactsManager({ isOpen, onClose }: ContactsManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setContacts(ContactsDB.getAll())
    }
  }, [isOpen])

  const handleAdd = () => {
    if (newName.trim() && newPhone.trim()) {
      const contact = ContactsDB.add(newName, newPhone)
      setContacts(ContactsDB.getAll())
      setNewName("")
      setNewPhone("")
      setIsAdding(false)
    }
  }

  const handleDelete = (id: string) => {
    ContactsDB.delete(id)
    setContacts(ContactsDB.getAll())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-cyan-500/30 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Agenda de Contactos
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-cyan-400">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Agregar Contacto */}
        <div className="mb-6">
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Contacto
            </Button>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Nombre (ej: Luciana)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-gray-800 border-cyan-500/30 text-white"
              />
              <Input
                placeholder="Teléfono (ej: +1234567890)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="bg-gray-800 border-cyan-500/30 text-white"
              />
              <div className="flex gap-2">
                <Button onClick={handleAdd} className="flex-1 bg-green-500 hover:bg-green-600 text-black">
                  Guardar
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false)
                    setNewName("")
                    setNewPhone("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Contactos */}
        <div className="space-y-3">
          {contacts.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay contactos guardados</p>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex justify-between items-center p-3 bg-gray-800 rounded-lg border border-cyan-500/20"
              >
                <div>
                  <p className="text-cyan-300 font-medium">{contact.name}</p>
                  <p className="text-gray-400 text-sm">{contact.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(`tel:${contact.phone}`, "_self")}
                    className="text-green-400 hover:text-green-300"
                    title="Llamar"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(contact.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    title="Eliminar contacto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <p className="text-cyan-300 text-sm">
            <strong>💡 Tip:</strong> Di "NEXUS llama a [nombre]" para llamar a cualquier contacto guardado.
          </p>
        </div>
      </Card>
    </div>
  )
}
