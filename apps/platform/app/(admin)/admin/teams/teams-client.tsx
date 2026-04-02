"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface TeamData {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  memberIds: string[];
  createdAt: string;
}

export default function TeamsClient({ initialData }: { initialData: TeamData[] }) {
  const [teams, setTeams] = useState<TeamData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      setError("Team name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create team");

      const newTeam = await response.json();
      setTeams([{ ...newTeam, memberCount: 0, memberIds: [] }, ...teams]);
      setFormData({ name: "", description: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/teams/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete team");

      setTeams(teams.filter((team) => team.id !== id));
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
        {showForm ? "Cancel" : "Create Team"}
      </button>

      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Team</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>

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

      {teams.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No teams yet.</p>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-muted-foreground">
                        {team.description}
                      </p>
                    )}
                  </div>
                  {deleteConfirmId === team.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="text-red-600 font-medium hover:text-red-700 text-sm"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(team.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
