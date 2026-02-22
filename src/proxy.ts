import { type NextRequest, NextResponse } from 'next/server';

function normalizeOrigin(u: string) {
  return u.trim().replace(/\/+$/g, ''); // remove trailing slashes
}

const envList = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set(
  [
    'http://localhost:5173', // Vite dev frontend
    'http://localhost:3000', // Next.js dev
    'https://new-aegis-backend.vercel.app', // Next.js itself
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
    ...envList,
  ]
    .filter((x): x is string => Boolean(x))
    .map(normalizeOrigin),
);

const CORS_HEADERS = {
  'Access-Control-Allow-Methods':  'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':  'Content-Type,Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export function proxy(req: NextRequest) {
  const origin = (req.headers.get('origin') ?? '').trim();
  const normOrigin = origin.replace(/\/+$/g, '')
  const isAllowed = origin ? ALLOWED_ORIGINS.has(normOrigin) : false;

  // Handle preflight (OPTIONS) — must respond 200/204 immediately
  if (req.method === 'OPTIONS') {
    const headers: Record<string, string> = { ...CORS_HEADERS };
    if (isAllowed) headers['Access-Control-Allow-Origin'] = origin;
    else console.warn(`[CORS] Origin not allowed: ${origin}. Allowed: ${[...ALLOWED_ORIGINS].join(', ')}`);

    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }

  // Pass through and attach CORS headers to the real response
  const response = NextResponse.next();
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  } else if (origin) {
    // Helpful log for debugging when calls come from unexpected origins
    console.warn(`[CORS] Blocking origin: ${origin}. Allowed origins: ${[...ALLOWED_ORIGINS].join(', ')}`);
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
