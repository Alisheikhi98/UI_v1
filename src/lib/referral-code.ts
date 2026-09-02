export interface ClipboardWriter {
  writeText(value: string): Promise<void>;
}

export function getReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const referralCode = value.trim();
  return referralCode || null;
}

export async function copyReferralCode(
  value: unknown,
  clipboard: ClipboardWriter | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.clipboard,
): Promise<boolean> {
  const referralCode = getReferralCode(value);
  if (!referralCode || !clipboard) return false;

  try {
    await clipboard.writeText(referralCode);
    return true;
  } catch {
    return false;
  }
}
