"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen, LayoutDashboard, Search, BookMarked, Star, Trophy,
  User, Settings, LogOut, Menu, X, Shield
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const memberLinks = [
  { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard },
  { href: "/catalogue",       label: "Catalogue",       icon: Search },
  { href: "/loans",           label: "My Loans",        icon: BookMarked },
  { href: "/recommendations", label: "For You",         icon: Star },
  { href: "/leaderboard",     label: "Leaderboard",     icon: Trophy },
  { href: "/profile",         label: "Profile",         icon: User },
];

const adminLinks = [
  { href: "/admin",           label: "Admin Overview",  icon: Shield },
  { href: "/admin/books",     label: "Manage Books",    icon: BookOpen },
  { href: "/admin/borrowings",label: "Borrowings",      icon: BookMarked },
  { href: "/admin/members",   label: "Members",         icon: User },
  { href: "/admin/cron-logs", label: "Cron Logs",       icon: Settings },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const role = (session?.user as any)?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "LIBRARIAN";

  type NavItem = { href: string; label: string; icon: React.ElementType };
  const NavLink = ({ href, label, icon: Icon }: NavItem) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
        pathname === href || pathname.startsWith(href + "/")
          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
          : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/60"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden btn-ghost p-2"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 left-0 z-40 h-full w-64 flex flex-col bg-gray-900/80 backdrop-blur-xl border-r border-gray-800 transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 glow-indigo">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">LibraIQ</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {isAdmin && (
            <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2 mt-2">
              Member
            </p>
          )}
          {memberLinks.map((l) => <NavLink key={l.href} {...l} />)}

          {isAdmin && (
            <>
              <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2 mt-4">
                Admin
              </p>
              {adminLinks.map((l) => <NavLink key={l.href} {...l} />)}
            </>
          )}
        </nav>

        {/* User footer */}
        {session?.user && (
          <div className="px-3 py-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
