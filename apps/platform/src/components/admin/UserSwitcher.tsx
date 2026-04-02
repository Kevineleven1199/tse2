"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/src/components/ui/input";
import { Search, Loader2, Eye } from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "HQ" | "MANAGER" | "CLEANER" | "CUSTOMER";
  status: string;
  createdAt: string;
  cleaner?: {
    id: string;
    rating: number;
    completedJobs: number;
    serviceRadius: number;
    payoutMethod: string;
  } | null;
}

const ROLE_COLORS: Record<string, { badge: string; text: string }> = {
  HQ: { badge: "bg-purple-100", text: "text-purple-800" },
  MANAGER: { badge: "bg-blue-100", text: "text-blue-800" },
  CLEANER: { badge: "bg-green-100", text: "text-green-800" },
  CUSTOMER: { badge: "bg-gray-100", text: "text-gray-800" }
};

const ROLE_PORTAL: Record<string, string> = {
  HQ: "/admin",
  MANAGER: "/manager",
  CLEANER: "/cleaner",
  CUSTOMER: "/client"
};

export default function UserSwitcher() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | "HQ" | "MANAGER" | "CLEANER" | "CUSTOMER">("all");
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/users?includeAll=true");
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
          setFilteredUsers(data.users || []);
        } else {
          console.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search and role
  useEffect(() => {
    let filtered = users;

    // Filter by role
    if (selectedRole !== "all") {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    // Filter by search query (name or email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, selectedRole, users]);

  const handleViewAs = async (userId: string) => {
    try {
      setImpersonatingUserId(userId);
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          targetUserId: userId
        })
      });

      if (response.ok) {
        const user = users.find(u => u.id === userId);
        const portal = ROLE_PORTAL[user?.role || "CUSTOMER"];
        // Small delay to ensure cookie is set
        setTimeout(() => {
          router.push(portal);
        }, 100);
      } else {
        const error = await response.json();
        alert(`Failed to impersonate user: ${error.error}`);
      }
    } catch (error) {
      console.error("Error starting impersonation:", error);
      alert("Failed to impersonate user");
    } finally {
      setImpersonatingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Switch User</h1>
        <p className="text-muted-foreground mt-2">
          Temporarily impersonate any user to view the platform from their perspective
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Role Filter */}
        <div className="flex gap-2">
          {["all", "HQ", "MANAGER", "CLEANER", "CUSTOMER"].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role as typeof selectedRole)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedRole === role
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {role === "all" ? "All Roles" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* User Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const roleColor = ROLE_COLORS[user.role];
            const isImpersonating = impersonatingUserId === user.id;

            return (
              <div
                key={user.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* User Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${roleColor.badge} ${roleColor.text}`}>
                      {user.role}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user.status}
                    </span>
                  </div>

                  {/* Cleaner-specific info */}
                  {user.cleaner && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                      <div>Rating: {user.cleaner.rating.toFixed(1)}/5.0</div>
                      <div>Completed Jobs: {user.cleaner.completedJobs}</div>
                      <div>Service Radius: {user.cleaner.serviceRadius} miles</div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* View As Button */}
                <button
                  onClick={() => handleViewAs(user.id)}
                  disabled={isImpersonating}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-md font-medium transition-colors"
                >
                  {isImpersonating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      View As
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No users found</p>
          <p className="text-sm">Try adjusting your search or role filter</p>
        </div>
      )}
    </div>
  );
}
