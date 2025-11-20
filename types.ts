export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  email: string;
}

export interface WordData {
  id: string;
  bookId: string;
  number: number;
  word: string;
  definition: string;
  searchKey?: string; // lower case for search
}

export interface BookMetadata {
  id: string;
  title: string;
  wordCount: number;
  isPriority: boolean;
  description?: string;
}

export interface LearningHistory {
  wordId: string;
  bookId: string;
  status: 'learned' | 'review';
  lastStudiedAt: number; // Timestamp
  correctCount: number;
  attemptCount: number;
}

export interface BookProgress {
  bookId: string;
  learnedCount: number;
  totalCount: number;
  percentage: number;
}

export interface CsvRow {
  [key: string]: string;
}
