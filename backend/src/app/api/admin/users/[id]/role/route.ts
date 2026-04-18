import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const roleSchema = z.object({
  role: z.enum(["MEMBER", "LIBRARIAN"]),
});

// PATCH /api/admin/users/[id]/role — Super Admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const actorRole = (session?.user as any)?.role;
    if (!session || actorRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden — Super Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    // Prevent demoting yourself
    if (params.id === session?.user?.id) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    // Cannot change another Super Admin's role
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot change a Super Admin's role" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { role: parsed.data.role },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/users/[id]/role]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
