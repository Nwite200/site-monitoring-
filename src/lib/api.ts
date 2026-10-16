/**
 * Helper to dynamically construct backend API URLs.
 * In a standard container or single-server deployment, VITE_API_URL is omitted
 * and relative paths are used. If split-deployed (e.g. Frontend on Netlify/Vercel
 * and Backend on Cloud Run/Render), VITE_API_URL is populated with the backend's URL.
 */
export function getApiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
