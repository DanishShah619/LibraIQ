import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function escapeCsvField(val: unknown): string {
  const str = val == null ? "" : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(values: unknown[]): string {
  return values.map(escapeCsvField).join(",");
}

// GET /api/admin/borrowings/export — stream CSV (Librarian+)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || !["LIBRARIAN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const borrowings = await prisma.borrowing.findMany({
      where,
      include: {
        book: { select: { title: true, isbn: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { borrowedAt: "desc" },
    });

    const headers = [
      "ID",
      "Member Name",
      "Member Email",
      "Book Title",
      "ISBN",
      "Status",
      "Borrowed At",
      "Due Date",
      "Returned At",
      "Renewal Count",
      "Late Fee",
    ];

    const rows = [
      rowToCSV(headers),
      ...borrowings.map((b) =>
        rowToCSV([
          b.id,
          `${b.user.firstName} ${b.user.lastName}`,
          b.user.email,
          b.book.title,
          b.book.isbn,
          b.status,
          b.borrowedAt.toISOString(),
          b.dueDate.toISOString(),
          b.returnedAt?.toISOString() ?? "",
          b.renewalCount,
          b.lateFee ?? "",
        ])
      ),
    ];

    const csv = rows.join("\n");
    const filename = `borrowings-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/borrowings/export]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
