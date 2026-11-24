import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Outbound-request guard for URLs that come from users.
 *
 * The only such URL today is the accommodation channel iCal feed. Without a
 * guard, an authenticated user could make the API fetch
 * `http://169.254.169.254/latest/meta-data/` or an internal service
 * (`http://db:5432`, `http://minio:9000`) and read the response back through
 * the calendar import. `assertPublicHttpUrl` rejects non-http(s) schemes,
 * credentials in the URL, non-standard ports and any host that resolves to a
 * private/loopback/link-local address.
 *
 * `safeFetch` additionally follows redirects manually and re-validates every
 * hop, so a public URL cannot bounce the server into an internal address.
 *
 * Residual risk: DNS rebinding between the lookup and the connection. Pinning
 * the resolved IP would require a custom dispatcher; the redirect and private-
 * range checks already remove the practical attack surface for this feature.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa'];

const PRIVATE_V4_RANGES: Array<[string, string]> = [
  ['0.0.0.0', '0.255.255.255'],
  ['10.0.0.0', '10.255.255.255'],
  ['100.64.0.0', '100.127.255.255'],
  ['127.0.0.0', '127.255.255.255'],
  ['169.254.0.0', '169.254.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.0.0.0', '192.0.2.255'],
  ['192.168.0.0', '192.168.255.255'],
  ['198.18.0.0', '198.19.255.255'],
  ['224.0.0.0', '239.255.255.255'],
  ['240.0.0.0', '255.255.255.255'],
];

function ipv4ToInt(value: string): number {
  return value
    .split('.')
    .reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isPrivateIpv4(value: string): boolean {
  const numeric = ipv4ToInt(value);
  return PRIVATE_V4_RANGES.some(([from, to]) => {
    const start = ipv4ToInt(from);
    const end = ipv4ToInt(to);
    return numeric >= start && numeric <= end;
  });
}

function isPrivateIpv6(value: string): boolean {
  const address = value.toLowerCase();
  if (address === '::' || address === '::1') return true;
  if (/^f[cd]/.test(address)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(address)) return true; // link-local fe80::/10
  if (/^ff/.test(address)) return true; // multicast
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

function isPrivateAddress(value: string): boolean {
  const kind = isIP(value);
  if (kind === 4) return isPrivateIpv4(value);
  if (kind === 6) return isPrivateIpv6(value);
  return true;
}

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestException('آدرس باید یک URL معتبر http یا https باشد');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('فقط آدرس‌های http و https مجاز هستند');
  }
  if (url.username || url.password) {
    throw new BadRequestException('آدرس نباید نام‌کاربری یا رمز داشته باشد');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new BadRequestException('پورت آدرس باید 80 یا 443 باشد');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw new BadRequestException('آدرس به یک میزبان داخلی اشاره می‌کند');
  }

  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new BadRequestException('آدرس به یک محدوده‌ی شبکه‌ی خصوصی اشاره می‌کند');
    }
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new BadRequestException('میزبان آدرس قابل resolve نیست');
  }
  if (addresses.length === 0) {
    throw new BadRequestException('میزبان آدرس قابل resolve نیست');
  }
  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new BadRequestException('آدرس به یک محدوده‌ی شبکه‌ی خصوصی اشاره می‌کند');
  }
  return url;
}

/**
 * `fetch` for user-supplied URLs: validates the first hop and every redirect.
 * Redirects are followed manually so a 302 to `http://127.0.0.1` is rejected
 * before the request is made.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<Response> {
  let current = await assertPublicHttpUrl(rawUrl);
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await fetch(current, { ...init, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }
    const location = response.headers.get('location');
    if (!location) return response;
    if (hop === maxRedirects) {
      throw new BadRequestException('تعداد تغییر مسیرهای آدرس بیش از حد مجاز است');
    }
    current = await assertPublicHttpUrl(new URL(location, current).toString());
  }
  throw new BadRequestException('تعداد تغییر مسیرهای آدرس بیش از حد مجاز است');
}
