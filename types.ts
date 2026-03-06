
export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN'
}

export enum OrganizationRole {
  GROUP_ADMIN = 'GROUP_ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT'
}

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  [OrganizationRole.GROUP_ADMIN]: 'グループ管理者',
  [OrganizationRole.INSTRUCTOR]: 'グループ講師',
  [OrganizationRole.STUDENT]: 'グループ生徒',
};

export enum UserGrade {
  JHS1 = 'JHS1',
  JHS2 = 'JHS2',
  JHS3 = 'JHS3',
  SHS1 = 'SHS1',
  SHS2 = 'SHS2',
  SHS3 = 'SHS3',
  UNIVERSITY = 'UNIV',
  ADULT = 'ADULT'
}

// 日本語表記用マッピング（より自然な表現に統一）
export const GRADE_LABELS: Record<UserGrade, string> = {
  [UserGrade.JHS1]: '中学1年生',
  [UserGrade.JHS2]: '中学2年生',
  [UserGrade.JHS3]: '中学3年生',
  [UserGrade.SHS1]: '高校1年生',
  [UserGrade.SHS2]: '高校2年生',
  [UserGrade.SHS3]: '高校3年生',
  [UserGrade.UNIVERSITY]: '大学生',
  [UserGrade.ADULT]: '社会人',
};

// ステータスラベルの日本語化
export const STATUS_LABELS: Record<string, string> = {
  new: '未学習',
  learning: '習得中', // "学習中" よりプロセス感がある表現へ
  review: '復習期',
  graduated: '定着済' // "習得済" より完了感が強い表現へ
};

export enum EnglishLevel {
  A1 = 'A1', // Beginner
  A2 = 'A2', // Elementary
  B1 = 'B1', // Intermediate
  B2 = 'B2', // Upper Intermediate
  C1 = 'C1', // Advanced
  C2 = 'C2'  // Proficient
}

export enum SubscriptionPlan {
  TOC_FREE = 'TOC_FREE',
  TOC_PAID = 'TOC_PAID',
  TOB_FREE = 'TOB_FREE',
  TOB_PAID = 'TOB_PAID'
}

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.TOC_FREE]: 'フリープラン',
  [SubscriptionPlan.TOC_PAID]: 'パーソナルプラン',
  [SubscriptionPlan.TOB_FREE]: 'ビジネスフリープラン',
  [SubscriptionPlan.TOB_PAID]: 'ビジネスプラン',
};

export interface UserStats {
  xp: number;
  level: number;
  currentStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
}

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  organizationRole?: OrganizationRole;
  email: string;
  stats?: UserStats;
  grade?: UserGrade;
  englishLevel?: EnglishLevel;
  needsOnboarding?: boolean;
  subscriptionPlan?: SubscriptionPlan;
  organizationName?: string;
}

export interface WordData {
  id: string;
  bookId: string;
  number: number;
  word: string;
  definition: string;
  searchKey?: string;
  exampleSentence?: string | null;
  exampleMeaning?: string | null;
  isReported?: boolean;
}

export interface BookMetadata {
  id: string;
  title: string;
  wordCount: number;
  isPriority: boolean;
  description?: string;
  sourceContext?: string;
}

