process.env.DATABASE_URL = process.env.DATABASE_URL; // keep existing override
require("dotenv").config({ override: false }); 


const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
console.log("Connecting to:", process.env.DATABASE_URL);

async function main() {
  console.log("🌱 Seeding database...");
const genres = [];
  // ── Genres ──────────────────────────────────────────────────────────
  const genreNames = [
    "Fiction", "Non-fiction", "Science Fiction", "Fantasy", "Mystery",
    "Thriller", "Historical Fiction", "Biography", "Self-help",
    "Psychology", "Science", "Philosophy", "Young Adult", "Classic",
    "Dystopian", "Adventure", "Horror", "Crime", "Coming-of-Age","Geopolitics","History","Economics"
  ];

  
for (const name of genreNames) {
  const genre = await prisma.genre.upsert({ where: { name }, create: { name }, update: {} });
  genres.push(genre);
}
console.log(`✅ Seeded ${genres.length} genres`);

  // ── Badges ──────────────────────────────────────────────────────────
  const badges = [
    { key: "first_borrow",   name: "First Chapter",    description: "Borrowed your first book from the library", iconUrl: "📖" },
    { key: "ten_books_read", name: "Bookworm",          description: "Returned 10 books from the library", iconUrl: "🐛" },
    { key: "genre_master",   name: "Genre Master",      description: "Read 5 or more books in a single genre", iconUrl: "🎭" },
    { key: "speed_reader",   name: "Speed Reader",      description: "Returned a book within 3 days of borrowing", iconUrl: "⚡" },
    { key: "loyal_reader",   name: "Loyal Reader",      description: "Actively borrowed books for 6 consecutive months", iconUrl: "💎" },
  ];

 for (const b of badges) {
  await prisma.badge.upsert({ where: { key: b.key }, create: b, update: b });
}
  console.log(`✅ Seeded ${badges.length} badges`);

  // ── Super Admin ──────────────────────────────────────────────────────
  const adminEmail = "admin@libraiq.dev";
  const adminHash = await bcrypt.hash("Admin@123456", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email:        adminEmail,
      passwordHash: adminHash,
      firstName:    "Super",
      lastName:     "Admin",
      role:         "SUPER_ADMIN",
    },
    update: {},
  });
  console.log(`✅ Super Admin seeded: ${adminEmail} / Admin@123456`);

  // ── Librarian ────────────────────────────────────────────────────────
  const libEmail = "librarian@libraiq.dev";
  const libHash = await bcrypt.hash("Lib@123456", 12);

  await prisma.user.upsert({
    where: { email: libEmail },
    create: {
      email:        libEmail,
      passwordHash: libHash,
      firstName:    "Jane",
      lastName:     "Librarian",
      role:         "LIBRARIAN",
    },
    update: {},
  });
  console.log(`✅ Librarian seeded: ${libEmail} / Lib@123456`);

  // ── Sample Books ─────────────────────────────────────────────────────
  const genreMap = Object.fromEntries(genres.map((g) => [g.name, g.id]));
  const sampleBooks = [
    {
      isbn: "9780061965548", title: "The Hobbit", authors: ["J.R.R. Tolkien"],
      publisher: "HarperCollins", publishedYear: 1937, totalCopies: 3,
      synopsis: "A reluctant hobbit embarks on a grand adventure.",
      genres: ["Fantasy", "Adventure"],
    },
    {
      isbn: "9780451524935", title: "1984", authors: ["George Orwell"],
      publisher: "Signet Classic", publishedYear: 1949, totalCopies: 5,
      synopsis: "A totalitarian future where Big Brother watches everyone.",
      genres: ["Dystopian", "Science Fiction", "Classic"],
    },
    {
      isbn: "9780743273565", title: "The Great Gatsby", authors: ["F. Scott Fitzgerald"],
      publisher: "Scribner", publishedYear: 1925, totalCopies: 4,
      synopsis: "A mysterious millionaire pursues a lost love in 1920s America.",
      genres: ["Classic", "Fiction"],
    },
    {
      isbn: "9780385490818", title: "Dune", authors: ["Frank Herbert"],
      publisher: "Ace Books", publishedYear: 1965, totalCopies: 2,
      synopsis: "An epic tale of politics, religion, ecology, and technology on a desert planet.",
      genres: ["Science Fiction", "Fantasy"],
    },
    {
      isbn: "9780062409850", title: "Sapiens", authors: ["Yuval Noah Harari"],
      publisher: "Harper", publishedYear: 2011, totalCopies: 3,
      synopsis: "A brief history of humankind from ancient organisms to modern society.",
      genres: ["Non-fiction", "Science", "Philosophy"],
    },
  ];

  for (const book of sampleBooks) {
    const existing = await prisma.book.findUnique({ where: { isbn: book.isbn } });
    if (existing) continue;

    const { genres: bookGenres, ...bookData } = book;
    await prisma.book.create({
      data: {
        ...bookData,
        genres: {
          create: bookGenres
            .filter((g) => genreMap[g])
            .map((g) => ({ genreId: genreMap[g] })),
        },
      },
    });
  }
  console.log(`✅ Seeded ${sampleBooks.length} sample books`);

  console.log("🎉 Database seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());