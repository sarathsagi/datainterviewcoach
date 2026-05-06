/**
 * seed-practice-test-cases-python-async.ts
 *
 * Backfills `PracticeQuestion.testCases` for the 3 asyncio Python
 * problems seeded by `seed-python-async.ts`:
 *
 *   - async-api-fanout-semaphore
 *   - async-producer-consumer-queue
 *   - async-rate-limited-fetcher
 *
 * Shape conforms to the discriminated-union TestSpec defined in
 * `src/lib/executors/types.ts` (kind: "python" + entrypoint + cases).
 *
 * ── Async-wrapping decision ──────────────────────────────────────────
 * The runner calls the entrypoint **synchronously**, but the user's
 * solutions are `async def` functions. We can't await them from sync
 * code, so each spec uses `setup` to define a sync `run_*` wrapper
 * that calls `asyncio.run(user_async_fn(*args))`. The wrapper also
 * provides any missing dependencies (e.g. fakes for `aiohttp` so the
 * tests don't require network) and converts inputs (e.g. building an
 * async iterator from a list for the producer/consumer test).
 *
 * The user only writes the async solution shown in the prompt; the
 * wrapper bridges sync ↔ async for the runner. Entrypoints below
 * point at the wrappers, not the user's coroutines.
 *
 * Run with:
 *   npx tsx prisma/seed-practice-test-cases-python-async.ts
 *
 * Idempotent: matches by slug, overwrites testCases. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Shared helpers stitched into each `setup` block ─────────────────
//
// Each setup block is prepended to the user's solution before exec,
// so any names defined here are visible inside the user's module.

const PYTHON_ASYNC_TEST_CASES: Record<string, unknown> = {
  // ───────────────────────────────────────────────
  // 32. Bounded Concurrent API Fan-Out
  // ───────────────────────────────────────────────
  //
  // The user's solution uses aiohttp.ClientSession internally — we
  // can't hit the network from the runner, so the setup monkey-patches
  // `fetch_one`'s transport by injecting a fake `aiohttp` module
  // *before* the user's code runs (setup is prepended). The fake
  // returns a body keyed off the URL and raises for sentinel URLs.
  //
  // The wrapper `run_solution(urls, concurrency)` calls
  // asyncio.run(fetch_many(urls, concurrency)), then strips noisy
  // transient fields so the equality check is stable.
  "async-api-fanout-semaphore": {
    kind: "python",
    entrypoint: "run_solution",
    starterCode: `import asyncio
import aiohttp
from typing import Any


async def fetch_many(
    urls: list[str],
    concurrency: int = 50,
    per_call_timeout: float = 10.0,
) -> list[dict[str, Any]]:
    """Fetch every URL concurrently with at most \`concurrency\` in flight.

    Returns results in input order. Per-URL failures must produce a
    sentinel like {"url": url, "error": "..."} instead of raising, so
    one bad URL does not kill the whole batch. Each request should
    have a per-call timeout of \`per_call_timeout\` seconds.
    """
    # TODO: implement using asyncio.Semaphore + asyncio.gather
    pass
`,
    setup: `
import asyncio
import sys
import types

# ── Fake aiohttp so user code can run without network ───────────────
# The user's solution does \`import aiohttp\` and uses ClientSession,
# ClientTimeout, get(...).json(), raise_for_status(). We provide just
# enough surface for that.
_fake_aiohttp = types.ModuleType("aiohttp")

class _ClientTimeout:
    def __init__(self, total=None):
        self.total = total

class _ClientConnectionError(Exception):
    pass

class _Resp:
    def __init__(self, url):
        self._url = url
        # URL convention: "fail://..." → raise; otherwise 200 with body.
        if url.startswith("fail://"):
            self.status = 500
        elif url.startswith("notfound://"):
            self.status = 404
        else:
            self.status = 200

    async def __aenter__(self):
        if self._url.startswith("boom://"):
            raise _ClientConnectionError("connection refused")
        return self

    async def __aexit__(self, *a):
        return False

    def raise_for_status(self):
        if self.status >= 400:
            raise RuntimeError(f"HTTP {self.status}")

    async def json(self):
        return {"url": self._url, "ok": True}

class _Session:
    def __init__(self, *a, **kw):
        pass
    async def __aenter__(self):
        return self
    async def __aexit__(self, *a):
        return False
    def get(self, url, *a, **kw):
        return _Resp(url)

_fake_aiohttp.ClientSession = _Session
_fake_aiohttp.ClientTimeout = _ClientTimeout
_fake_aiohttp.ClientConnectionError = _ClientConnectionError
sys.modules["aiohttp"] = _fake_aiohttp


def _normalize(results):
    """Drop noisy fields so comparisons are stable across solutions."""
    out = []
    for r in results:
        if "body" in r:
            out.append({"url": r["url"], "ok": True})
        else:
            out.append({"url": r["url"], "ok": False})
    return out


def run_solution(urls, concurrency=5):
    # User's solution defines async \`fetch_many\`.
    results = asyncio.run(fetch_many(urls, concurrency=concurrency))
    return _normalize(results)
`,
    cases: [
      {
        name: "all succeed, order preserved",
        args: [["https://a/1", "https://a/2", "https://a/3"], 2],
        expected: [
          { url: "https://a/1", ok: true },
          { url: "https://a/2", ok: true },
          { url: "https://a/3", ok: true },
        ],
      },
      {
        name: "failures produce sentinels, batch survives",
        args: [
          ["https://a/1", "fail://server-error", "boom://network", "https://a/2"],
          2,
        ],
        expected: [
          { url: "https://a/1", ok: true },
          { url: "fail://server-error", ok: false },
          { url: "boom://network", ok: false },
          { url: "https://a/2", ok: true },
        ],
      },
      {
        name: "concurrency=1 still completes all",
        args: [["https://a/x", "https://a/y"], 1],
        expected: [
          { url: "https://a/x", ok: true },
          { url: "https://a/y", ok: true },
        ],
        hidden: true,
      },
    ],
  },

  // ───────────────────────────────────────────────
  // 33. Async Producer/Consumer with Backpressure
  // ───────────────────────────────────────────────
  //
  // The user's `run_pipeline(source, write_fn, num_consumers, queue_size)`
  // takes an *async iterator* and an *async callable*. The test args
  // are JSON-serializable, so the wrapper synthesizes:
  //   - source: an async generator over `range(num_events)`
  //   - write_fn: an async function that fails on indices in `fail_idx`
  // and returns the (produced, consumed, errors) tuple as a list so
  // it survives JSON roundtripping.
  "async-producer-consumer-queue": {
    kind: "python",
    entrypoint: "run_solution",
    starterCode: `import asyncio
import logging
from typing import AsyncIterator, Awaitable, Callable, Any


async def run_pipeline(
    source: AsyncIterator[Any],
    write_fn: Callable[[Any], Awaitable[None]],
    num_consumers: int = 4,
    queue_size: int = 100,
) -> tuple[int, int, int]:
    """Producer reads from \`source\` -> bounded queue -> N consumers call \`write_fn\`.

    - Producer must block when the queue is full (backpressure).
    - One bad event must not kill the pipeline; log and continue.
    - After source is exhausted, drain the queue and shut down cleanly.
    - Return (produced, consumed, errors).
    """
    # TODO: implement using asyncio.Queue(maxsize=queue_size)
    pass
`,
    setup: `
import asyncio

# Provide a no-op logging shim if the user's code imports it; the real
# stdlib logging is fine, but we squelch output so tests are quiet.
import logging
logging.getLogger().setLevel(logging.CRITICAL)


def run_solution(num_events, fail_indices, num_consumers=4, queue_size=10):
    fail_set = set(fail_indices)

    async def _source():
        for i in range(num_events):
            # tiny await to actually exercise the event loop
            await asyncio.sleep(0)
            yield {"id": i}

    async def _write(event):
        await asyncio.sleep(0)
        if event["id"] in fail_set:
            raise RuntimeError(f"boom on {event['id']}")

    async def _go():
        return await run_pipeline(
            _source(), _write,
            num_consumers=num_consumers,
            queue_size=queue_size,
        )

    produced, consumed, errors = asyncio.run(_go())
    # Cast to list — JSON has no tuples, comparison normalizes to list.
    return [produced, consumed, errors]
`,
    cases: [
      {
        name: "happy path, no failures",
        args: [20, [], 4, 5],
        expected: [20, 20, 0],
      },
      {
        name: "transient failures don't kill pipeline",
        args: [10, [2, 5, 8], 2, 4],
        expected: [10, 7, 3],
      },
      {
        name: "single consumer, tiny queue exercises backpressure",
        args: [8, [], 1, 2],
        expected: [8, 8, 0],
        hidden: true,
      },
    ],
  },

  // ───────────────────────────────────────────────
  // 34. Rate-Limited Async Fetcher with Retry
  // ───────────────────────────────────────────────
  //
  // Same aiohttp-fake strategy as #32, plus URL-keyed flake control:
  // a URL like "flake://2/ok" fails twice with 503 then returns 200,
  // so retry-with-backoff is observable. Permanent 404 must NOT retry.
  // The wrapper returns a compact summary instead of full bodies so
  // the test is timing-independent.
  "async-rate-limited-fetcher": {
    kind: "python",
    entrypoint: "run_solution",
    starterCode: `import asyncio
import aiohttp
import random
import time
from typing import Any


async def fetch_rate_limited(
    urls: list[str],
    rps: float,
    retries: int = 3,
    base_delay: float = 0.25,
) -> list[dict[str, Any]]:
    """Fetch URLs with a global \`rps\` rate limit + retry on transient errors.

    - Rate limit must be async-safe (token bucket using asyncio.Lock +
      \`await asyncio.sleep\`, never \`time.sleep\`).
    - Retry 5xx, 429, network errors, timeouts with exponential backoff
      + jitter, up to \`retries\` times. Do NOT retry other 4xx.
    - Return results in input order; permanent failures get a sentinel
      like {"url": url, "error": "..."}.
    """
    # TODO: implement an AsyncTokenBucket and per-URL retry/backoff
    pass
`,
    setup: `
import asyncio
import sys
import types

_fake = types.ModuleType("aiohttp")

class _ClientTimeout:
    def __init__(self, total=None):
        self.total = total

class _ClientConnectionError(Exception):
    pass

# Per-URL attempt counter shared across the whole test run.
_attempts: dict[str, int] = {}

class _Resp:
    def __init__(self, url):
        self._url = url
        n = _attempts.get(url, 0)
        _attempts[url] = n + 1

        # URL grammar:
        #   ok://...           → always 200
        #   notfound://...     → always 404 (permanent, no retry)
        #   flake://K/...      → 503 for first K calls, then 200
        if url.startswith("ok://"):
            self.status = 200
        elif url.startswith("notfound://"):
            self.status = 404
        elif url.startswith("flake://"):
            try:
                k = int(url.split("/", 3)[2])
            except Exception:
                k = 1
            self.status = 503 if n < k else 200
        else:
            self.status = 200

    async def __aenter__(self):
        return self
    async def __aexit__(self, *a):
        return False
    def raise_for_status(self):
        if self.status >= 400:
            raise RuntimeError(f"HTTP {self.status}")
    async def json(self):
        return {"url": self._url}

class _Session:
    def __init__(self, *a, **kw): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False
    def get(self, url, *a, **kw):
        return _Resp(url)

_fake.ClientSession = _Session
_fake.ClientTimeout = _ClientTimeout
_fake.ClientConnectionError = _ClientConnectionError
sys.modules["aiohttp"] = _fake


def _summarize(results):
    """Collapse to (url, status_or_error) so output is stable."""
    out = []
    for r in results:
        if r.get("status") and "error" not in r:
            out.append({"url": r["url"], "status": r["status"]})
        else:
            out.append({"url": r["url"], "failed": True})
    return out


def run_solution(urls, rps=100.0, retries=3):
    # Reset shared attempt counter for this case.
    _attempts.clear()
    # Use a high RPS in tests so the token bucket doesn't dominate runtime.
    results = asyncio.run(fetch_rate_limited(urls, rps=rps, retries=retries))
    return _summarize(results)
`,
    cases: [
      {
        name: "all 200s — no retries",
        args: [["ok://a", "ok://b", "ok://c"], 100.0, 2],
        expected: [
          { url: "ok://a", status: 200 },
          { url: "ok://b", status: 200 },
          { url: "ok://c", status: 200 },
        ],
      },
      {
        name: "503 twice then 200 — retry recovers",
        args: [["flake://2/x", "ok://y"], 100.0, 3],
        expected: [
          { url: "flake://2/x", status: 200 },
          { url: "ok://y", status: 200 },
        ],
      },
      {
        name: "404 is permanent — no retry, sentinel error",
        args: [["ok://a", "notfound://gone"], 100.0, 3],
        expected: [
          { url: "ok://a", status: 200 },
          { url: "notfound://gone", failed: true },
        ],
        hidden: true,
      },
    ],
  },
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [slug, spec] of Object.entries(PYTHON_ASYNC_TEST_CASES)) {
    const result = await prisma.practiceQuestion.updateMany({
      where: { slug },
      data: { testCases: spec as object },
    });
    if (result.count === 0) {
      console.warn(`  ⚠  ${slug}: no row matches — has the seed run?`);
      skipped++;
      continue;
    }
    console.log(`  ✓ ${slug} (python/async)`);
    updated++;
  }

  console.log(
    `\nDone. Backfilled ${updated} async problems${skipped ? `, ${skipped} skipped` : ""}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
