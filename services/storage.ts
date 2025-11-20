import { WordData, BookMetadata, LearningHistory, BookProgress, UserProfile, UserRole } from '../types';

// CONSTANTS
const APP_ID = "medace-pro";
const PRIORITY_KEYWORDS = ["System", "Target", "DUO", "Core"];

// MOCK DATA STORE (Simulating Firebase Firestore)
// Enforces paths:
// /artifacts/{appId}/public/data/words/{docId}
// /users/{uid}/history/{wordId}

class StorageService {
  private books: Map<string, BookMetadata> = new Map();
  private words: Map<string, WordData[]> = new Map(); // bookId -> words
  private userHistory: Map<string, Map<string, LearningHistory>> = new Map(); // uid -> wordId -> history
  private users: Map<string, UserProfile> = new Map(); // Store user profiles for Instructor view

  constructor() {
    this.seedData();
  }

  private seedData() {
    const demoBookId = "demo-duo";
    const demoBook: BookMetadata = {
      id: demoBookId,
      title: "DUO 3.0 (体験版)",
      wordCount: 5,
      isPriority: true,
      description: "難関大合格を目指すための必須単語集（デモ）"
    };
    this.books.set(demoBookId, demoBook);
    
    const words: WordData[] = [
      { id: "d1", bookId: demoBookId, number: 1, word: "respect", definition: "〜を尊重する", searchKey: "respect" },
      { id: "d2", bookId: demoBookId, number: 2, word: "individual", definition: "個人の", searchKey: "individual" },
      { id: "d3", bookId: demoBookId, number: 3, word: "will", definition: "意志", searchKey: "will" },
      { id: "d4", bookId: demoBookId, number: 4, word: "take it easy", definition: "気楽にやる", searchKey: "take it easy" },
      { id: "d5", bookId: demoBookId, number: 5, word: "assure", definition: "〜を保証する", searchKey: "assure" },
    ];
    this.words.set(demoBookId, words);
  }

  // --- ADMIN: Batch Import Logic ---
  async batchImportWords(bookName: string, csvRows: any[], onProgress: (progress: number) => void): Promise<void> {
    const BATCH_SIZE = 500;
    const total = csvRows.length;
    let processed = 0;

    const bookId = bookName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isPriority = PRIORITY_KEYWORDS.some(k => bookName.includes(k));

    const bookMeta: BookMetadata = {
      id: bookId,
      title: bookName,
      wordCount: total,
      isPriority,
    };
    this.books.set(bookId, bookMeta);

    const newWords: WordData[] = [];
    
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = csvRows.slice(i, i + BATCH_SIZE);
      await new Promise(r => setTimeout(r, 100)); // Simulate network

      batch.forEach(row => {
        const number = parseInt(row['単語番号'] || row['No'] || '0');
        const word = row['単語'] || row['Word'] || '';
        const def = row['日本語訳'] || row['Meaning'] || '';

        if (word && def) {
          const docId = `${bookId}_${number}`;
          newWords.push({
            id: docId,
            bookId,
            number,
            word,
            definition: def,
            searchKey: word.toLowerCase()
          });
        }
      });

      processed += batch.length;
      onProgress((processed / total) * 100);
    }

    this.words.set(bookId, newWords);
  }

  // --- PUBLIC: Fetching ---
  async getBooks(): Promise<BookMetadata[]> {
    await new Promise(r => setTimeout(r, 300)); // Simulate latency
    return Array.from(this.books.values());
  }

  async getWordsByBook(bookId: string): Promise<WordData[]> {
    return this.words.get(bookId) || [];
  }

  // --- STUDENT: History & Progress ---
  async saveHistory(uid: string, result: LearningHistory): Promise<void> {
    // Mock Firestore: /users/{uid}/history/{wordId} set({ ... }, { merge: true })
    if (!this.userHistory.has(uid)) {
      this.userHistory.set(uid, new Map());
    }
    const userMap = this.userHistory.get(uid)!;
    
    const existing = userMap.get(result.wordId);
    
    const merged: LearningHistory = {
      wordId: result.wordId,
      bookId: result.bookId,
      status: result.status, // Update status to latest result
      lastStudiedAt: Date.now(),
      correctCount: (existing?.correctCount || 0) + (result.status === 'learned' ? 1 : 0),
      attemptCount: (existing?.attemptCount || 0) + 1,
    };

    userMap.set(result.wordId, merged);
  }

  async getBookProgress(uid: string, bookId: string): Promise<BookProgress> {
    const bookWords = this.words.get(bookId) || [];
    const totalCount = bookWords.length;
    
    if (totalCount === 0) return { bookId, learnedCount: 0, totalCount: 0, percentage: 0 };

    const userMap = this.userHistory.get(uid);
    if (!userMap) return { bookId, learnedCount: 0, totalCount, percentage: 0 };

    let learnedCount = 0;
    bookWords.forEach(w => {
      const h = userMap.get(w.id);
      // A word is considered "learned" if status is 'learned'
      if (h && h.status === 'learned') {
        learnedCount++;
      }
    });

    return {
      bookId,
      learnedCount,
      totalCount,
      percentage: Math.round((learnedCount / totalCount) * 100)
    };
  }

  // --- INSTRUCTOR: Aggregation ---
  // In real Firestore, this would be a collectionGroup query or aggregated metadata
  async getAllStudentsProgress(): Promise<any[]> {
    await new Promise(r => setTimeout(r, 500));
    
    const students: any[] = [];
    
    // This iterates over the in-memory mock. 
    // In real Firestore, you would query the 'users' collection where role == STUDENT
    // and then fetch their progress summaries.
    for (const [uid, historyMap] of this.userHistory.entries()) {
        let totalLearned = 0;
        let totalAttempts = 0;
        historyMap.forEach(h => {
            if (h.status === 'learned') totalLearned++;
            totalAttempts += h.attemptCount;
        });

        students.push({
            uid,
            name: uid === 'student1' ? '鈴木 健太' : `生徒 ${uid.substring(0,4)}`, // Mock name resolution
            totalLearned,
            totalAttempts,
            lastActive: Date.now() // Mock
        });
    }
    return students;
  }
}

export const storage = new StorageService();