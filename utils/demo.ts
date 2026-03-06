import { OrganizationRole, UserRole } from '../types';

export const DEMO_SESSION_HOURS = 48;
export const DEMO_SESSION_TTL_MS = DEMO_SESSION_HOURS * 60 * 60 * 1000;
export const DEMO_RETENTION_TTL_MS = DEMO_SESSION_TTL_MS + 24 * 60 * 60 * 1000;
export const DEMO_EMAIL_DOMAIN = 'medace.app';

const DEMO_EMAIL_PATTERN = /^demo_[^@]+@medace\.app$/i;

export const getDemoAccessWindowLabel = (): string => `${DEMO_SESSION_HOURS}時間`;

export const isDemoEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return DEMO_EMAIL_PATTERN.test(email);
};

export const getDemoKey = (role: UserRole, organizationRole?: OrganizationRole): string => {
  if (role === UserRole.ADMIN) return 'admin';
  if (organizationRole) return organizationRole.toLowerCase();
  return role.toLowerCase();
};

export const buildDemoEmail = (role: UserRole, organizationRole?: OrganizationRole): string => {
  const entropy = `${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  return `demo_${getDemoKey(role, organizationRole)}_${entropy}@${DEMO_EMAIL_DOMAIN}`;
};

export const getDemoDisplayName = (role: UserRole, organizationRole?: OrganizationRole): string => {
  if (role === UserRole.ADMIN) return 'システム管理者 (Demo)';
  if (organizationRole === OrganizationRole.GROUP_ADMIN) return '朝比奈 由奈 (グループ管理者 Demo)';
  if (organizationRole === OrganizationRole.INSTRUCTOR) return 'Oak 先生 (グループ講師 Demo)';
  if (organizationRole === OrganizationRole.STUDENT) return '黒田 颯太 (グループ生徒 Demo)';
  return '鈴木 健太 (フリー Demo)';
};

