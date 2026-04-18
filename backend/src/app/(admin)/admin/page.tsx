import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BookOpen, Users, AlertCircle, TrendingUp, Trophy } from "lucide-react";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["LIBRARIAN", "SUPER_ADMIN"].includes(role)) redirect("/dashboard");

  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBooks, activeBorrowings, overdueCount, newMembers, topMembers, recentCronLogs] = await Promise.all([
    prisma.book.count({ where: { isDeleted: false } }),
    prisma.borrowing.count({ where: { status: { in: ["ACTIVE", "RENEWED"] } } }),
    prisma.borrowing.count({ where: { status: "OVERDUE" } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo }, role: "MEMBER" } }),
    prisma.user.findMany({
      where: { role: "MEMBER", isActive: true },
      orderBy: { totalPoints: "desc" },
      take: 10,
      select: { id: true, firstName: true, lastName: true, totalPoints: true, level: true },
    }),
    prisma.cronLog.findMany({ orderBy: { runAt: "desc" }, take: 10 }),
  ]);

  const kpis = [
    { label: "Total Books",      value: totalBooks,       icon: BookOpen,    color: "indigo" },
    { label: "Active Loans",     value: activeBorrowings, icon: TrendingUp,  color: "blue"   },
    { label: "Overdue Items",    value: overdueCount,     icon: AlertCircle, color: "red"    },
    { label: "New Members/Month",value: newMembers,       icon: Users,       color: "green"  },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Library overview and management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${color}-600/20 flex items-center justify-center`}>
              <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Leaderboard Widget */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" /> Top Readers
          </h2>
          <div className="space-y-2">
            {topMembers.map((u: typeof topMembers[0], i: number) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800/40">
                <span className="text-xs text-gray-500 font-mono w-5">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-500">{u.level}</p>
                </div>
                <span className="text-sm font-bold text-indigo-400">{u.totalPoints} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cron Log */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Cron Jobs</h2>
          {recentCronLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">No cron jobs run yet.</p>
          ) : (
            <div className="space-y-2">
              {recentCronLogs.map((log: typeof recentCronLogs[0]) => (
              <div key={log.id} className="px-3 py-2 rounded-xl bg-gray-800/40">
                <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{log.jobName}</p>
                <span className={`badge text-xs ${log.errors > 0 ? "badge-red" : "badge-green"}`}>
                  {log.errors > 0 ? `${log.errors} errors` : "OK"}
                </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                {log.runAt.toLocaleString()} · {log.processed} processed
                {log.notes ? ` · ${log.notes}` : ""}
                </p>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
