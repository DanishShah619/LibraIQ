import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/profile/email-optout — opt out of email reminders
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.emailOptOut.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    });

    return NextResponse.json({ optedOut: true, message: "You have opted out of email reminders." });
  } catch (err) {
    console.error("[POST /api/profile/email-optout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/profile/email-optout — opt back in
export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.emailOptOut.deleteMany({ where: { userId: session.user.id } });

    return NextResponse.json({ optedOut: false, message: "You will now receive email reminders." });
  } catch (err) {
    console.error("[DELETE /api/profile/email-optout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/profile/email-optout — check current status
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const record = await prisma.emailOptOut.findUnique({ where: { userId: session.user.id } });
    return NextResponse.json({ optedOut: !!record });
  } catch (err) {
    console.error("[GET /api/profile/email-optout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
