import type { NextConfig } from "next";

/**
 * Security headers — applied to every route.
 *
 * CSP notes:
 *   - 'unsafe-inline' is required for Next.js inline scripts/styles. Removing it
 *     would require refactoring to nonce-based CSP via a custom server.
 *   - NextAuth OAuth callbacks, Stripe Checkout, and Google Fonts drive most
 *     of the allowlist entries below.
 *   - Tighten after deploying and confirming no console CSP violations.
 */
const ContentSecurityPolicy = [
  "default-src 'self'",
  // Scripts: self + Stripe + Vercel Insights. 'unsafe-inline' and 'unsafe-eval'
  // are needed for Next.js hydration + react-markdown + mermaid. See note above.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com https://cdn.jsdelivr.net",
  // Workers: self (we own /pyodide-worker.js) + blob: (for PGlite, which
  // creates blob workers internally for the WASM Postgres engine).
  "worker-src 'self' blob:",
  // Styles: self + inline (Tailwind/shadcn runtime classes) + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Images: self + data URIs (OG images) + https (avatars from Google/GitHub)
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.stripe.com https://www.gravatar.com",
  // Fonts
  "font-src 'self' data: https://fonts.gstatic.com",
  // Connect: self + Stripe + Pyodide CDN (the worker fetches WASM + stdlib
  // from jsdelivr after the initial pyodide.js loads). Anthropic/OpenAI are
  // proxied server-side so they don't need to be allowlisted here.
  "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://cdn.jsdelivr.net",
  // Frames: Stripe Checkout
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  // Disallow embedding our site in other frames (clickjacking defense)
  "frame-ancestors 'none'",
  // Forms can only post to our own origin
  "form-action 'self'",
  // Disallow plugins
  "object-src 'none'",
  // Upgrade HTTP → HTTPS
  "upgrade-insecure-requests",
  // Base tag can only point to self (prevents <base> injection attacks)
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    // Force HTTPS for 2 years + preload list. Only effective in production.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Redundant with CSP frame-ancestors but kept for older browsers
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Block MIME-sniffing attacks
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Don't leak full URL to third-party origins
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Disable browser features we don't use — protects against supply-chain JS
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=(self \"https://js.stripe.com\")",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  {
    // Legacy but cheap — disabled XSS filter (modern browsers use CSP instead)
    key: "X-XSS-Protection",
    value: "0",
  },
  {
    // Block direct /signin /signup link preview rendering in some previewers
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
];

const nextConfig: NextConfig = {
  // React strict mode surfaces unsafe lifecycles and double-renders issues early.
  reactStrictMode: true,

  // Disable x-powered-by header (tiny info-leak reduction).
  poweredByHeader: false,

  async headers() {
    return [
      {
        // All routes get the baseline security headers.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Protected app content must never be cached by intermediaries or the
        // browser disk cache — prevents "grab from disk cache after logout" and
        // stale-profile attacks on shared machines.
        source:
          "/(dashboard|practice|learn|quiz|plan|progress|mock-interview|settings|onboarding)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, must-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          // Tell search engines and LLM crawlers not to index private content.
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
      {
        // API responses should never be cached anywhere.
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
