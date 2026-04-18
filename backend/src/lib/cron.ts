import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { startOfDay, endOfDay, addDays } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: process.env.EMAIL_FROM!, to, subject, html });
  } catch (err) {
    console.error("[email]", err);
  }
}

async function isOptedOut(userId: string) {
  return !!(await prisma.emailOptOut.findUnique({ where: { userId } }));
}

async function logCron(jobName: string, processed: number, errors: number, notes?: string) {
  await prisma.cronLog.create({ data: { jobName, processed, errors, notes } });
}

// ── Job 1: 3 days before due (02:00 UTC) ─────────────────────────────────
export async function runThreeDayReminder() {
  const target = addDays(startOfDay(new Date()), 3);
  const dayEnd = endOfDay(target);

  const borrowings = await prisma.borrowing.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] }, dueDate: { gte: target, lte: dayEnd } },
    include: { user: true, book: true },
  });

  let processed = 0, errors = 0;
  for (const b of borrowings) {
    if (await isOptedOut(b.userId)) continue;
    try {
      await sendEmail(
        b.user.email,
        `LibraIQ — "${b.book.title}" due in 3 days`,
        `<p>Hi ${b.user.firstName}, your copy of <strong>${b.book.title}</strong> is due on ${b.dueDate.toDateString()}. Please return or renew it to avoid late fees.</p>`
      );
      processed++;
    } catch { errors++; }
  }

  await logCron("three_day_reminder", processed, errors);
  console.log(`[cron:3day] processed=${processed} errors=${errors}`);
}

// ── Job 2: 1 day before due (02:30 UTC) ──────────────────────────────────
export async function runOneDayReminder() {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const dayEnd = endOfDay(tomorrow);

  const borrowings = await prisma.borrowing.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] }, dueDate: { gte: tomorrow, lte: dayEnd } },
    include: { user: true, book: true },
  });

  let processed = 0, errors = 0;
  for (const b of borrowings) {
    if (await isOptedOut(b.userId)) continue;
    try {
      await sendEmail(
        b.user.email,
        `LibraIQ — "${b.book.title}" due TOMORROW`,
        `<p>Hi ${b.user.firstName}, <strong>${b.book.title}</strong> is due <strong>tomorrow</strong>. Return or renew it today to keep your streak going!</p>`
      );
      processed++;
    } catch { errors++; }
  }

  await logCron("one_day_reminder", processed, errors);
}

// ── Job 3: Due today (06:00 UTC) ──────────────────────────────────────────
export async function runDueTodayReminder() {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const borrowings = await prisma.borrowing.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] }, dueDate: { gte: today, lte: todayEnd } },
    include: { user: true, book: true },
  });

  let processed = 0, errors = 0;
  for (const b of borrowings) {
    if (await isOptedOut(b.userId)) continue;
    try {
      await sendEmail(
        b.user.email,
        `LibraIQ — "${b.book.title}" is due TODAY`,
        `<p>Hi ${b.user.firstName}, <strong>${b.book.title}</strong> is due today! Return it to earn your on-time points.</p>`
      );
      processed++;
    } catch { errors++; }
  }

  await logCron("due_today_reminder", processed, errors);
}

// ── Job 4: Overdue notices (08:00 UTC) ───────────────────────────────────
export async function runOverdueNotices() {
  const now = new Date();
  const overdue = await prisma.borrowing.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] }, dueDate: { lt: now } },
    include: { user: true, book: true },
  });

  // Mark as overdue
  await prisma.borrowing.updateMany({
    where: { id: { in: overdue.map((b) => b.id) } },
    data: { status: "OVERDUE" },
  });

  let processed = 0, errors = 0;
  const librarians: string[] = [];

  for (const b of overdue) {
    const daysOverdue = Math.ceil((now.getTime() - b.dueDate.getTime()) / 86400000);
    if (daysOverdue > 14) {
      // Escalate to librarian
      const libs = await prisma.user.findMany({
        where: { role: { in: ["LIBRARIAN", "SUPER_ADMIN"] }, isActive: true },
        select: { email: true },
      });
      for (const lib of libs) librarians.push(lib.email);
      continue;
    }

    if (await isOptedOut(b.userId)) continue;
    try {
      const fee = (daysOverdue * 0.5).toFixed(2);
      await sendEmail(
        b.user.email,
        `LibraIQ — OVERDUE: "${b.book.title}" (Day ${daysOverdue})`,
        `<p>Hi ${b.user.firstName}, <strong>${b.book.title}</strong> is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue. Accrued fee: £${fee}. Please return it as soon as possible.</p>`
      );
      processed++;
    } catch { errors++; }
  }

  // Notify librarians of escalated cases
  const escalated = overdue.filter((b) => {
    const days = Math.ceil((now.getTime() - b.dueDate.getTime()) / 86400000);
    return days > 14;
  });
  if (escalated.length > 0 && librarians.length > 0) {
    const uniqueLibrarians = Array.from(new Set(librarians));
    for (const email of uniqueLibrarians) {
      await sendEmail(
        email,
        `LibraIQ — ${escalated.length} severely overdue items require attention`,
        `<p>${escalated.length} items are more than 14 days overdue and member emails have been suppressed. Please review the borrowings dashboard.</p>`
      );
    }
  }

  await logCron("overdue_notices", processed, errors, escalated.length > 0 ? `${escalated.length} escalated` : undefined);
}
