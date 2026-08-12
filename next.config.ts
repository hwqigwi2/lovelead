import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Аватарки пользователей приходят только с Telegram CDN.
const imageRemotePatterns = [
  { protocol: "https" as const, hostname: "t.me" },
  { protocol: "https" as const, hostname: "**.t.me" },
  // Telegram photo_url ведёт на CDN вида cdn4.telesco.pe — добавляем.
  { protocol: "https" as const, hostname: "cdn4.telesco.pe" },
  { protocol: "https" as const, hostname: "**.telesco.pe" },
];

// Mini App открывается внутри webview/iframe Telegram, поэтому
// frame-ancestors ограничиваем доменами Telegram, а не 'none'.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://telegram.org https://*.telegram.org",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://t.me https://*.t.me https://cdn4.telesco.pe https://*.telesco.pe",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors https://web.telegram.org https://*.telegram.org https://t.me",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  images: { remotePatterns: imageRemotePatterns },
  poweredByHeader: false,
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
