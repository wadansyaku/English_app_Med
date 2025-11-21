
import { WordData, BookMetadata, LearningHistory, BookProgress, UserProfile, UserStats, StudentSummary, StudentRiskLevel, UserRole, LearningPlan, LeaderboardEntry, MasteryDistribution, ActivityLog } from '../types';
import { SupabaseStorageService } from './supabase';

export interface IStorageService {
  login(role: UserRole): Promise<UserProfile | null>; 
  authenticate(email: string, password: string, isSignUp: boolean, role?: UserRole): Promise<UserProfile | null>; 
  saveSession(user: UserProfile): Promise<void>;
  updateSessionUser(user: UserProfile): Promise<void>;
  clearSession(): Promise<void>;
  getSession(): Promise<UserProfile | null>;
  addXP(user: UserProfile, amount: number): Promise<{ user: UserProfile, leveledUp: boolean }>;
  
  batchImportWords(defaultBookName: string, csvRows: any[], onProgress: (progress: number) => void, createdByUid?: string, contextSummary?: string): Promise<void>;
  getBooks(): Promise<BookMetadata[]>;
  deleteBook(bookId: string): Promise<void>; 
  
  getWordsByBook(bookId: string): Promise<WordData[]>;
  updateWord(word: WordData): Promise<void>;
  reportWord(wordId: string, reason: string): Promise<void>; // New
  
  updateWordCache(wordId: string, sentence: string, translation: string): Promise<void>;
  
  getDailySessionWords(uid: string, limit: number): Promise<WordData[]>;
  getBookSession(uid: string, bookId: string, limit: number): Promise<WordData[]>;
  getDueCount(uid: string): Promise<number>;
  
  saveSRSHistory(uid: string, word: WordData, rating: number): Promise<void>;
  saveHistory(uid: string, result: Partial<LearningHistory> & { wordId: string, bookId: string }): Promise<void>;
  getBookProgress(uid: string, bookId: string): Promise<BookProgress>;
  
  getAllStudentsProgress(): Promise<StudentSummary[]>;
  resetAllData(): Promise<void>;

  // Plan
  saveLearningPlan(plan: LearningPlan): Promise<void>;
  getLearningPlan(uid: string): Promise<LearningPlan | null>;

  // Analytics & Social
  getLeaderboard(currentUid: string): Promise<LeaderboardEntry[]>;
  getMasteryDistribution(uid: string): Promise<MasteryDistribution>;
  getActivityLogs(uid: string): Promise<ActivityLog[]>;
}

const DB_NAME = 'MedAceDB';
const DB_VERSION = 2; // Increment for new stores if needed (IDB)
const STORES = {
  BOOKS: 'books',
  WORDS: 'words',
  HISTORY: 'history',
  SESSION: 'session',
  PLANS: 'plans' // New store
};

// Mocks
const IDB_MOCK_USERS: UserProfile[] = [
  { uid: 'mock-student-001', displayName: '鈴木 健太', role: UserRole.STUDENT, email: 'kenta@medace.com', stats: { xp: 1250, level: 12, currentStreak: 5, lastLoginDate: '2023-10-27' } },
  { uid: 'mock-instructor-001', displayName: 'Oak 先生', role: UserRole.INSTRUCTOR, email: 'oak@medace.com' },
  { uid: 'mock-admin-001', displayName: 'システム管理者', role: UserRole.ADMIN, email: 'admin@medace.com' }
];

// Helper for Progress Calculation
const calculatePercentage = (learned: number, total: number): number => {
    if (total === 0) return 0;
    if (learned === 0) return 0;
    if (learned === total) return 100;
    
    const pct = Math.round((learned / total) * 100);
    if (pct === 0 && learned > 0) return 1; // Ensure at least 1% if started
    if (pct === 100 && learned < total) return 99; // Prevent premature 100%
    return pct;
};

class IndexedDBStorageService implements IStorageService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.BOOKS)) db.createObjectStore(STORES.BOOKS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.WORDS)) {
          const wordStore = db.createObjectStore(STORES.WORDS, { keyPath: 'id' });
          wordStore.createIndex('bookId', 'bookId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.HISTORY)) db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.SESSION)) db.createObjectStore(STORES.SESSION, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STORES.PLANS)) db.createObjectStore(STORES.PLANS, { keyPath: 'uid' });
      };
      request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async login(role: UserRole): Promise<UserProfile | null> {
    return IDB_MOCK_USERS.find(u => u.role === role) || null;
  }

