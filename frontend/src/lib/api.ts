const formatApiUrl = (rawUrl?: string): string => {
  if (!rawUrl || !rawUrl.trim()) return 'http://localhost:8000';
  let cleaned = rawUrl.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};

export const API_BASE_URL = formatApiUrl(import.meta.env.VITE_API_URL);
