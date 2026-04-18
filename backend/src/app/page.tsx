import Link from "next/link";
import { BookOpen, Sparkles, Trophy, Bell, ArrowRight, Star, Zap, Shield } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "LibraIQ — Your Intelligent Library",
  description:
    "A next-generation library management platform with AI-powered recommendations, gamification, and automated reminders.",
};

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Recommendations",
    description:
      "Our GPT-driven engine analyses your reading history and surfaces books you'll actually love — refreshed every 24 hours.",
    color: "indigo",
  },
  {
    icon: Zap,
    title: "ML Discover Engine",
    description:
      "Type a genre or describe what you're looking for in plain English. Our pre-trained model returns ranked book suggestions instantly.",
    color: "purple",
  },
  {
    icon: Trophy,
    title: "Gamification & Leaderboards",
    description:
      "Earn points for every book you borrow and return. Level up from Novice to Grand Archivist and compete on the public leaderboard.",
    color: "yellow",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description:
      "Automated email reminders at 3 days, 1 day, and on the due date — so you never accrue a late fee again.",
    color: "green",
  },
  {
    icon: Star,
    title: "Badge System",
    description:
      "Unlock badges like \"Speed Reader\", \"Genre Master\", and \"Loyal Reader\" as you build your reading habit.",
    color: "pink",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "Members, Librarians, and Super Admins each get the right tools — from borrowing books to managing the entire catalogue.",
    color: "blue",
  },
];

const stats = [
  { label: "Books in Catalogue", value: "10,000+" },
  { label: "Active Members", value: "2,500+" },
  { label: "Books Lent Monthly", value: "4,800+" },
  { label: "AI Recommendations", value: "Daily" },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-30 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">LibraIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-3xl rounded-full" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered library management
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-tight">
            Your library,{" "}
            <span className="gradient-text">intelligently</span>
            <br />reimagined.
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            LibraIQ brings AI recommendations, gamified reading habits, and automated reminders to your library
            experience — all in one beautifully designed platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary px-8 py-3 text-base flex items-center gap-2">
              Start reading for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/catalogue" className="btn-secondary px-8 py-3 text-base">
              Browse catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="glass-card p-6 text-center">
              <p className="text-3xl font-black gradient-text">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything your library needs
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            From cataloguing to gamification — LibraIQ handles it all so librarians can focus on what matters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="glass-card p-6 group hover:border-indigo-500/30 transition-all duration-300">
              <div
                className={`w-12 h-12 rounded-2xl bg-${color}-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className={`w-6 h-6 text-${color}-400`} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="glass-card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-indigo-600/10 blur-3xl rounded-full" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to discover your next great read?
            </h2>
            <p className="text-gray-400 mb-8 text-lg max-w-lg mx-auto">
              Join thousands of readers already using LibraIQ. Registration is free — no credit card required.
            </p>
            <Link href="/register" className="btn-primary px-10 py-3 text-base inline-flex items-center gap-2">
              Create your account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} LibraIQ. Built with Next.js, Prisma & AI.</p>
      </footer>
    </div>
  );
}