  async authenticate(email: string, password: string, isSignUp: boolean, role?: UserRole): Promise<UserProfile | null> {
    if (isSignUp) {
        return { 
            uid: `mock-user-${Date.now()}`, 
            displayName: email.split('@')[0], 
            role: role || UserRole.STUDENT, 
            email 
        };
    }
    return IDB_MOCK_USERS.find(u => u.email === email) || IDB_MOCK_USERS[0];
  }

  async saveSession(user: UserProfile): Promise<void> {
    const updatedUser = await this.updateStreak(user);
    const store = await this.getStore(STORES.SESSION, 'readwrite');
    store.put({ key: 'current', user: updatedUser });
  }
  
  async updateSessionUser(user: UserProfile): Promise<void> {
    const store = await this.getStore(STORES.SESSION, 'readwrite');
    store.put({ key: 'current', user });
  }

  async clearSession(): Promise<void> {
    const store = await this.getStore(STORES.SESSION, 'readwrite');
    store.delete('current');
  }

  async getSession(): Promise<UserProfile | null> {
    const store = await this.getStore(STORES.SESSION);
    return new Promise((resolve) => {
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result ? request.result.user : null);
      request.onerror = () => resolve(null);
    });
  }

  private async updateStreak(user: UserProfile): Promise<UserProfile> {
    const today = new Date().toISOString().split('T')[0];
    let stats: UserStats = user.stats || { xp: 0, level: 1, currentStreak: 0, lastLoginDate: '' };
    if (stats.lastLoginDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (stats.lastLoginDate === yesterdayStr) stats.currentStreak += 1;
        else if (stats.lastLoginDate !== today) stats.currentStreak = 1;
        stats.lastLoginDate = today;
    }
    return { ...user, stats };
  }

  async addXP(user: UserProfile, amount: number): Promise<{ user: UserProfile, leveledUp: boolean }> {
    if (!user.stats) user.stats = { xp: 0, level: 1, currentStreak: 1, lastLoginDate: new Date().toISOString().split('T')[0] };
    let { xp, level } = user.stats;
    xp += amount;
    const xpToNextLevel = level * 100;
    let leveledUp = false;
    if (xp >= xpToNextLevel) { xp -= xpToNextLevel; level += 1; leveledUp = true; }
    const updatedStats = { ...user.stats, xp, level };
    const updatedUser = { ...user, stats: updatedStats };
    await this.updateSessionUser(updatedUser);
    return { user: updatedUser, leveledUp };
  }

  async batchImportWords(defaultBookName: string, csvRows: any[], onProgress: (progress: number) => void, createdByUid?: string, contextSummary?: string): Promise<void> {
    const db = await this.dbPromise;
    const bookGroups = new Map<string, { meta: BookMetadata, words: WordData[] }>();
    const total = csvRows.length;

    for (let i = 0; i < total; i++) {
      const row = csvRows[i];
      let bookName = row['BookName'] || row['book_name'] || row['_col0'] || defaultBookName;
      if (!bookName || typeof bookName !== 'string') bookName = defaultBookName;
      
      let bookId = bookName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (createdByUid) {
         bookId = `${createdByUid.slice(0,5)}-${bookId}-${Date.now()}`;
      }

      const number = parseInt(row['Number'] || row['_col1'] || '0');
      const word = row['Word'] || row['_col2'] || '';
      const def = row['Meaning'] || row['_col3'] || '';

      if (word && def) {
        if (!bookGroups.has(bookId)) {
            const desc = createdByUid 
                ? JSON.stringify({ createdBy: createdByUid, type: 'USER_GENERATED' }) 
                : 'Imported';
            
            bookGroups.set(bookId, {
                meta: { 
                    id: bookId, 
                    title: bookName, 
                    wordCount: 0, 
                    isPriority: !createdByUid && bookName.includes("DUO"), 
                    description: desc,
                    sourceContext: contextSummary // Save Context
                },
                words: []
            });
        }
        bookGroups.get(bookId)!.words.push({
          id: `${bookId}_${number}_${i}`, bookId, number, word, definition: def, searchKey: word.toLowerCase()
        });
      }
      if (i % 1000 === 0) { onProgress((i / total) * 50); await new Promise(r => setTimeout(r, 0)); }
    }

    const tx = db.transaction([STORES.BOOKS, STORES.WORDS], 'readwrite');
    for (const [bookId, data] of bookGroups) {
      data.meta.wordCount = data.words.length;
      tx.objectStore(STORES.BOOKS).put(data.meta);
      data.words.forEach(w => tx.objectStore(STORES.WORDS).put(w));
    }
    return new Promise((resolve) => {
        tx.oncomplete = () => { onProgress(100); resolve(); };
    });
  }

  async getBooks(): Promise<BookMetadata[]> {
    const store = await this.getStore(STORES.BOOKS);
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }
  
  async deleteBook(bookId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction([STORES.BOOKS, STORES.WORDS, STORES.HISTORY], 'readwrite');
    
    tx.objectStore(STORES.BOOKS).delete(bookId);
    const wordsStore = tx.objectStore(STORES.WORDS);
    const index = wordsStore.index('bookId');
    const wordReq = index.getAllKeys(bookId);
    
    wordReq.onsuccess = () => {
        const keys = wordReq.result;
        keys.forEach(k => wordsStore.delete(k));
    };
    return new Promise(r => { tx.oncomplete = () => r(); });
  }

  async getWordsByBook(bookId: string): Promise<WordData[]> {
    const store = await this.getStore(STORES.WORDS);
    const index = store.index('bookId');
    return new Promise((resolve) => {
      const request = index.getAll(bookId);
      request.onsuccess = () => resolve((request.result || []).sort((a:any, b:any) => a.number - b.number));
    });
  }
  
  async updateWord(word: WordData): Promise<void> {
    const store = await this.getStore(STORES.WORDS, 'readwrite');
    return new Promise((resolve) => {
        store.put(word);
        resolve();
    });
  }

  async reportWord(wordId: string, reason: string): Promise<void> {
      const store = await this.getStore(STORES.WORDS, 'readwrite');
      return new Promise((resolve) => {
          const req = store.get(wordId);
          req.onsuccess = () => {
              const word = req.result;
              if (word) {
                  word.isReported = true;
                  // In real app, would save 'reason' to a reports table
                  store.put(word);
              }
              resolve();
          }
      });
  }

  async updateWordCache(wordId: string, sentence: string, translation: string): Promise<void> {
    const store = await this.getStore(STORES.WORDS, 'readwrite');
    return new Promise((resolve) => {
      const req = store.get(wordId);
      req.onsuccess = () => {
        const word = req.result;
        if (word) {
          word.exampleSentence = sentence;
          word.exampleMeaning = translation;
          store.put(word);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  async getDailySessionWords(uid: string, limit: number): Promise<WordData[]> {
    const historyStore = await this.getStore(STORES.HISTORY);
    const dueWordIds: string[] = [];
    const allStudiedWordIds = new Set<string>();
    const now = Date.now();

    await new Promise<void>((resolve) => {
      const request = historyStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          if (record.id.startsWith(uid + '_')) {
             const h = record.data as LearningHistory;
             if (h.status !== 'graduated') {
                 if (h.nextReviewDate <= now) dueWordIds.push(h.wordId);
             }
             allStudiedWordIds.add(h.wordId);
          }
          cursor.continue();
        } else { resolve(); }
      };
    });

    const sessionWords: WordData[] = [];
    const wordsStore = await this.getStore(STORES.WORDS);
    
    for (const id of dueWordIds.slice(0, limit)) {
        const w = await new Promise<WordData>((res) => { const req = wordsStore.get(id); req.onsuccess = () => res(req.result); });
        if (w) sessionWords.push(w);
    }

    if (sessionWords.length < limit) {
        const needed = limit - sessionWords.length;
        const request = wordsStore.openCursor();
        await new Promise<void>((resolve) => {
            let count = 0;
            request.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest).result;
                if (cursor && count < needed) {
                    const word = cursor.value as WordData;
                    if (!allStudiedWordIds.has(word.id)) { sessionWords.push(word); count++; }
                    cursor.continue();
                } else { resolve(); }
            };
        });
    }
    return sessionWords;
  }

  async getBookSession(uid: string, bookId: string, limit: number): Promise<WordData[]> {
    const allWords = await this.getWordsByBook(bookId);
    const historyStore = await this.getStore(STORES.HISTORY);
    
    const historyMap = new Map<string, LearningHistory>();
    await new Promise<void>((resolve) => {
        const req = historyStore.getAll();
        req.onsuccess = () => {
            const records = req.result || [];
            records.forEach((r:any) => {
                if (r.id.startsWith(uid + '_')) historyMap.set(r.data.wordId, r.data);
            });
            resolve();
        }
    });

    const now = Date.now();
    const due: WordData[] = [];
    const newWords: WordData[] = [];
    const ahead: WordData[] = [];

    for (const word of allWords) {
        const h = historyMap.get(word.id);
        if (!h) {
            newWords.push(word);
        } else {
            if (h.status === 'graduated') continue;
            if (h.nextReviewDate <= now) due.push(word);
            else ahead.push(word);
        }
    }

    let session = [...due];
    if (session.length < limit) {
        const needed = limit - session.length;
        session = [...session, ...newWords.slice(0, needed)];
    }
    if (session.length < limit) {
        const needed = limit - session.length;
        ahead.sort((a,b) => {
            const hA = historyMap.get(a.id);
            const hB = historyMap.get(b.id);
            return (hA?.nextReviewDate || 0) - (hB?.nextReviewDate || 0);
        });
        session = [...session, ...ahead.slice(0, needed)];
    }
    
    return session;
  }

  async getDueCount(uid: string): Promise<number> {
    const historyStore = await this.getStore(STORES.HISTORY);
    let count = 0;
    const now = Date.now();
    return new Promise((resolve) => {
        const request = historyStore.openCursor();
        request.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
                const h = cursor.value.data as LearningHistory;
                if (cursor.value.id.startsWith(uid + '_') && h.nextReviewDate <= now && h.status !== 'graduated') count++;
                cursor.continue();
            } else resolve(count);
        };
    });
  }

  async saveSRSHistory(uid: string, word: WordData, rating: number): Promise<void> {
    const store = await this.getStore(STORES.HISTORY, 'readwrite');
    const id = `${uid}_${word.id}`;
    return new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => {
            const existing = req.result?.data;
            let interval = existing?.interval || 0;
            let ease = existing?.easeFactor || 2.5;
            let attemptCount = (existing?.attemptCount || 0) + 1;
            let correctCount = (existing?.correctCount || 0) + (rating >= 2 ? 1 : 0);

            if (rating === 0) { interval = 0; ease = Math.max(1.3, ease - 0.2); }
            else {
                if (rating === 1) interval = 1;
                else if (rating === 2) interval = interval === 0 ? 1 : Math.ceil(interval * ease);
                else if (rating === 3) { interval = interval === 0 ? 3 : Math.ceil(interval * ease * 1.3); ease += 0.15; }
                if (interval > 365) interval = 365;
            }
            const nextReview = Date.now() + (interval * 86400000);
            store.put({ id, data: { wordId: word.id, bookId: word.bookId, status: interval > 20 ? 'graduated' : 'learning', lastStudiedAt: Date.now(), nextReviewDate: nextReview, interval, easeFactor: ease, correctCount, attemptCount } });
            resolve();
        };
    });
  }

  async saveHistory(uid: string, result: Partial<LearningHistory>): Promise<void> {
     const store = await this.getStore(STORES.HISTORY, 'readwrite');
     store.put({ id: `${uid}_${result.wordId}`, data: { ...result, lastStudiedAt: Date.now() } });
  }

  async getBookProgress(uid: string, bookId: string): Promise<BookProgress> {
    const words = await this.getWordsByBook(bookId);
    if (words.length === 0) return { bookId, learnedCount: 0, totalCount: 0, percentage: 0 };
    const store = await this.getStore(STORES.HISTORY);
    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const all = request.result || [];
            let learned = 0;
            all.forEach((r: any) => {
                if (r.id.startsWith(uid + '_') && r.data.bookId === bookId) {
                    if(r.data.attemptCount > 0 || r.data.interval > 0) learned++;
                }
            });
            const percentage = calculatePercentage(learned, words.length);
            resolve({ bookId, learnedCount: learned, totalCount: words.length, percentage });
        };
    });
  }

  async getAllStudentsProgress(): Promise<StudentSummary[]> {
    return [
        { uid: 'student1', name: '鈴木 健太', email: 'kenta@medace.com', totalLearned: 150, totalAttempts: 300, lastActive: Date.now(), riskLevel: StudentRiskLevel.SAFE, accuracy: 0.85 },
        { uid: 'student2', name: '田中 陽葵', email: 'hina@medace.com', totalLearned: 45, totalAttempts: 60, lastActive: Date.now() - 86400000 * 4, riskLevel: StudentRiskLevel.DANGER, accuracy: 0.60 }
    ];
  }

  async resetAllData(): Promise<void> {
      const db = await this.dbPromise;
      const tx = db.transaction([STORES.BOOKS, STORES.WORDS, STORES.HISTORY, STORES.SESSION, STORES.PLANS], 'readwrite');
      tx.objectStore(STORES.BOOKS).clear();
      tx.objectStore(STORES.WORDS).clear();
      tx.objectStore(STORES.HISTORY).clear();
      tx.objectStore(STORES.SESSION).clear();
      tx.objectStore(STORES.PLANS).clear();
      return new Promise(r => { tx.oncomplete = () => r(); });
  }

  async saveLearningPlan(plan: LearningPlan): Promise<void> {
      const store = await this.getStore(STORES.PLANS, 'readwrite');
      store.put(plan);
  }

  async getLearningPlan(uid: string): Promise<LearningPlan | null> {
      const store = await this.getStore(STORES.PLANS);
      return new Promise((resolve) => {
          const req = store.get(uid);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
      });
  }

  // Analytics Mock (IDB)
  async getLeaderboard(currentUid: string): Promise<LeaderboardEntry[]> {
      // In pure IDB mode, only the current user exists usually. We can mock "other students".
      const user = await this.getSession();
      const entries: LeaderboardEntry[] = [
          { uid: 'rival-1', displayName: '田中 陽葵', xp: (user?.stats?.xp || 0) + 500, level: 15, rank: 1, isCurrentUser: false },
          { uid: 'rival-2', displayName: '佐藤 翔太', xp: (user?.stats?.xp || 0) + 200, level: 14, rank: 2, isCurrentUser: false },
          { uid: currentUid, displayName: user?.displayName || 'Me', xp: user?.stats?.xp || 0, level: user?.stats?.level || 1, rank: 3, isCurrentUser: true },
          { uid: 'rival-3', displayName: '高橋 優子', xp: Math.max(0, (user?.stats?.xp || 0) - 300), level: 10, rank: 4, isCurrentUser: false },
      ];
      return entries.sort((a,b) => b.xp - a.xp).map((e, i) => ({...e, rank: i + 1}));
  }

  async getMasteryDistribution(uid: string): Promise<MasteryDistribution> {
      const store = await this.getStore(STORES.HISTORY);
      return new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => {
              const all = req.result || [];
              const dist = { new: 0, learning: 0, review: 0, graduated: 0, total: 0 };
              all.forEach((r:any) => {
                  if (r.id.startsWith(uid + '_')) {
                      const h = r.data as LearningHistory;
                      if (h.status === 'graduated') dist.graduated++;
                      else if (h.status === 'review' || (h.status === 'learning' && h.interval > 3)) dist.review++;
                      else dist.learning++;
                      dist.total++;
                  }
              });
              resolve(dist);
          }
      });
  }

  async getActivityLogs(uid: string): Promise<ActivityLog[]> {
    const store = await this.getStore(STORES.HISTORY);
    return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
            const all = req.result || [];
            const counts: Record<string, number> = {};
            all.forEach((r: any) => {
                if(r.id.startsWith(uid + '_')) {
                    const date = new Date(r.data.lastStudiedAt).toISOString().split('T')[0];
                    counts[date] = (counts[date] || 0) + 1;
                }
            });
            
            const logs = Object.keys(counts).map(date => {
                const count = counts[date];
                let intensity: 0|1|2|3|4 = 0;
                if (count > 0) intensity = 1;
                if (count > 5) intensity = 2;
                if (count > 15) intensity = 3;
                if (count > 30) intensity = 4;
                return { date, count, intensity };
            });
            resolve(logs);
        }
    });
  }
}

const USE_SUPABASE = true; 

export const storage: IStorageService = USE_SUPABASE 
    ? new SupabaseStorageService() 
    : new IndexedDBStorageService();
