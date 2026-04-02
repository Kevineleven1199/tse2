import bcrypt from "bcryptjs";

type AvatarMeta = {
  hash?: string;
  url?: string | null;
};

const parseAvatarMeta = (value?: string | null): AvatarMeta => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as AvatarMeta;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // not JSON, treat as legacy url
    return { url: value };
  }
  return {};
};

const buildAvatarMeta = (hash: string, existing?: string | null) => {
  const current = parseAvatarMeta(existing);
  return JSON.stringify({
    ...current,
    hash
  });
};

export const extractPasswordHash = (avatarUrl?: string | null) => parseAvatarMeta(avatarUrl).hash ?? null;

/**
 * Returns the safe, display-only avatar URL with password hash stripped.
 * MUST be used before sending avatarUrl to any client/API response.
 */
export const safeAvatarUrl = (avatarUrl?: string | null): string | null => {
  if (!avatarUrl) return null;
  const meta = parseAvatarMeta(avatarUrl);
  return meta.url ?? null;
};

export const applyPasswordHash = async (password: string, existing?: string | null) => {
  const hash = await bcrypt.hash(password, 12);
  return buildAvatarMeta(hash, existing);
};

export const verifyPassword = async (password: string, avatarUrl?: string | null) => {
  const hash = extractPasswordHash(avatarUrl);
  if (!hash) return false;
  return bcrypt.compare(password, hash);
};
