import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Trophy, Star, Medal } from "lucide-react";

export const metadata = { title: "Leaderboard" };

const LEVEL_COLORS: Record<string, string> = {
  "Novice":          "badge-gray",
  "Explorer":        "badge-green",
  "Scholar":         "badge-indigo",
  "Bibliophile":     "badge-purple",
  "Grand Archivist": "badge-yellow",
};


type LeaderEntry = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  totalPoints: number;
  level: string;
  _count: { badges: number };
};

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const leaders: LeaderEntry[] = await prisma.user.findMany({
    where: { isActive: true, role: "MEMBER" },
    select: {
      id: true, firstName: true, lastName: true, avatarUrl: true,
      totalPoints: true, level: true,
      _count: { select: { badges: true } },
    },
    orderBy: { totalPoints: "desc" },
    take: 50,
  });

  const currentUserRank = leaders.findIndex((u: LeaderEntry) => u.id === session.user?.id) + 1;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Leaderboard
        </h1>
        <p className="text-gray-400 mt-1">Top readers ranked by total points</p>
      </div>

      {currentUserRank > 0 && (
        <div className="glass-card p-4 border-indigo-500/30 bg-indigo-500/10">
          <p className="text-sm text-indigo-300">
            🎯 Your rank: <strong>#{currentUserRank}</strong> of {leaders.length} readers
          </p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-gray-800">
          {leaders.map((user: LeaderEntry, i: number) => {
            const rank = i + 1;
            const isCurrentUser = user.id === session.user?.id;
            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors ${isCurrentUser ? "bg-indigo-500/10" : "hover:bg-gray-800/40"}`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {rank === 1 ? <Medal className="w-6 h-6 text-yellow-400 mx-auto" /> :
                   rank === 2 ? <Medal className="w-6 h-6 text-gray-400 mx-auto" /> :
                   rank === 3 ? <Medal className="w-6 h-6 text-orange-400 mx-auto" /> :
                   <span className="text-sm text-gray-500 font-mono">#{rank}</span>}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${isCurrentUser ? "text-indigo-300" : "text-white"}`}>
                    {user.firstName} {user.lastName} {isCurrentUser && <span className="text-xs text-indigo-400">(you)</span>}
                  </p>
                  <span className={`badge text-xs ${LEVEL_COLORS[user.level] || "badge-gray"}`}>
                    {user.level}
                  </span>
                </div>

                {/* Badges count */}
                <div className="text-center shrink-0">
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <Star className="w-3 h-3" />{user._count.badges}
                  </p>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-white">{user.totalPoints.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
