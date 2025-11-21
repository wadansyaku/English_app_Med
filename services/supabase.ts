
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WordData, BookMetadata, LearningHistory, BookProgress, UserProfile, UserStats, StudentSummary, StudentRiskLevel, UserRole, LearningPlan, LeaderboardEntry, MasteryDistribution, ActivityLog } from '../types';
import { IStorageService } from './storage';

// ==========================================
// 設定エリア
// ==========================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlkonxbeicwowiewjuxn.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa29ueGJlaWN3b3dpZXdqdXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDM5MTksImV4cCI6MjA3OTE3OTkxOX0.FdQDJHhMewl2wsZ2Yw3rF3xN6tbWzP3NwrdccAhA7UY';
// ==========================================

export class SupabaseStorageService implements IStorageService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
      console.error("Supabase Credentials Missing!");
    }
  }

  private get client() {
    if (!this.supabase) throw new Error("Supabase Client not initialized.");
    return this.supabase;
  }

  private handleSupabaseError(error: any, context: string): never {
    console.error(`Supabase Error [${context}]:`, JSON.stringify(error, null, 2));
    
    // Check for RLS (Row Level Security) errors
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('データベースの権限エラーです。SupabaseのSQL Editorで「全権限付与(RLS Policies)」のクエリを実行してください。');
    }
    
    throw new Error(`${context}に失敗しました: ${error.message}`);
  }

  private translateAuthError(error: any): Error {
    const msg = error.message || '';
    if (msg.includes('Invalid login credentials')) {
        return new Error("メールアドレスまたはパスワードが間違っています。");
    }
    if (msg.includes('User already registered')) {
        return new Error("このメールアドレスは既に登録されています。");
    }
    if (msg.includes('Password should be at least')) {
        return new Error("パスワードは6文字以上にしてください。");
    }
    if (msg.includes('Rate limit exceeded') || msg.includes('Too many requests')) {
        return new Error("試行回数が多すぎます。しばらく待ってから再試行してください。");
    }
    return new Error(`認証エラー: ${msg}`);
  }

  // --- AUTH / SESSION ---

  // Manual Authentication (Email/Password)
  async authenticate(email: string, password: string, isSignUp: boolean, role: UserRole = UserRole.STUDENT): Promise<UserProfile | null> {
    try {
        let uid = '';
        let finalEmail = email;
        
        if (isSignUp) {
            const { data, error } = await this.client.auth.signUp({ email, password });
            if (error) throw this.translateAuthError(error);
            
            if (data.user && !data.session) {
                throw new Error("確認メールを送信しました。メール内のリンクをクリックして認証を完了してください。(Supabase設定でConfirm EmailをOFFにすると即座にログインできます)");
            }
            
            if (data.user) uid = data.user.id;
        } else {
            const { data, error } = await this.client.auth.signInWithPassword({ email, password });
            if (error) throw this.translateAuthError(error);
            if (data.user) uid = data.user.id;
        }

        if (!uid) throw new Error("ユーザーIDの取得に失敗しました。");

        // Create/Get Profile
        let profile: UserProfile = {
            uid,
            email: finalEmail,
            displayName: email.split('@')[0],
            role,
            stats: { xp: 0, level: 1, currentStreak: 1, lastLoginDate: new Date().toISOString().split('T')[0] }
        };

        const { data: existing } = await this.client.from('profiles').select('*').eq('id', uid).single();
        
        if (existing) {
            profile.displayName = existing.display_name;
            profile.role = existing.role as UserRole;
            profile.stats = existing.stats;
            profile.grade = existing.grade;
            profile.englishLevel = existing.english_level;
        } else {
            // New user -> Needs Onboarding
            profile.needsOnboarding = true;
            await this.saveSession(profile);
        }
        
        return profile;

    } catch (e) {
        console.error("Authentication Error:", e);
        throw e;
    }
  }

  // Demo / Auto Login
  async login(role: UserRole): Promise<UserProfile | null> {
    const baseEmail = `demo_${role.toLowerCase()}@medace.app`;
    const password = 'password123'; 

    let uid = '';
    let emailUsed = baseEmail;
    
    try {
        const { data: signInData, error: signInError } = await this.client.auth.signInWithPassword({
            email: baseEmail,
            password
        });

        if (!signInError && signInData.session) {
            uid = signInData.user.id;
        } else {
            console.log(`Sign in failed (${signInError?.message}). Attempting Sign Up or Guest Login...`);
            
            // Try signing up with the base demo email
            const { data: signUpData, error: signUpError } = await this.client.auth.signUp({
                email: baseEmail,
                password,
            });
            
            if (!signUpError && signUpData.user && signUpData.session) {
                uid = signUpData.user.id;
            } else {
                // If signup failed (likely user exists but password mismatch), create a unique guest account
                console.warn(`Demo signup failed. Creating unique guest account...`);
                const randomId = Math.floor(Math.random() * 1000000);
                const guestEmail = `guest_${role.toLowerCase()}_${randomId}@medace.app`;
                emailUsed = guestEmail;
                
                const { data: guestData, error: guestError } = await this.client.auth.signUp({
                    email: guestEmail,
                    password
                });

                if (!guestError && guestData.user && guestData.session) {
                    uid = guestData.user.id;
                } else {
                    console.warn("Guest signup failed, trying anonymous...");
                    const { data: anonData, error: anonError } = await this.client.auth.signInAnonymously();
                    if (anonData && anonData.session) {
                        uid = anonData.user.id;
                        emailUsed = `anon_${uid.slice(0,6)}@medace.app`;
                    } else {
                        console.error("All auth methods failed.");
                        return null;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Auth Critical Error:", e);
        return null;
    }

    if (!uid) return null;

    const displayName = role === UserRole.STUDENT ? '鈴木 健太 (Demo)' : role === UserRole.INSTRUCTOR ? 'Oak 先生 (Demo)' : 'システム管理者';
    
    // Fetch existing to check onboarding status or set defaults
    const { data: existing } = await this.client.from('profiles').select('*').eq('id', uid).single();

    const user: UserProfile = {
      uid,
      email: emailUsed,
      displayName: emailUsed.includes('guest') || emailUsed.includes('anon') ? `${displayName} (Guest)` : displayName,
      role,
      stats: existing?.stats || { xp: 0, level: 1, currentStreak: 1, lastLoginDate: new Date().toISOString().split('T')[0] },
      grade: existing?.grade,
      englishLevel: existing?.english_level,
      needsOnboarding: !existing?.english_level && role === UserRole.STUDENT
    };

    if (!existing) {
        await this.saveSession(user);
    }
    return user;
  }

  async saveSession(user: UserProfile): Promise<void> {
    if (!user.uid) return;
    try {
        const payload: any = {
            id: user.uid,
            email: user.email,
            display_name: user.displayName,
            role: user.role,
            stats: user.stats || { xp: 0, level: 1, currentStreak: 0, lastLoginDate: '' }
        };
        // Only add optional fields if they exist
        if (user.grade) payload.grade = user.grade;
        if (user.englishLevel) payload.english_level = user.englishLevel;

        const { error } = await this.client.from('profiles').upsert(payload);
        if (error) console.warn("Profile Sync Warning (Check DB schema):", error.message);
    } catch (e) {
        console.error("Session Save Error", e);
    }
  }

  async updateSessionUser(user: UserProfile): Promise<void> {
    await this.saveSession(user);
  }

  async clearSession(): Promise<void> {
    await this.client.auth.signOut();
  }

  async getSession(): Promise<UserProfile | null> {
    const { data: { session } } = await this.client.auth.getSession();
    if (!session) return null;

    const { data: profile } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profile) {
        return {
            uid: profile.id,
            displayName: profile.display_name,
            email: profile.email,
            role: profile.role as any,
            stats: profile.stats,
            grade: profile.grade,
            englishLevel: profile.english_level,
            needsOnboarding: !profile.english_level && profile.role === 'STUDENT'
        };
    }
    return null;
  }

  async addXP(user: UserProfile, amount: number): Promise<{ user: UserProfile; leveledUp: boolean }> {
    let stats = user.stats || { xp: 0, level: 1, currentStreak: 0, lastLoginDate: '' };
    stats.xp += amount;
    
    const xpToNext = stats.level * 100;
    let leveledUp = false;
    if (stats.xp >= xpToNext) {
        stats.xp -= xpToNext;
        stats.level += 1;
        leveledUp = true;
    }

    const updatedUser = { ...user, stats };
    await this.updateSessionUser(updatedUser);
    return { user: updatedUser, leveledUp };
  }

  // --- CONTENT MANAGEMENT ---

  async batchImportWords(defaultBookName: string, csvRows: any[], onProgress: (progress: number) => void, createdByUid?: string, contextSummary?: string): Promise<void> {
    console.log(`Starting batch import. Total rows: ${csvRows.length}`);
    if (csvRows.length === 0) return;

    const allKeys = Object.keys(csvRows[0]);
    let availableKeys = allKeys.filter(k => !k.startsWith('_col'));
    const cleanKey = (k: string) => k.trim().toLowerCase().replace(/[^a-z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/g, ''); 

    const candidates = {
        book: ['単語帳名', '単語帳', 'bookname', 'book', 'title', '教材名', '教材'],
        number: ['単語番号', '番号', 'no', 'number', 'id', 'num', 'index'],
        word: ['単語', 'word', 'phrase', 'term', 'english', 'en', 'expression'],
        def: ['日本語訳', '日本語', '意味', 'meaning', 'definition', 'def', 'ja', 'translation']
    };

    const findAndRemoveKey = (matchList: string[]) => {
        let found = availableKeys.find(k => matchList.some(c => cleanKey(k) === c));
        if (!found) found = availableKeys.find(k => matchList.some(c => cleanKey(k).includes(c)));
        if (found) availableKeys = availableKeys.filter(k => k !== found);
        return found;
    };

    const bookKey = findAndRemoveKey(candidates.book);
    const numberKey = findAndRemoveKey(candidates.number);
    const wordKey = findAndRemoveKey(candidates.word);
    const defKey = findAndRemoveKey(candidates.def);
    
    const getCol = (row: any, key: string | undefined, colIndex: number) => {
        if (key && row[key] !== undefined) return row[key];
        if (!key && `_col${colIndex}` in row) return row[`_col${colIndex}`];
        return '';
    };

    const bookGroups = new Map<string, any[]>();
    
    csvRows.forEach((row) => {
        const rawBookName = getCol(row, bookKey, 0); 
        const finalBookTitle = (rawBookName && typeof rawBookName === 'string' && rawBookName.trim() !== '') 
            ? rawBookName.trim() 
            : defaultBookName;
        if (!bookGroups.has(finalBookTitle)) bookGroups.set(finalBookTitle, []);
        bookGroups.get(finalBookTitle)?.push(row);
    });

    const totalRows = csvRows.length;
    let processedGlobalCount = 0;
    const CHUNK_SIZE = 50; 

    for (const [bookTitle, rows] of bookGroups) {
        let bookId = bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (createdByUid) {
            bookId = `${createdByUid.slice(0,8)}-${Date.now()}`; 
        } else if (bookId.length < 2 || bookId === 'csv') {
            const hash = Array.from(bookTitle).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
            bookId = `book-${Math.abs(hash)}`;
        }

        const descriptionObj = createdByUid 
            ? { createdBy: createdByUid, type: 'USER_GENERATED', context: contextSummary }
            : { type: 'IMPORTED', context: contextSummary };
            
        const description = JSON.stringify(descriptionObj);

        const { error: bookError } = await this.client.from('books').upsert({
            id: bookId,
            title: bookTitle,
            word_count: rows.length,
            is_priority: !createdByUid && (bookTitle.includes("重要") || bookTitle.includes("DUO") || bookTitle.includes("Priority")),
            description: description,
            source_context: contextSummary
        });

        if (bookError) {
             if (bookError.message.includes('source_context')) {
                 console.warn("Missing source_context column, trying without it.");
                 await this.client.from('books').upsert({
                    id: bookId,
                    title: bookTitle,
                    word_count: rows.length,
                    is_priority: !createdByUid && (bookTitle.includes("重要") || bookTitle.includes("DUO") || bookTitle.includes("Priority")),
                    description: description
                });
             } else {
                 this.handleSupabaseError(bookError, `Book Creation (${bookTitle})`);
             }
        }

        const formattedWords: any[] = [];
        rows.forEach((row, idx) => {
            const rawNum = getCol(row, numberKey, 1); 
            const wordText = getCol(row, wordKey, 2); 
            const defText = getCol(row, defKey, 3);   

            if (!wordText || !defText) return;
            const w = String(wordText).trim();
            const d = String(defText).trim();

            if (!w || !d) return;
            if (w.toLowerCase() === 'word' || w === '単語' || w === bookTitle) return;
            if (wordKey && w === wordKey) return;

            formattedWords.push({
                id: `${bookId}_${rawNum}_${idx}_${Date.now()}`, 
                book_id: bookId,
                number: parseInt(rawNum) || (idx + 1),
                word: w,
                definition: d,
                search_key: w.toLowerCase()
            });
        });

        for (let i = 0; i < formattedWords.length; i += CHUNK_SIZE) {
            const chunk = formattedWords.slice(i, i + CHUNK_SIZE);
            const { error } = await this.client.from('words').upsert(chunk);
            if (error) this.handleSupabaseError(error, 'Words Import Chunk');
            
            processedGlobalCount += chunk.length;
            onProgress(Math.min(100, (processedGlobalCount / totalRows) * 100));
        }
    }
    onProgress(100);
  }

  async getBooks(): Promise<BookMetadata[]> {
    const { data } = await this.client.from('books').select('*');
    if (!data) return [];
    
    return data.map((b: any) => ({
        id: b.id,
        title: b.title,
        wordCount: b.word_count,
        isPriority: b.is_priority,
        description: b.description,
        sourceContext: b.source_context
    }));
  }
  
  async deleteBook(bookId: string): Promise<void> {
      await this.client.from('study_history').delete().eq('book_id', bookId);
      await this.client.from('words').delete().eq('book_id', bookId);
      const { error } = await this.client.from('books').delete().eq('id', bookId);
      
      if (error) this.handleSupabaseError(error, `Delete Book (${bookId})`);
  }

  async getWordsByBook(bookId: string): Promise<WordData[]> {
    const { data } = await this.client
        .from('words')
        .select('*')
        .eq('book_id', bookId)
        .order('number', { ascending: true });
        
    return (data || []).map(this.mapWord);
  }
  
  async updateWord(word: WordData): Promise<void> {
    const { error } = await this.client.from('words').update({
        word: word.word,
        definition: word.definition
    }).eq('id', word.id);
    
    if (error) this.handleSupabaseError(error, 'Update Word');
  }

  async updateWordCache(wordId: string, sentence: string, translation: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('words')
        .update({ 
          example_sentence: sentence,
          example_meaning: translation
        })
        .eq('id', wordId);
      
      if (error) console.warn("Failed to cache AI content:", error.message);
    } catch (e) {
      console.warn("Failed to cache AI content", e);
    }
  }

  // --- LEARNING LOGIC ---
  
  async getDailySessionWords(uid: string, limit: number): Promise<WordData[]> {
    const now = Date.now();
    const { data: dueData } = await this.client
        .from('study_history')
        .select('word_id')
        .eq('user_id', uid)
        .lte('next_review_date', now)
        .neq('status', 'graduated')
        .limit(limit);
    
    const dueIds = dueData?.map((d: any) => d.word_id) || [];
    let words: WordData[] = [];
    
    if (dueIds.length > 0) {
        const { data } = await this.client.from('words').select('*').in('id', dueIds);
        if (data) words = data.map(this.mapWord);
    }

    if (words.length < limit) {
        const { data: allPotentialNew } = await this.client
            .from('words')
            .select('*')
            .limit(50);

        if (allPotentialNew) {
             const potentialIds = allPotentialNew.map((w:any) => w.id);
             const { data: studiedHistory } = await this.client
                 .from('study_history')
                 .select('word_id')
                 .eq('user_id', uid)
                 .in('word_id', potentialIds);
             
             const studiedSet = new Set(studiedHistory?.map((h:any) => h.word_id));
             
             for (const w of allPotentialNew) {
                 if (!studiedSet.has(w.id)) {
                     words.push(this.mapWord(w));
                     if (words.length >= limit) break;
                 }
             }
        }
    }
    return words;
  }

  async getBookSession(uid: string, bookId: string, limit: number): Promise<WordData[]> {
    const now = Date.now();

    const { data: history } = await this.client
        .from('study_history')
        .select('*')
        .eq('user_id', uid)
        .eq('book_id', bookId);
    
    const historyMap = new Map();
    const graduatedIds = new Set();
    
    if (history) {
        history.forEach((h: any) => {
            historyMap.set(h.word_id, h);
            if (h.status === 'graduated') graduatedIds.add(h.word_id);
        });
    }

    const allWords = await this.getWordsByBook(bookId);
    
    const dueWords: WordData[] = [];
    const newWords: WordData[] = [];
    const reviewAheadWords: WordData[] = [];

    for (const word of allWords) {
        if (graduatedIds.has(word.id)) continue;

        const h = historyMap.get(word.id);
        if (!h) {
            newWords.push(word);
        } else {
            if (h.next_review_date <= now) {
                dueWords.push(word);
            } else {
                reviewAheadWords.push(word);
            }
        }
    }

    let session = [...dueWords];
    
    if (session.length < limit) {
        const needed = limit - session.length;
        session = [...session, ...newWords.slice(0, needed)];
    }
    
    if (session.length < limit) {
        const needed = limit - session.length;
        reviewAheadWords.sort((a, b) => {
            const hA = historyMap.get(a.id);
            const hB = historyMap.get(b.id);
            return hA.next_review_date - hB.next_review_date;
        });
        session = [...session, ...reviewAheadWords.slice(0, needed)];
    }

    return session;
  }

  async getDueCount(uid: string): Promise<number> {
    const { count } = await this.client
        .from('study_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .lte('next_review_date', Date.now())
        .neq('status', 'graduated');
    return count || 0;
  }

  async saveSRSHistory(uid: string, word: WordData, rating: number): Promise<void> {
    const { data: existing } = await this.client
        .from('study_history')
        .select('*')
        .eq('user_id', uid)
        .eq('word_id', word.id)
        .single();

    let interval = existing?.interval || 0;
    let ease = existing?.ease_factor || 2.5;
    let attemptCount = (existing?.attempt_count || 0) + 1;
    let correctCount = (existing?.correct_count || 0) + (rating >= 2 ? 1 : 0);

    if (rating === 0) {
        interval = 0;
        ease = Math.max(1.3, ease - 0.2);
    } else {
        if (rating === 1) interval = 1;
        else if (rating === 2) interval = interval === 0 ? 1 : Math.ceil(interval * ease);
        else if (rating === 3) {
            interval = interval === 0 ? 3 : Math.ceil(interval * ease * 1.3);
            ease += 0.15;
        }
        if (interval > 365) interval = 365;
    }
    
    const nextReview = Date.now() + (interval * 86400000);

    const payload = {
        user_id: uid,
        word_id: word.id,
        book_id: word.bookId,
        status: interval > 20 ? 'graduated' : 'learning',
        last_studied_at: Date.now(),
        next_review_date: nextReview,
        interval,
        ease_factor: ease,
        correct_count: correctCount,
        attempt_count: attemptCount,
    };

    const { error } = await this.client.from('study_history').upsert(payload, { onConflict: 'user_id,word_id' });
    if (error) this.handleSupabaseError(error, 'Save SRS History');
  }

  async saveHistory(uid: string, result: Partial<LearningHistory> & { wordId: string; bookId: string; }): Promise<void> {
     const { data: existing } = await this.client
        .from('study_history')
        .select('*')
        .eq('user_id', uid)
        .eq('word_id', result.wordId)
        .single();

     const currentAttempts = existing?.attempt_count || 0;
     const currentCorrect = existing?.correct_count || 0;

     const { error } = await this.client.from('study_history').upsert({
        user_id: uid,
        word_id: result.wordId,
        book_id: result.bookId,
        status: result.status || existing?.status || 'learning',
        last_studied_at: Date.now(),
        next_review_date: existing?.next_review_date || Date.now(),
        interval: existing?.interval || 0,
        ease_factor: existing?.ease_factor || 2.5,
        attempt_count: currentAttempts + (result.attemptCount || 1),
        correct_count: currentCorrect + (result.correctCount || 0)
     }, { onConflict: 'user_id,word_id' });
     
     if (error) this.handleSupabaseError(error, 'Save History');
  }

  async getBookProgress(uid: string, bookId: string): Promise<BookProgress> {
    const { count: total } = await this.client.from('words').select('*', { count: 'exact', head: true }).eq('book_id', bookId);
    
    const { count: learned } = await this.client
        .from('study_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('book_id', bookId)
        .or('interval.gt.0,attempt_count.gt.0'); // Count any attempted word as progress
        
    return {
        bookId,
        totalCount: total || 0,
        learnedCount: learned || 0,
        percentage: total ? Math.round(((learned || 0) / total) * 100) : 0
    };
  }

  async getAllStudentsProgress(): Promise<StudentSummary[]> {
    const { data: profiles, error } = await this.client.from('profiles').select('*').eq('role', 'STUDENT');
    if (error || !profiles) return [];

    const summaries: StudentSummary[] = [];
    for (const p of profiles) {
        const { data: history } = await this.client
            .from('study_history')
            .select('last_studied_at, interval, attempt_count')
            .eq('user_id', p.id);

        const totalLearned = history?.filter((h: any) => h.interval > 3).length || 0;
        const totalAttempts = history?.reduce((acc: number, h: any) => acc + h.attempt_count, 0) || 0;
        const lastActive = history?.reduce((max: number, h: any) => Math.max(max, h.last_studied_at || 0), 0) || 0;

        const now = Date.now();
        const daysSinceActive = lastActive === 0 ? 999 : (now - lastActive) / (1000 * 60 * 60 * 24);
        
        let risk = StudentRiskLevel.SAFE;
        if (daysSinceActive > 3) risk = StudentRiskLevel.DANGER;
        else if (daysSinceActive > 1.5) risk = StudentRiskLevel.WARNING;
        
        // Simple Accuracy Calc
        const correctSum = history?.reduce((acc: number, h: any) => acc + (h.correct_count || 0), 0) || 0;
        const accuracy = totalAttempts > 0 ? correctSum / totalAttempts : 0;

        summaries.push({
            uid: p.id,
            name: p.display_name || 'Unknown',
            email: p.email || '',
            totalLearned,
            totalAttempts,
            lastActive,
            riskLevel: risk,
            accuracy
        });
    }
    return summaries;
  }

  async resetAllData(): Promise<void> {
     console.warn("Reset is disabled in production/cloud mode for security.");
  }
  
  private mapWord(w: any): WordData {
      return {
        id: w.id,
        bookId: w.book_id,
        number: w.number,
        word: w.word,
        definition: w.definition,
        searchKey: w.search_key,
        exampleSentence: w.example_sentence,
        exampleMeaning: w.example_meaning
      };
  }

  async reportWord(wordId: string, reason: string): Promise<void> {
      try {
          const { error } = await this.client.from('words').update({ 
              is_reported: true
          }).eq('id', wordId);
          
          if (error) {
              if (error.code === '42703' || error.message?.includes('is_reported')) {
                  console.warn("Skipping report: 'is_reported' column missing in DB.");
                  return;
              }
              console.warn("Report Word Error (Supabase):", error.message);
          }
      } catch (e) {
          console.error("Report Word Exception:", e);
      }
  }

  async saveLearningPlan(plan: LearningPlan): Promise<void> {
      try {
          const { error } = await this.client.from('learning_plans').upsert({
            user_id: plan.uid,
            created_at: new Date(plan.createdAt).toISOString(),
            target_date: plan.targetDate,
            goal_description: plan.goalDescription,
            daily_word_goal: plan.dailyWordGoal,
            selected_book_ids: plan.selectedBookIds,
            status: plan.status
          }, { onConflict: 'user_id' });

          if (error) throw error;

      } catch (error: any) {
          if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('learning_plans')) {
            console.warn("Table 'learning_plans' missing. Falling back to localStorage.");
            localStorage.setItem(`plan_${plan.uid}`, JSON.stringify(plan));
            return;
          }
          this.handleSupabaseError(error, 'Save Learning Plan');
      }
  }

  async getLearningPlan(uid: string): Promise<LearningPlan | null> {
      try {
          const { data, error } = await this.client
            .from('learning_plans')
            .select('*')
            .eq('user_id', uid)
            .maybeSingle();

          if (error) throw error;
          
          if (!data) {
              const local = localStorage.getItem(`plan_${uid}`);
              return local ? JSON.parse(local) : null;
          }

          return {
            uid: data.user_id,
            createdAt: new Date(data.created_at).getTime(),
            targetDate: data.target_date,
            goalDescription: data.goal_description,
            dailyWordGoal: data.daily_word_goal,
            selectedBookIds: data.selected_book_ids,
            status: data.status
          };

      } catch (error: any) {
          if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('learning_plans')) {
             const local = localStorage.getItem(`plan_${uid}`);
             return local ? JSON.parse(local) : null;
          }
          console.warn("Failed to fetch learning plan from DB:", error.message);
          return null;
      }
  }

  // --- ANALYTICS ---
  async getLeaderboard(currentUid: string): Promise<LeaderboardEntry[]> {
      try {
          const { data: profiles, error } = await this.client
              .from('profiles')
              .select('id, display_name, stats')
              .eq('role', 'STUDENT')
              .order('stats->xp', { ascending: false } as any) 
              .limit(10);

          if (error) throw error;
          if (!profiles) return [];

          const leaderboard: LeaderboardEntry[] = profiles.map((p: any, index: number) => ({
              uid: p.id,
              displayName: p.display_name || 'Unknown',
              xp: p.stats?.xp || 0,
              level: p.stats?.level || 1,
              rank: index + 1,
              isCurrentUser: p.id === currentUid
          }));

          // If current user is not in top 10, append them at the end (simplified)
          const inTop10 = leaderboard.find(e => e.uid === currentUid);
          if (!inTop10) {
               const { data: me } = await this.client.from('profiles').select('id, display_name, stats').eq('id', currentUid).single();
               if (me) {
                   leaderboard.push({
                       uid: me.id,
                       displayName: me.display_name,
                       xp: me.stats?.xp || 0,
                       level: me.stats?.level || 1,
                       rank: 999,
                       isCurrentUser: true
                   });
               }
          }
          
          // Sort again just in case
          return leaderboard.sort((a,b) => b.xp - a.xp);
          
      } catch (e) {
          console.error("Fetch Leaderboard Error", e);
          return [];
      }
  }

  async getMasteryDistribution(uid: string): Promise<MasteryDistribution> {
      try {
          const { data, error } = await this.client
              .from('study_history')
              .select('status, interval')
              .eq('user_id', uid);
              
          if (error) throw error;

          const dist = { new: 0, learning: 0, review: 0, graduated: 0, total: 0 };
          
          data?.forEach((h: any) => {
             if (h.status === 'graduated') dist.graduated++;
             else if (h.status === 'learning' && h.interval > 3) dist.review++;
             else dist.learning++;
             dist.total++;
          });
          
          return dist;

      } catch (e) {
          console.error("Fetch Mastery Error", e);
          return { new: 0, learning: 0, review: 0, graduated: 0, total: 0 };
      }
  }

  async getActivityLogs(uid: string): Promise<ActivityLog[]> {
      try {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          const { data, error } = await this.client
              .from('study_history')
              .select('last_studied_at')
              .eq('user_id', uid)
              .gte('last_studied_at', oneYearAgo.getTime());
          
          if (error) throw error;

          const counts: Record<string, number> = {};
          data?.forEach((row: any) => {
              const date = new Date(row.last_studied_at).toISOString().split('T')[0];
              counts[date] = (counts[date] || 0) + 1;
          });

          return Object.keys(counts).map(date => {
              const count = counts[date];
              let intensity: any = 0;
              if (count > 0) intensity = 1;
              if (count > 5) intensity = 2;
              if (count > 15) intensity = 3;
              if (count > 30) intensity = 4;
              return { date, count, intensity };
          });
      } catch (e) {
          console.error("Fetch Activity Log Error", e);
          return [];
      }
  }
}
