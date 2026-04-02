"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface CustomFieldData {
  id: string;
  fieldName: string;
  fieldType: string;
  entityType: string;
  required: boolean;
  active: boolean;
  displayOrder: number;
  options: unknown;
  createdAt: string;
  updatedAt: string;
}

export default function CustomFieldsClient({
  initialData,
}: {
  initialData: CustomFieldData[];
}) {
  const [fields, setFields] = useState<CustomFieldData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fieldName: "",
    fieldType: "text",
    entityType: "customer",
    required: false,
  });

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fieldName.trim()) {
      setError("Field name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create field");

      const newField = await response.json();
      setFields([newField, ...fields]);
      setFormData({
        fieldName: "",
        fieldType: "text",
        entityType: "customer",
        required: false,
      });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/custom-fields/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete field");

      setFields(fields.filter((field) => field.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {showForm ? "Cancel" : "Create Field"}
      </button>

      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Custom Field</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateField} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Field Name
                </label>
                <input
                  type="text"
                  value={formData.fieldName}
                  onChange={(e) =>
                    setFormData({ ...formData, fieldName: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Field Type
                </label>
                <select
                  value={formData.fieldType}
                  onChange={(e) =>
                    setFormData({ ...formData, fieldType: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                  <option value="select">Select</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Entity Type
                </label>
                <select
                  value={formData.entityType}
                  onChange={(e) =>
                    setFormData({ ...formData, entityType: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="customer">Customer</option>
                  <option value="job">Job</option>
                  <option value="lead">Lead</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) =>
                    setFormData({ ...formData, required: e.target.checked })
                  }
                  className="rounded border"
                />
                <span className="text-sm">Required</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {fields.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No custom fields defined.
        </p>
      ) : (
        <Card>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Entity</th>
                  <th className="text-center py-3 px-4">Required</th>
                  <th className="text-center py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{field.fieldName}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {field.fieldType}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize">{field.entityType}</td>
                    <td className="text-center py-3 px-4">
                      {field.required ? "Yes" : "No"}
                    </td>
                    <td className="text-center py-3 px-4">
                      {deleteConfirmId === field.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="text-red-600 font-medium text-sm hover:text-red-700"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-gray-500 text-sm hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(field.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
