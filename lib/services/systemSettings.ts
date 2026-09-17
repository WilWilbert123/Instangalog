import { supabaseAdmin } from '@/lib/supabase/admin';

export interface SystemModerationSettings {
  requireVideoApproval: boolean;
  autoApproveImageStatus: boolean;
  enableChatRateLimit: boolean;
  enableSpamFilter: boolean;
}

export const DEFAULT_SETTINGS: SystemModerationSettings = {
  requireVideoApproval: true,
  autoApproveImageStatus: true,
  enableChatRateLimit: true,
  enableSpamFilter: true,
};

let cachedSettings: SystemModerationSettings = { ...DEFAULT_SETTINGS };
let lastFetchTime = 0;
const CACHE_TTL_MS = 3000; // 3 second in-memory cache for high performance

export async function getSystemSettings(): Promise<SystemModerationSettings> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const { data, error } = await (supabaseAdmin.from('system_settings') as any)
      .select('value')
      .eq('key', 'moderation')
      .maybeSingle();

    if (!error && data?.value) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...data.value };
      lastFetchTime = now;
      return cachedSettings;
    }
  } catch (err) {
    console.warn('[SystemSettings] Error fetching settings from DB:', err);
  }

  return cachedSettings;
}

export async function updateSystemSettings(newSettings: Partial<SystemModerationSettings>): Promise<SystemModerationSettings> {
  const updated = { ...cachedSettings, ...newSettings };
  cachedSettings = updated;
  lastFetchTime = Date.now();

  try {
    const { error } = await (supabaseAdmin.from('system_settings') as any).upsert(
      {
        key: 'moderation',
        value: updated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) {
      console.error('[SystemSettings] DB upsert error:', error.message);
    }
  } catch (err) {
    console.error('[SystemSettings] Error updating settings:', err);
  }

  return updated;
}

// Anti-Spam & Malicious Link Detector
const PHISHING_DOMAINS = [
  'free-followers',
  'bit.ly/malicious',
  'phishing-test',
  'claim-prize-now',
  'crypto-giveaway',
  'get-rich-quick',
  't.me/spamlink',
];

export function scanSpamContent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PHISHING_DOMAINS.some((domain) => lower.includes(domain));
}
