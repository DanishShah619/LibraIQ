import { Prisma } from "@prisma/client";

export type BookWithGenres = Prisma.BookGetPayload<{
  include: {
    genres: { include: { genre: true } };
  };
}>;

export type BorrowingWithBook = Prisma.BorrowingGetPayload<{
  include: { book: { include: { genres: { include: { genre: true } } } } };
}>;

export type UserWithStats = Prisma.UserGetPayload<{
  select: {
    id: true; email: true; firstName: true; lastName: true;
    role: true; totalPoints: true; level: true; avatarUrl: true; isActive: true;
    _count: { select: { borrowings: true; badges: true } };
  };
}>;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BookSearchParams {
  q?: string;
  genre?: string;
  language?: string;
  yearFrom?: number;
  yearTo?: number;
  available?: boolean;
  page?: number;
  pageSize?: number;
}

export const LEVELS = [
  { name: "Novice",       min: 0,    max: 199  },
  { name: "Explorer",     min: 200,  max: 499  },
  { name: "Scholar",      min: 500,  max: 999  },
  { name: "Bibliophile",  min: 1000, max: 1999 },
  { name: "Grand Archivist", min: 2000, max: Infinity },
] as const;

export type LevelName = typeof LEVELS[number]["name"];

export function getLevelFromPoints(points: number): LevelName {
  return (LEVELS.find((l) => points >= l.min && points <= l.max)?.name ?? "Novice") as LevelName;
}

export const POINT_VALUES = {
  BORROW:     10,
  RETURN_ONTIME: 20,
  GENRE_FIRST: 15,
  BADGE:      50,
} as const;
