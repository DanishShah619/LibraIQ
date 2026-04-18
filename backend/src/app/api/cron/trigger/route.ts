import { NextRequest, NextResponse } from "next/server";
import {
  runThreeDayReminder,
  runOneDayReminder,
  runDueTodayReminder,
  runOverdueNotices,
} from "@/lib/cron";

const JOBS: Record<string, () => Promise<void>> = {
  three_day_reminder: runThreeDayReminder,
  one_day_reminder:   runOneDayReminder,
  due_today_reminder: runDueTodayReminder,
  overdue_notices:    runOverdueNotices,
};

// POST /api/cron/trigger?job=three_day_reminder
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const job = searchParams.get("job");

  if (!job || !JOBS[job]) {
    return NextResponse.json(
      { error: `Invalid job. Valid options: ${Object.keys(JOBS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await JOBS[job]();
    return NextResponse.json({ message: `${job} completed successfully` });
  } catch (err: any) {
    console.error(`[cron:trigger:${job}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
