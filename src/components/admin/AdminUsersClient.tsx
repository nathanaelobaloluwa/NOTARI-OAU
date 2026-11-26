"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Users,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { USER_ROLES, ROLE_LABELS, UserRole } from "@/constants/roles";
import { UserAvatar } from "@/components/shared/user-avatar";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: "active" | "suspended";
  isOrganizer?: boolean;
  matricNumber?: string;
  faculty?: string;
  department?: string;
  image?: string;
  profilePhotoUrl?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchUsers = useCallback(async (pageToFetch = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageToFetch),
        limit: "15",
      });
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      } else {
        setFeedbackMessage({ text: data.message || "Failed to load users", isError: true });
      }
    } catch {
      setFeedbackMessage({ text: "Network error loading users", isError: true });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleUpdateUser = async (userId: string, updates: { role?: string; status?: string; isOrganizer?: boolean }) => {
    setActionLoadingId(userId);
    setFeedbackMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedbackMessage({ text: data.message || "User updated successfully" });
        fetchUsers(pagination.page);
      } else {
        setFeedbackMessage({ text: data.message || "Failed to update user", isError: true });
      }
    } catch {
      setFeedbackMessage({ text: "Network error updating user", isError: true });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            Users & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Superadmin management of student, organizer, and administrator accounts across OAU.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(pagination.page)}
          className="rounded-xl text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedbackMessage.isError
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-xs"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, matric no..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
            >
              <option value="all">All Roles (Student, Organizer, Admin)</option>
              <option value={USER_ROLES.STUDENT}>Students</option>
              <option value={USER_ROLES.ORGANIZER}>Organizers</option>
              <option value={USER_ROLES.ADMIN}>Super Administrators</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* User Records Table */}
      <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-notari-primary" />
              <p className="text-xs">Loading university accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No matching accounts found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try refining your keyword search or adjusting your role and status filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">User & Identity</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Faculty / Dept</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Superadmin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSuspended = u.status === "suspended";
                  const isActionLoading = actionLoadingId === u._id;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/60">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={u.image || u.profilePhotoUrl}
                            name={u.name}
                            size="sm"
                            variant={u.role === USER_ROLES.ADMIN ? "admin" : u.role === USER_ROLES.ORGANIZER ? "organizer" : "student"}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[#101C3A]">{u.name}</div>
                            {u.matricNumber ? (
                              <span className="font-mono text-[11px] text-slate-500">{u.matricNumber}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No Matric No.</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-500 font-mono text-[11px]">{u.email}</td>
                      <td className="py-3.5 text-slate-600 max-w-[180px] truncate">
                        {u.faculty || "Not Specified"}
                        {u.department && <span className="block text-[11px] text-slate-400 truncate">{u.department}</span>}
                      </td>
                      <td className="py-3.5">
                        <Badge
                          variant={u.role === USER_ROLES.ADMIN ? "default" : u.role === USER_ROLES.ORGANIZER ? "secondary" : "outline"}
                          className="text-[11px] font-semibold"
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="py-3.5">
                        <Badge
                          variant={isSuspended ? "error" : "success"}
                          className="text-[11px] font-semibold"
                        >
                          {isSuspended ? "Suspended" : "Active"}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right space-x-1.5">
                        {/* Toggle Suspend / Reactivate */}
                        <Button
                          size="sm"
                          variant={isSuspended ? "outline" : "ghost"}
                          disabled={isActionLoading}
                          onClick={() => handleUpdateUser(u._id, { status: isSuspended ? "active" : "suspended" })}
                          className={`h-7 px-2.5 text-[11px] rounded-lg font-semibold ${
                            isSuspended
                              ? "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              : "text-red-600 hover:bg-red-50 hover:text-red-700"
                          }`}
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isSuspended ? (
                            "Reactivate"
                          ) : (
                            "Suspend"
                          )}
                        </Button>

                        {/* Promote / Demote Role */}
                        {u.role === USER_ROLES.STUDENT && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={() => handleUpdateUser(u._id, { role: USER_ROLES.ORGANIZER, isOrganizer: true })}
                            className="h-7 px-2.5 text-[11px] rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold"
                          >
                            Make Organizer
                          </Button>
                        )}
                        {u.role === USER_ROLES.ORGANIZER && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={() => handleUpdateUser(u._id, { role: USER_ROLES.STUDENT, isOrganizer: false })}
                            className="h-7 px-2.5 text-[11px] rounded-lg text-slate-600 border-slate-200 hover:bg-slate-50 font-semibold"
                          >
                            Revert to Student
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total accounts)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="h-8 px-2.5 rounded-lg gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="h-8 px-2.5 rounded-lg gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
