'use client'

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function AccountDetailsCard() {
  const [editField, setEditField] = useState<"name" | "email" | "password" | null>(null)
  const [form, setForm] = useState({
    name: "Christian Onoh",
    email: "onohchibyk@gmail.com",
    password: ""
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCancel = () => setEditField(null)

  const handleSave = () => {
    // Here you could send an API request
    setEditField(null)
  }

  return (
    <div className="rounded-2xl bg-white p-7 sm:p-8 shadow space-y-8">
      
      {/* Name */}
      <Field
        label="Your name"
        value={form.name}
        field="name"
        isEditing={editField === "name"}
        onEdit={() => setEditField("name")}
        onCancel={handleCancel}
        onSave={handleSave}
        onChange={(val) => handleChange("name", val)}
      />

      {/* Email */}
      <Field
        label="Your email address"
        value={form.email}
        field="email"
        isEditing={editField === "email"}
        onEdit={() => setEditField("email")}
        onCancel={handleCancel}
        onSave={handleSave}
        onChange={(val) => handleChange("email", val)}
      />

      {/* Password */}
      <Field
        label="Your password"
        value="*********"
        field="password"
        isEditing={editField === "password"}
        onEdit={() => setEditField("password")}
        onCancel={handleCancel}
        onSave={handleSave}
        onChange={(val) => handleChange("password", val)}
        type="password"
      />
    </div>
  )
}

function Field({
  label,
  value,
  field,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onChange,
  type = "text"
}: {
  label: string
  value: string
  field: string
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onChange: (val: string) => void
  type?: string
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        {isEditing ? (
          <Input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field}`}
          />
        ) : (
          <div className="text-xl font-medium">{value}</div>
        )}
      </div>

      {isEditing ? (
        <div className="flex gap-2">
          <Button onClick={onSave} size="sm">Save</Button>
          <Button onClick={onCancel} size="sm" variant="secondary">Cancel</Button>
        </div>
      ) : (
        <Button onClick={onEdit} size="sm" variant="secondary">Edit</Button>
      )}
    </div>
  )
}
