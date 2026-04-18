"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Shield, ChevronDown } from "lucide-react";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "MEMBER" | "LIBRARIAN" | "SUPER_ADMIN";
  isActive: boolean;
  totalPoints: number;
  level: string;
  createdAt: string;
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "badge-red",
  LIBRARIAN:   "badge-indigo",
  MEMBER:      "badge-gray",
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q) params.set("q", q);
    if (roleFilter) params.set("role", roleFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }, [page, q, roleFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { setPage(1); }, [q, roleFilter]);

  async function changeRole(userId: string, newRole: "MEMBER" | "LIBRARIAN") {
    setUpdating(userId);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      showToast(`Role updated to ${newRole} ✓`);
      fetchMembers();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update role", "error");
    }
    setUpdating(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Members</h1>
          <p className="text-gray-400 mt-1">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="input-base pl-10 w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-base"
        >
          <option value="">All roles</option>
          <option value="MEMBER">Members</option>
          <option value="LIBRARIAN">Librarians</option>
          <option value="SUPER_ADMIN">Super Admins</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest hidden md:table-cell">Points / Level</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest hidden lg:table-cell">Joined</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge text-xs ${ROLE_STYLES[m.role] || "badge-gray"}`}>
                      {m.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-white font-medium">{m.totalPoints.toLocaleString()} pts</p>
                    <p className="text-xs text-gray-500">{m.level}</p>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-gray-400 text-xs">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {m.role !== "SUPER_ADMIN" && (
                      <div className="relative inline-block">
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value as "MEMBER" | "LIBRARIAN")}
                          disabled={updating === m.id}
                          className="input-base text-xs py-1 pr-7 appearance-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="LIBRARIAN">Librarian</option>
                        </select>
                        {updating === m.id ? (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-indigo-400" />
                        ) : (
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                        )}
                      </div>
                    )}
                    {m.role === "SUPER_ADMIN" && (
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <Shield className="w-3 h-3" /> Super Admin
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <div className="text-center py-12 text-gray-500">No members found</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="btn-secondary px-3 py-2 disabled:opacity-40">←</button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="btn-secondary px-3 py-2 disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}
