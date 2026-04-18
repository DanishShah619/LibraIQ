import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Clock, Trophy, Bell, Star, TrendingUp, ArrowRight } from "lucide-react";

export const metadata = { title: "Dashboard" };


type BorrowingWithBook = {
  id: string;
  dueDate: Date;
  status: string;
  book: {
    title: string;
  };
};

type Notification = {
  id: string;
  message: string;
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, activeBorrowings, recentNotifs]: [
    { firstName: string; totalPoints: number; level: string } | null,
    BorrowingWithBook[],
    Notification[]
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, totalPoints: true, level: true },
    }),
    prisma.borrowing.findMany({
      where: { userId, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
      include: { book: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }) as Promise<BorrowingWithBook[]>,
    prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }) as Promise<Notification[]>,
  ]);

  const overdue = activeBorrowings.filter((b: BorrowingWithBook) => b.status === "OVERDUE");
  const now = new Date();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="gradient-text">{user?.firstName}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1">Here&apos;s what&apos;s happening in your library</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeBorrowings.length}</p>
            <p className="text-sm text-gray-400">Active Loans</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{overdue.length}</p>
            <p className="text-sm text-gray-400">Overdue</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{user?.totalPoints ?? 0}</p>
            <p className="text-sm text-gray-400">Total Points</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{user?.level}</p>
            <p className="text-sm text-gray-400">Current Level</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Loans */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Loans</h2>
            <Link href="/loans" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {activeBorrowings.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No active loans</p>
              <Link href="/catalogue" className="btn-primary mt-4 text-sm px-4 py-2">Browse Catalogue</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBorrowings.map((b: BorrowingWithBook) => {
                const daysLeft = Math.ceil((b.dueDate.getTime() - now.getTime()) / 86400000);
                const isOverdue = daysLeft < 0;
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{b.book.title}</p>
                      <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-400" : daysLeft <= 3 ? "text-yellow-400" : "text-gray-500"}`}>
                        {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${isOverdue ? "bg-red-500/20 text-red-400" : b.status === "RENEWED" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>
                      {b.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            <Bell className="w-4 h-4 text-gray-500" />
          </div>
          {recentNotifs.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifs.map((n: Notification) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-sm text-gray-200">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/catalogue" className="btn-primary">
            <BookOpen className="w-4 h-4" /> Browse Catalogue
          </Link>
          <Link href="/recommendations" className="btn-secondary">
            <Star className="w-4 h-4" /> My Recommendations
          </Link>
          <Link href="/leaderboard" className="btn-ghost">
            <Trophy className="w-4 h-4" /> Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
