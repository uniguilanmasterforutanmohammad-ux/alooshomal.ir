import type { NextConfig } from 'next';

/**
 * Hosts the Next image optimiser may fetch from.
 *
 * A wildcard (`hostname: '**'`) turns `/_next/image?url=…` into an open SSRF
 * proxy: anyone could make the server fetch internal addresses such as the
 * cloud metadata endpoint. Uploaded media always lives on the configured
 * MinIO/public media origin, so allow only that plus local development.
 */
function imageRemotePatterns(): Array<{
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
}> {
  const isProd = process.env.NODE_ENV === 'production';
  const patterns: Array<{
    protocol: 'http' | 'https';
    hostname: string;
    port?: string;
  }> = [
    { protocol: 'https', hostname: 'alooshomal.ir' },
    { protocol: 'https', hostname: 'www.alooshomal.ir' },
    { protocol: 'https', hostname: '*.alooshomal.ir' },
  ];
  // Local object storage is only reachable in development; keeping it out of
  // the production bundle avoids widening the allowlist unnecessarily.
  if (!isProd) {
    patterns.push(
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'minio' },
    );
  }
  // `NEXT_PUBLIC_APP_URL` is a build arg, so the public site host is known at
  // build time even when `next.config` is serialised into the standalone build.
  for (const configured of [
    process.env.MINIO_PUBLIC_URL?.trim(),
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
  ]) {
    if (!configured) continue;
    try {
      const url = new URL(configured);
      patterns.push({
        protocol: url.protocol === 'https:' ? 'https' : 'http',
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
      });
    } catch {
      // Ignore a malformed value; the safe defaults above still apply.
    }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: imageRemotePatterns(),
    dangerouslyAllowSVG: false,
    // Next blocks requests that resolve to private IPs as an SSRF guard. Local
    // MinIO runs on such an address in development, so opt out there only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
};

export default nextConfig;
