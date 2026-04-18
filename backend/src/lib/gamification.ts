import { prisma } from "@/lib/prisma";
import { getLevelFromPoints, POINT_VALUES } from "@/types";
import { sendTransactionalEmail, badgeEarnedEmail, levelUpEmail } from "@/lib/email";

const BADGE_KEYS = {
  FIRST_BORROW:  "first_borrow",
  TEN_BOOKS:     "ten_books_read",
  GENRE_MASTER:  "genre_master",
  SPEED_READER:  "speed_reader",
  LOYAL_READER:  "loyal_reader",
};

export async function awardPoints(
  userId: string,
  delta: number,
  reason: string,
  refId?: string
) {
  const [_, user] = await prisma.$transaction([
    prisma.pointTransaction.create({ data: { userId, delta, reason, refId } }),
    prisma.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: delta } },
      select: { id: true, totalPoints: true, level: true, firstName: true, email: true },
    }),
  ]);

  // Update level if changed
  const newLevel = getLevelFromPoints(user.totalPoints);
  if (newLevel !== user.level) {
    await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });

    // Create level-up in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type: "LEVEL_UP",
        message: `🎉 You reached level: ${newLevel}!`,
      },
    });

    // Send level-up email (check opt-out)
    const optOut = await prisma.emailOptOut.findUnique({ where: { userId } });
    if (!optOut) {
      sendTransactionalEmail(
        user.email,
        `LibraIQ — You reached ${newLevel}!`,
        levelUpEmail(user.firstName, newLevel)
      ).catch(console.error);
    }
  }

  return user;
}

export async function awardBadge(userId: string, badgeKey: string) {
  const badge = await prisma.badge.findUnique({ where: { key: badgeKey } });
  if (!badge) return;

  // Check if already awarded
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return;

  // Get user info for email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, email: true },
  });

  await prisma.$transaction([
    prisma.userBadge.create({ data: { userId, badgeId: badge.id } }),
    prisma.notification.create({
      data: { userId, type: "BADGE_EARNED", message: `🏆 Badge earned: ${badge.name}!` },
    }),
  ]);

  // Award badge points
  await awardPoints(userId, badge.pointValue, "BADGE", badge.id);

  // Send badge email (check opt-out)
  if (user) {
    const optOut = await prisma.emailOptOut.findUnique({ where: { userId } });
    if (!optOut) {
      sendTransactionalEmail(
        user.email,
        `LibraIQ — You earned the "${badge.name}" badge!`,
        badgeEarnedEmail(user.firstName, badge.name, badge.description)
      ).catch(console.error);
    }
  }
}

export async function checkAndAwardBadges(userId: string) {
  const [borrowCount, user] = await Promise.all([
    prisma.borrowing.count({ where: { userId, status: { in: ["RETURNED"] } } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        badges: { select: { badge: { select: { key: true } } } },
        borrowings: {
          where: { status: "RETURNED" },
          include: { book: { include: { genres: { include: { genre: true } } } } },
        },
      },
    }),
  ]);

  if (!user) return;
  const earnedKeys = new Set(user.badges.map((b) => b.badge.key));

  // ── First Borrow ────────────────────────────────────────────────────────────
  if (borrowCount >= 1 && !earnedKeys.has(BADGE_KEYS.FIRST_BORROW)) {
    await awardBadge(userId, BADGE_KEYS.FIRST_BORROW);
  }

  // ── 10 Books Read ───────────────────────────────────────────────────────────
  if (borrowCount >= 10 && !earnedKeys.has(BADGE_KEYS.TEN_BOOKS)) {
    await awardBadge(userId, BADGE_KEYS.TEN_BOOKS);
  }

  // ── Genre Master — 5+ books in a single genre ───────────────────────────────
  const genreCounts: Record<string, number> = {};
  for (const b of user.borrowings) {
    for (const bg of b.book.genres) {
      genreCounts[bg.genre.name] = (genreCounts[bg.genre.name] || 0) + 1;
    }
  }
  if (Object.values(genreCounts).some((c) => c >= 5) && !earnedKeys.has(BADGE_KEYS.GENRE_MASTER)) {
    await awardBadge(userId, BADGE_KEYS.GENRE_MASTER);
  }

  // ── Speed Reader — returned within 3 days ───────────────────────────────────
  const speedRead = user.borrowings.some((b) => {
    if (!b.returnedAt) return false;
    const days = (b.returnedAt.getTime() - b.borrowedAt.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 3;
  });
  if (speedRead && !earnedKeys.has(BADGE_KEYS.SPEED_READER)) {
    await awardBadge(userId, BADGE_KEYS.SPEED_READER);
  }

  // ── Loyal Reader — active in 6 consecutive calendar months ──────────────────
  if (!earnedKeys.has(BADGE_KEYS.LOYAL_READER)) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentBorrowings = await prisma.borrowing.findMany({
      where: { userId, borrowedAt: { gte: sixMonthsAgo } },
      select: { borrowedAt: true },
    });

    // Collect unique "YYYY-MM" month strings
    const activeMonths = new Set(
      recentBorrowings.map(
        (b) => `${b.borrowedAt.getFullYear()}-${String(b.borrowedAt.getMonth()).padStart(2, "0")}`
      )
    );

    // Need at least 6 distinct months
    if (activeMonths.size >= 6) {
      await awardBadge(userId, BADGE_KEYS.LOYAL_READER);
    }
  }
}

export async function awardFirstGenreBonuses(userId: string, bookId: string) {
  // Award 15 pts for first book in a genre
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { genres: { include: { genre: true } } },
  });
  if (!book) return;

  for (const bg of book.genres) {
    const previousInGenre = await prisma.borrowing.count({
      where: {
        userId,
        status: "RETURNED",
        book: { genres: { some: { genreId: bg.genreId } } },
      },
    });
    if (previousInGenre === 0) {
      await awardPoints(userId, POINT_VALUES.GENRE_FIRST, `GENRE_FIRST:${bg.genre.name}`, bookId);
    }
  }
}
