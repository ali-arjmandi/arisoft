"use client";

import { useState } from "react";
import type { ContactPersonRecord } from "@/lib/companies/types";
import { EMAIL_PREFILL_STORAGE_KEY, type EmailHandoffMessage } from "@/lib/companyAnalyzer/emailHandoff";
import { usePagination } from "../../usePagination";
import { Pagination } from "../../Pagination";

const inputClassName =
  "w-full rounded-lg border border-[#AAAAAA] px-3 py-2 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary";

interface ContactFormState {
  name: string;
  role: string;
  email: string;
  phone: string;
}

const EMPTY_FORM: ContactFormState = { name: "", role: "", email: "", phone: "" };

export function ContactPersonsTable({
  companyId,
  initialContacts,
}: {
  companyId: string;
  initialContacts: ContactPersonRecord[];
}) {
  const [contacts, setContacts] = useState<ContactPersonRecord[]>(initialContacts);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { page, setPage, totalPages, pageItems } = usePagination(contacts, 10);

  function startEdit(contact: ContactPersonRecord) {
    setEditingId(contact.id);
    setForm({ name: contact.name, role: contact.role ?? "", email: contact.email, phone: contact.phone ?? "" });
    setError("");
  }

  function startCreate() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");
    const body = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    };

    try {
      const url =
        editingId === "new"
          ? `/api/dashboard/companies/${companyId}/contacts`
          : `/api/dashboard/companies/${companyId}/contacts/${editingId}`;
      const method = editingId === "new" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save contact.");
      }

      if (editingId === "new") {
        setContacts((prev) => [data.contact, ...prev]);
        setPage(1);
      } else {
        setContacts((prev) => prev.map((contact) => (contact.id === data.contact.id ? data.contact : contact)));
      }
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contactId: string) {
    if (!window.confirm("Delete this contact person?")) return;
    try {
      const res = await fetch(`/api/dashboard/companies/${companyId}/contacts/${contactId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete contact.");
      }
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact.");
    }
  }

  function handleSendEmail(contact: ContactPersonRecord) {
    const message: EmailHandoffMessage = {
      status: "prefill",
      to: contact.email,
      companyId,
      contactPersonId: contact.id,
    };
    window.localStorage.setItem(EMAIL_PREFILL_STORAGE_KEY, JSON.stringify(message));
    window.open("/dashboard/email", "_blank");
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Contact persons</h2>
        {editingId === null && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-muted"
          >
            Add contact
          </button>
        )}
      </div>

      {contacts.length === 0 && editingId !== "new" && <p className="text-sm text-muted">No contact persons yet.</p>}

      <div className="divide-y divide-border">
        {pageItems.map((contact) =>
          editingId === contact.id ? (
            <div key={contact.id} className="py-3">
              <ContactForm form={form} setForm={setForm} onCancel={cancelEdit} onSubmit={handleSubmit} saving={saving} />
            </div>
          ) : (
            <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{contact.name}</p>
                <p className="text-xs text-muted">
                  {contact.role ? `${contact.role} · ` : ""}
                  {contact.email}
                  {contact.phone ? ` · ${contact.phone}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs font-medium">
                <button type="button" onClick={() => handleSendEmail(contact)} className="text-primary hover:underline">
                  Send email
                </button>
                <button type="button" onClick={() => startEdit(contact)} className="text-primary hover:underline">
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(contact.id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {editingId === "new" && (
        <ContactForm form={form} setForm={setForm} onCancel={cancelEdit} onSubmit={handleSubmit} saving={saving} />
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

function ContactForm({
  form,
  setForm,
  onCancel,
  onSubmit,
  saving,
}: {
  form: ContactFormState;
  setForm: (form: ContactFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
      <input
        type="text"
        placeholder="Name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        className={inputClassName}
      />
      <input
        type="text"
        placeholder="Role"
        value={form.role}
        onChange={(event) => setForm({ ...form, role: event.target.value })}
        className={inputClassName}
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        className={inputClassName}
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(event) => setForm({ ...form, phone: event.target.value })}
        className={inputClassName}
      />
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-full bg-blue-gradient border border-primary px-5 py-2 text-sm font-medium text-white transition disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-5 py-2 text-sm font-medium text-body transition hover:bg-surface-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
