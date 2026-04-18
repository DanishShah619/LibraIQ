import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BookOpen, Calendar, Globe, Hash, Building2, ArrowLeft } from "lucide-react";
import BorrowReserveOwn from "@/components/books/BorrowReserveOwn";
import Link from "next/link";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const book = await prisma.book.findFirst({
    where: { id: params.id, isDeleted: false },
    select: { title: true, synopsis: true },
  });
  return {
    title: book ? `${book.title} — LibraIQ` : "Book not found",
    description: book?.synopsis || undefined,
  };
}

export default async function BookDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();

  const book = await prisma.book.findFirst({
    where: { id: params.id, isDeleted: false },
    include: { genres: { include: { genre: true } } },
  });

  if (!book) notFound();

  // Get real-time available copies
  const activeCount = await prisma.borrowing.count({
    where: { bookId: book.id, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
  });
  const availableCopies = Math.max(0, book.totalCopies - activeCount);

  // Check user's current borrow / reservation / ownership for this book
  let userBorrowing = null;
  let userReservation = null;
  let userOwnership = null;

  if (session?.user?.id) {
    [userBorrowing, userReservation, userOwnership] = await Promise.all([
      prisma.borrowing.findFirst({
        where: { userId: session.user.id, bookId: book.id, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
      }),
      prisma.reservation.findFirst({
        where: { userId: session.user.id, bookId: book.id },
      }),
      prisma.ownership.findFirst({
        where: { userId: session.user.id, bookId: book.id },
      }),
    ]);
  }

  // Queue size
  const reservationCount = await prisma.reservation.count({ where: { bookId: book.id } });

  const genres = book.genres.map((bg) => bg.genre.name);

  return (
    <div className="max-w-4xl animate-fade-in space-y-6">
      <Link 
        href="/catalogue" 
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit bg-gray-800/40 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalogue
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Cover */}
        <div className="md:col-span-1">
          <div className="w-full aspect-[2/3] rounded-2xl bg-gray-800 flex items-center justify-center overflow-hidden shadow-2xl">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-16 h-16 text-gray-600" />
            )}
          </div>

          {/* Availability badge */}
          <div className="mt-4 glass-card p-4 text-center">
            <p className="text-2xl font-black text-white">{availableCopies}</p>
            <p className="text-xs text-gray-400">of {book.totalCopies} copies available</p>
            {reservationCount > 0 && (
              <p className="text-xs text-yellow-400 mt-1">{reservationCount} in queue</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Title & authors */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {genres.map((g) => (
                <span key={g} className="badge badge-indigo text-xs">{g}</span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight">{book.title}</h1>
            <p className="text-lg text-gray-400 mt-1">{book.authors.join(", ")}</p>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Building2, label: "Publisher", value: book.publisher },
              { icon: Calendar, label: "Published", value: String(book.publishedYear) },
              { icon: Globe, label: "Language", value: book.language },
              { icon: Hash, label: "ISBN", value: book.isbn },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass-card p-3 flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm text-white font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Synopsis */}
          {book.synopsis && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Synopsis</h2>
              <p className="text-gray-300 leading-relaxed text-sm">{book.synopsis}</p>
            </div>
          )}

          {/* Actions — client component */}
          {session?.user?.id ? (
            <BorrowReserveOwn
              bookId={book.id}
              availableCopies={availableCopies}
              userBorrowingId={userBorrowing?.id ?? null}
              hasReservation={!!userReservation}
              hasOwnership={!!userOwnership}
            />
          ) : (
            <a href="/login" className="btn-primary w-full text-center py-3">
              Sign in to borrow this book
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
