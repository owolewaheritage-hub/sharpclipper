import { FREE_MONTHLY_CLIP_LIMIT } from '../config/payment';
import { SavedClip, UserAccount } from '../types';

const USERS_KEY = 'sharpclipper_users_v1';
const SESSION_KEY = 'sharpclipper_session_v1';
const GUEST_KEY = 'sharpclipper_guest_v1';
const CLIPS_PREFIX = 'sharpclipper_clips_v1_';

interface StoredUserRecord extends UserAccount {
  passwordHash: string;
}

// Runtime cache for exported video Blobs during active session so downloads are instant
const sessionBlobCache = new Map<string, Blob>();

export function cacheClipBlob(clipId: string, blob: Blob): void {
  sessionBlobCache.set(clipId, blob);
}

export function getCachedClipBlob(clipId: string): Blob | undefined {
  return sessionBlobCache.get(clipId);
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function loadUsers(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUserRecord[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeMonthlyQuota(user: UserAccount): UserAccount {
  const currentMonth = getCurrentMonthKey();
  if (user.freeClipsMonth !== currentMonth) {
    return {
      ...user,
      freeClipsUsed: 0,
      freeClipsMonth: currentMonth,
    };
  }
  return user;
}

export function getOrCreateGuestAccount(): UserAccount {
  const currentMonth = getCurrentMonthKey();
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      const parsed = normalizeMonthlyQuota(JSON.parse(raw) as UserAccount);
      localStorage.setItem(GUEST_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch {
    // ignore parse errors
  }

  const guest: UserAccount = {
    id: 'guest',
    email: 'guest@sharpclipper.local',
    name: 'Guest Creator',
    plan: 'free',
    freeClipsUsed: 0,
    freeClipsMonth: currentMonth,
    singleClipCredits: 0,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
  return guest;
}

export function getActiveAccount(): { account: UserAccount; isAuthenticated: boolean } {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (sessionId) {
    const users = loadUsers();
    const found = users.find((u) => u.id === sessionId);
    if (found) {
      const normalized = normalizeMonthlyQuota({
        id: found.id,
        email: found.email,
        name: found.name,
        plan: found.plan,
        freeClipsUsed: found.freeClipsUsed,
        freeClipsMonth: found.freeClipsMonth,
        singleClipCredits: found.singleClipCredits || 0,
        proActivatedAt: found.proActivatedAt,
        createdAt: found.createdAt,
      });
      if (normalized.freeClipsMonth !== found.freeClipsMonth) {
        updateAccount(normalized, true);
      }
      return { account: normalized, isAuthenticated: true };
    }
  }
  return { account: getOrCreateGuestAccount(), isAuthenticated: false };
}

export function updateAccount(updated: UserAccount, isAuthenticated: boolean): UserAccount {
  if (!isAuthenticated || updated.id === 'guest') {
    localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
    return updated;
  }
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === updated.id);
  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      ...updated,
    };
    saveUsers(users);
  }
  return updated;
}

export function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): { ok: true; account: UserAccount } | { ok: false; error: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { ok: false, error: 'An account with this email already exists. Sign in instead.' };
  }

  const guest = getOrCreateGuestAccount();
  const displayName = name?.trim() || cleanEmail.split('@')[0];
  const newUser: StoredUserRecord = {
    id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    name: displayName,
    passwordHash: simpleHash(password),
    plan: guest.plan,
    freeClipsUsed: guest.freeClipsUsed,
    freeClipsMonth: getCurrentMonthKey(),
    singleClipCredits: guest.singleClipCredits,
    proActivatedAt: guest.proActivatedAt,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, newUser.id);

  // Migrate any guest clips to the newly created user account so work isn't lost
  const guestClips = loadClipsForAccount('guest');
  if (guestClips.length > 0) {
    saveClipsForAccount(newUser.id, guestClips);
  }

  const { passwordHash: _, ...publicAccount } = newUser;
  return { ok: true, account: publicAccount };
}

export function signInWithEmail(
  email: string,
  password: string
): { ok: true; account: UserAccount } | { ok: false; error: string } {
  const cleanEmail = email.trim().toLowerCase();
  const users = loadUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!found) {
    return { ok: false, error: 'No account found with that email. Create an account first.' };
  }
  if (found.passwordHash !== simpleHash(password)) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }

  localStorage.setItem(SESSION_KEY, found.id);
  const { passwordHash: _, ...publicAccount } = found;
  return { ok: true, account: normalizeMonthlyQuota(publicAccount) };
}

export function signOutAccount(): UserAccount {
  localStorage.removeItem(SESSION_KEY);
  return getOrCreateGuestAccount();
}

export function getRemainingFreeClips(account: UserAccount): number {
  if (account.plan === 'pro') return Infinity;
  return Math.max(0, FREE_MONTHLY_CLIP_LIMIT - account.freeClipsUsed);
}

export function loadClipsForAccount(accountId: string): SavedClip[] {
  try {
    const raw = localStorage.getItem(`${CLIPS_PREFIX}${accountId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClipsForAccount(accountId: string, clips: SavedClip[]): void {
  try {
    localStorage.setItem(`${CLIPS_PREFIX}${accountId}`, JSON.stringify(clips));
  } catch {
    // Handle localStorage quota gracefully by keeping most recent 25 clips
    const trimmed = clips.slice(0, 25);
    localStorage.setItem(`${CLIPS_PREFIX}${accountId}`, JSON.stringify(trimmed));
  }
}

export function addSavedClip(accountId: string, clip: SavedClip): SavedClip[] {
  const existing = loadClipsForAccount(accountId);
  const next = [clip, ...existing];
  saveClipsForAccount(accountId, next);
  return next;
}

export function deleteSavedClip(accountId: string, clipId: string): SavedClip[] {
  const existing = loadClipsForAccount(accountId);
  const next = existing.filter((c) => c.id !== clipId);
  saveClipsForAccount(accountId, next);
  sessionBlobCache.delete(clipId);
  return next;
}
