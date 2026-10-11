#!/usr/bin/env node
// Reproducible load test for the public directory endpoints.
//
// Runs autocannon against the API with a fixed number of concurrent
// connections and prints a compact per-scenario report (rps, latency, errors).
// Results are also written to test-data/load-test-<label>.json so the "before"
// and "after" runs can be diffed.
//
// Usage:
//   node scripts/load_test.mjs --label before [--connections 500] [--duration 20]
//
// Requires network access to fetch autocannon on first run (npx).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
function flag(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const BASE = flag('base', process.env.LOAD_TEST_BASE ?? 'http://localhost:3001/api');
const CONNECTIONS = Number(flag('connections', '500'));
const DURATION = Number(flag('duration', '20'));
const LABEL = flag('label', 'run');
const PIPELINING = Number(flag('pipelining', '1'));

const SCENARIOS = [
  { name: 'directory-page-1', path: '/biolinks/public?page=1' },
  { name: 'directory-deep-page', path: '/biolinks/public?page=100' },
  { name: 'search-fa', path: '/biolinks/public?q=%D8%B9%D9%84%DB%8C' },
  { name: 'filter-city', path: '/biolinks/public?cityId=' + (process.env.LOAD_TEST_CITY ?? '') },
  { name: 'cards-page-1', path: '/business-cards/public?page=1' },
];

function runAutocannon(url, connections, duration) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        '--yes',
        'autocannon',
        '-c',
        String(connections),
        '-d',
        String(duration),
        '-p',
        String(PIPELINING),
        '-j',
        url,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`autocannon exited ${code}: ${err.slice(0, 400)}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch (error) {
        reject(new Error(`bad autocannon output: ${out.slice(0, 200)}`));
      }
    });
  });
}

function summarize(result) {
  const errors = Object.values(result.errors ?? {}).reduce((a, b) => a + b, 0);
  const non2xx = Object.entries(result.non2xx ?? {})
    .filter(([code]) => code !== '2xx')
    .reduce((a, [, count]) => a + count, 0);
  return {
    requests: result.requests.total,
    rps: Math.round(result.requests.average),
    latencyAvgMs: Number(result.latency.average.toFixed(1)),
    latencyP50Ms: result.latency.p50,
    latencyP99Ms: result.latency.p99,
    throughputMBps: Number((result.throughput.average / 1e6).toFixed(2)),
    errors,
    non2xx,
  };
}

async function main() {
  mkdirSync('test-data', { recursive: true });
  const report = {
    label: LABEL,
    base: BASE,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: PIPELINING,
    startedAt: new Date().toISOString(),
    scenarios: {},
  };

  console.log(`Load test "${LABEL}": ${CONNECTIONS} connections, ${DURATION}s per scenario\n`);
  console.log(
    ['scenario', 'rps', 'avg', 'p50', 'p99', 'non2xx', 'errors'].join('\t'),
  );

  for (const scenario of SCENARIOS) {
    if (scenario.path.endsWith('cityId=')) {
      console.log(`${scenario.name}\tSKIPPED (no cityId)`);
      continue;
    }
    const url = BASE + scenario.path;
    await sleep(2000);
    const raw = await runAutocannon(url, CONNECTIONS, DURATION);
    const summary = summarize(raw);
    report.scenarios[scenario.name] = summary;
    console.log(
      [
        scenario.name,
        summary.rps,
        `${summary.latencyAvgMs}ms`,
        `${summary.latencyP50Ms}ms`,
        `${summary.latencyP99Ms}ms`,
        summary.non2xx,
        summary.errors,
      ].join('\t'),
    );
  }

  report.finishedAt = new Date().toISOString();
  const path = `test-data/load-test-${LABEL}.json`;
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\nSaved ${path}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