export interface LearningHistory {
  wordId: string;
  bookId: string;
  status: 'new' | 'learning' | 'review' | 'graduated';
  lastStudiedAt: number;
  nextReviewDate: number;
  interval: number;
  easeFactor: number;
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

export enum StudentRiskLevel {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  DANGER = 'DANGER'
}

export interface StudentSummary {
  uid: string;
  name: string;
  email: string;
  totalLearned: number;
  totalAttempts: number;
  lastActive: number;
  riskLevel: StudentRiskLevel;
  accuracy?: number;
  lastLoginDate?: number;
  subscriptionPlan?: SubscriptionPlan;
  organizationName?: string;
  lastNotificationAt?: number;
  lastNotificationMessage?: string;
}

export interface LearningPlan {
  uid: string;
  createdAt: number;
  targetDate: string; // YYYY-MM-DD
  goalDescription: string;
  dailyWordGoal: number;
  selectedBookIds: string[]; // The curriculum subset
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  xp: number;
  level: number;
  rank: number;
  isCurrentUser: boolean;
}

export interface MasteryDistribution {
  new: number;       // Not started
  learning: number;  // Interval <= 3
  review: number;    // Interval > 3 and <= 20
  graduated: number; // Interval > 20
  total: number;
}

export interface ActivityLog {
  date: string; // YYYY-MM-DD
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface InstructorNotification {
  id: number;
  studentUid: string;
  studentName: string;
  instructorUid: string;
  instructorName: string;
  message: string;
  triggerReason: string;
  deliveryChannel: 'IN_APP';
  usedAi: boolean;
  createdAt: number;
}

export interface AiUsageSummary {
  monthKey: string;
  estimatedCostMilliYen: number;
  budgetMilliYen: number;
  remainingMilliYen: number;
  actionCounts: Record<string, number>;
}

export interface AccountOverview {
  subscriptionPlan: SubscriptionPlan;
  organizationRole?: OrganizationRole;
  organizationName?: string;
  priceLabel: string;
  audienceLabel: string;
  featureSummary: string[];
  aiUsage: AiUsageSummary;
}

export interface DashboardSnapshot {
  dueCount: number;
  officialBooks: BookMetadata[];
  myBooks: BookMetadata[];
  progressMap: Record<string, BookProgress>;
  learningPlan: LearningPlan | null;
  leaderboard: LeaderboardEntry[];
  masteryDist: MasteryDistribution;
  activityLogs: ActivityLog[];
  coachNotifications: InstructorNotification[];
  accountOverview: AccountOverview;
}

export interface AdminOverviewStats {
  totalStudents: number;
  activeToday: number;
  active7d: number;
  atRiskCount: number;
  studentsWithPlan: number;
  averageLearnedWords: number;
  averageAccuracyRate: number;
  officialBookCount: number;
  customBookCount: number;
  totalWordCount: number;
  reportedWordCount: number;
  notifications7d: number;
  aiRequestsThisMonth: number;
  aiCostThisMonthMilliYen: number;
}

export interface AdminPlanBreakdownItem {
  plan: SubscriptionPlan;
  count: number;
}

export interface AdminRiskBreakdownItem {
  riskLevel: StudentRiskLevel;
  count: number;
}

export interface AdminTrendPoint {
  date: string;
  activeStudents: number;
  studiedWords: number;
  notifications: number;
  newStudents: number;
}

export interface AdminBookInsight {
  bookId: string;
  title: string;
  wordCount: number;
  learnerCount: number;
  learnedEntries: number;
  averageProgress: number;
  isOfficial: boolean;
}

export interface AdminAiActionSummary {
  action: string;
  label: string;
  requestCount: number;
  estimatedCostMilliYen: number;
}

export interface AdminWordReportSummary {
  id: number;
  wordId: string;
  word: string;
  bookTitle: string;
  reporterName: string;
  reason: string;
  createdAt: number;
}

export interface AdminOrganizationInsight {
  organizationName: string;
  studentCount: number;
  active7dCount: number;
  paidCount: number;
  averageLearnedWords: number;
}

export interface OrganizationInstructorSummary {
  uid: string;
  displayName: string;
  email: string;
  organizationRole?: OrganizationRole;
  notifiedStudentCount: number;
  notifications7d: number;
}

export interface OrganizationDashboardSnapshot {
  organizationName: string;
  subscriptionPlan: SubscriptionPlan;
  totalMembers: number;
  totalStudents: number;
  totalInstructors: number;
  activeStudents7d: number;
  atRiskStudents: number;
  learningPlanCount: number;
  notifications7d: number;
  instructors: OrganizationInstructorSummary[];
  atRiskStudentList: StudentSummary[];
}

export type WorksheetQuestionMode = 'EN_TO_JA' | 'JA_TO_EN' | 'SPELLING_HINT';

export interface StudentWorksheetWord {
  wordId: string;
  bookId: string;
  bookTitle: string;
  word: string;
  definition: string;
  status: LearningHistory['status'];
  lastStudiedAt: number;
  attemptCount: number;
  correctCount: number;
}

export interface StudentWorksheetSnapshot {
  studentUid: string;
  studentName: string;
  organizationName?: string;
  words: StudentWorksheetWord[];
}

export interface AdminDashboardSnapshot {
  overview: AdminOverviewStats;
  planBreakdown: AdminPlanBreakdownItem[];
  riskBreakdown: AdminRiskBreakdownItem[];
  trend: AdminTrendPoint[];
  topBooks: AdminBookInsight[];
  aiActions: AdminAiActionSummary[];
  recentNotifications: InstructorNotification[];
  recentReports: AdminWordReportSummary[];
  organizations: AdminOrganizationInsight[];
  atRiskStudents: StudentSummary[];
}
