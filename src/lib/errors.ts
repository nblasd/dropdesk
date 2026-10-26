// Supabase returns PostgrestError as a plain object, so `error instanceof Error`
// is false and the real reason was replaced by a generic message.
export const errorText = (error: unknown, fallback: string) => {
  const detail = error as { message?: string; details?: string; hint?: string } | null | undefined;
  return detail?.message?.trim() || detail?.details?.trim() || (error instanceof Error && error.message.trim()) || fallback;
};
