import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Trophy, Star, TrendingUp, Settings } from "lucide-react";
import { LEVELS } from "@/types";
import EmailOptOutToggle from "@/components/profile/EmailOptOutToggle";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, emailOptOut] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        badges: { include: { badge: true }, orderBy: { awardedAt: "desc" } },
        pointTxns: { take: 10, orderBy: { createdAt: "desc" } },
        _count: { select: { borrowings: true } },
      },
    }),
    prisma.emailOptOut.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!user) redirect("/login");

  const currentLevelDef = LEVELS.find((l) => l.name === user.level) || LEVELS[0];
  const nextLevelDef = LEVELS[LEVELS.findIndex((l) => l.name === user.level) + 1];
  const progressPct = nextLevelDef
    ? Math.min(100, Math.round(((user.totalPoints - currentLevelDef.min) / (nextLevelDef.min - currentLevelDef.min)) * 100))
    : 100;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-3xl font-bold text-white">My Profile</h1>

      {/* Profile card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h2>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <span className="badge-indigo mt-1 inline-flex">{user.role.replace("_", " ")}</span>
          </div>
        </div>

        {/* Level progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-white">{user.level}</span>
            </div>
            <span className="text-sm text-gray-400">{user.totalPoints.toLocaleString()} pts
              {nextLevelDef && <span className="text-gray-600"> / {nextLevelDef.min.toLocaleString()}</span>}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          {nextLevelDef && (
            <p className="text-xs text-gray-500 mt-1">
              {(nextLevelDef.min - user.totalPoints).toLocaleString()} pts to {nextLevelDef.name}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{user._count.borrowings}</p>
            <p className="text-xs text-gray-500 mt-0.5">Books Borrowed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{user.badges.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Badges Earned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{user.totalPoints}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Points</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" /> Badges
        </h3>
        {user.badges.length === 0 ? (
          <p className="text-gray-500 text-sm">No badges yet — borrow your first book!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {user.badges.map((ub) => (
              <div key={ub.badgeId} className="glass-card p-3 flex items-center gap-3 bg-gray-800/40">
                <span className="text-2xl">{ub.badge.iconUrl || "🏆"}</span>
                <div>
                  <p className="text-sm font-medium text-white">{ub.badge.name}</p>
                  <p className="text-xs text-gray-500">{ub.badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent points */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-purple-400" /> Recent Points
        </h3>
        <div className="space-y-2">
          {user.pointTxns.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-800/40">
              <p className="text-sm text-gray-300">{tx.reason}</p>
              <span className={`font-bold text-sm ${tx.delta > 0 ? "text-green-400" : "text-red-400"}`}>
                {tx.delta > 0 ? "+" : ""}{tx.delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Email Settings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" /> Notification Settings
        </h3>
        <EmailOptOutToggle initialOptedOut={!!emailOptOut} />
      </div>
    </div>
  );
}
