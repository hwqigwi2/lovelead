const REF_PREFIX = "ref_";

// Извлекает реферальный код из текста команды вида "/start ref_XXXX"
// или из уже очищенного параметра "ref_XXXX".
export function parseStartRef(text: string | undefined | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const param = trimmed.startsWith("/start") ? trimmed.slice("/start".length).trim() : trimmed;
  if (!param.startsWith(REF_PREFIX)) return null;
  const code = param.slice(REF_PREFIX.length).trim();
  return code.length > 0 ? code : null;
}

export function buildReferralLink(code: string, botUsername = "Leadslovebot"): string {
  return `https://t.me/${botUsername}?start=ref_${code}`;
}

export function isSelfReferral(ownCode: string | null | undefined, referralCode: string | null): boolean {
  if (!ownCode || !referralCode) return false;
  return ownCode === referralCode;
}

// Нельзя привязывать реферера, если у пользователя уже есть реферер
// или код совпадает с его собственным.
export function canAttributeReferral(user: { referral_code: string | null; referred_by: string | null }, referralCode: string | null): boolean {
  if (!referralCode) return false;
  if (user.referred_by) return false;
  return !isSelfReferral(user.referral_code, referralCode);
}
