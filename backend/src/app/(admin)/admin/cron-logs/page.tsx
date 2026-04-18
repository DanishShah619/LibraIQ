import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Settings, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Cron Logs" };

export default async function CronLogsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["LIBRARIAN", "SUPER_ADMIN"].includes(role)) {
    redirect("/dashboard");
  }

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const pageSize = 50;

  const [logs, total] = await Promise.all([
    prisma.cronLog.findMany({
      orderBy: { runAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cronLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-400" />
            Cron Logs
          </h1>
          <p className="text-gray-400 mt-1">
            {total.toLocaleString()} total automated background jobs recorded
          </p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Job Name
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Processed
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Errors
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Run Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    {log.errors > 0 ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    )}
                  </td>
                  <td className="px-5 py-4 text-white font-medium">
                    {log.jobName}
                  </td>
                  <td className="px-5 py-4 text-gray-300">
                    {log.processed.toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`badge text-xs ${
                        log.errors > 0 ? "badge-red" : "badge-gray"
                      }`}
                    >
                      {log.errors} errors
                    </span>
                    {log.notes && log.errors > 0 && (
                      <p className="text-xs text-red-400/80 mt-1 max-w-xs break-words">
                        {log.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-400">
                    {log.runAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No cron jobs have been recorded yet.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/admin/cron-logs?page=${page - 1}`}
            className={`btn-secondary px-3 py-2 ${page <= 1 ? "opacity-40 pointer-events-none" : ""}`}
            aria-disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/cron-logs?page=${page + 1}`}
            className={`btn-secondary px-3 py-2 ${page >= totalPages ? "opacity-40 pointer-events-none" : ""}`}
            aria-disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
