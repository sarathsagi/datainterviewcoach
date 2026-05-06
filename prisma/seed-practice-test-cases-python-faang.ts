/**
 * seed-practice-test-cases-python-faang.ts
 *
 * Backfills `PracticeQuestion.testCases` for the 6 FAANG-pattern Python
 * problems seeded by `seed-python-faang.ts`. Companion to
 * `seed-practice-test-cases.ts` — same shape, same idempotency story.
 *
 * Three of the six problems (LRU Cache, Token Bucket Rate Limiter,
 * Running Median) are *class*-based, but the runner only knows how to
 * call a single entrypoint *function*. We bridge the gap with a
 * `setup` block that defines a thin wrapper function which:
 *   1. Receives a list of `[op_name, ...args]` tuples,
 *   2. Drives the user-defined class through that op log,
 *   3. Returns the list of outputs (with `null` for ops that return
 *      nothing, so the array length always matches the op count).
 *
 * Each test case then passes the op-list as `args[0]` and the expected
 * outputs as the `expected` array. The user's solution stays a clean
 * class definition; the wrapper lives entirely in `setup`.
 *
 * For the `token-bucket-rate-limiter` problem the wrapper exposes a
 * deterministic clock so tests don't depend on wall time — we patch
 * `time.monotonic` on the user's `TokenBucket` instance.
 *
 * Run with:
 *   npx tsx prisma/seed-practice-test-cases-python-faang.ts
 *
 * Idempotent: matches by slug, overwrites testCases. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Wrapper setups for class-based problems ─────────────────────────
//
// We reuse a generic op-log driver per class. The user defines the
// class; the wrapper instantiates it and dispatches op_name -> method.

const LRU_WRAPPER = `
def run_ops(ops):
    """Drive an LRUCache through a list of [op_name, *args] tuples.

    First op MUST be ["init", capacity]. Subsequent ops are "get" / "put".
    Returns a list aligned with ops where non-returning ops yield None.
    """
    cache = None
    out = []
    for op in ops:
        name = op[0]
        if name == "init":
            cache = LRUCache(op[1])
            out.append(None)
        elif name == "put":
            cache.put(op[1], op[2])
            out.append(None)
        elif name == "get":
            out.append(cache.get(op[1]))
        else:
            raise ValueError(f"unknown op: {name}")
    return out
`;

const TOKEN_BUCKET_WRAPPER = `
def run_ops(ops):
    """Drive a TokenBucket through a deterministic op log.

    Ops:
      ["init", capacity, refill_rate]   -> creates bucket at t=0
      ["advance", seconds]              -> advances the simulated clock
      ["allow"] or ["allow", cost]      -> calls bucket.allow(...)

    We patch the bucket instance's clock by replacing time.monotonic on
    the bucket via a closure on a mutable [now] cell, so tests are
    independent of wall time.
    """
    bucket = None
    clock = [0.0]

    def fake_monotonic():
        return clock[0]

    out = []
    for op in ops:
        name = op[0]
        if name == "init":
            # Monkey-patch BEFORE constructing so __init__'s last_refill uses our clock.
            import time as _time
            _orig = _time.monotonic
            _time.monotonic = fake_monotonic
            try:
                bucket = TokenBucket(op[1], op[2])
            finally:
                _time.monotonic = _orig
            # Re-patch for subsequent _refill calls — the user's code calls time.monotonic
            # at module level, so we keep it patched for the duration of run_ops.
            _time.monotonic = fake_monotonic
            out.append(None)
        elif name == "advance":
            clock[0] += op[1]
            out.append(None)
        elif name == "allow":
            cost = op[1] if len(op) > 1 else 1
            try:
                out.append(bucket.allow(cost))
            except TypeError:
                # Allow user code that doesn't accept a cost arg.
                out.append(bucket.allow())
        else:
            raise ValueError(f"unknown op: {name}")

    # Restore real monotonic at the end (best-effort; module is fresh per case).
    import time as _time
    if _time.monotonic is fake_monotonic:
        # Reimport to grab the original; if unavailable, leave as-is —
        # the executor recycles the module per case.
        pass
    return out
`;

const RUNNING_MEDIAN_WRAPPER = `
def run_ops(ops):
    """Drive a LatencyMedian through a list of ops.

    Ops:
      ["init"]       -> new LatencyMedian()
      ["add", x]     -> m.add(x); appends None
      ["median"]     -> appends m.median()
    """
    m = None
    out = []
    for op in ops:
        name = op[0]
        if name == "init":
            m = LatencyMedian()
            out.append(None)
        elif name == "add":
            m.add(op[1])
            out.append(None)
        elif name == "median":
            out.append(m.median())
        else:
            raise ValueError(f"unknown op: {name}")
    return out
`;

// ── Wrapper for merge_streams (turns list-of-lists -> list-of-iters) ──
//
// The user's `merge_streams` takes a list of *iterables*. JSON test args
// can only deliver lists, so we wrap to convert lists -> iters and to
// materialize the returned generator into a JSON-comparable list.

const MERGE_STREAMS_WRAPPER = `
def run_merge(streams_as_lists):
    """Convert list-of-lists -> list-of-iterators, run user merge,
    materialize the result as a list of [ts, payload] pairs.

    Tuples become lists after JSON roundtrip — we normalize on output
    so the deep-equality check sees lists on both sides.
    """
    iters = [iter([tuple(item) for item in s]) for s in streams_as_lists]
    return [list(pair) for pair in merge_streams(iters)]
`;

// ── Test cases ──────────────────────────────────────────────────────

const PYTHON_FAANG_TEST_CASES: Record<string, unknown> = {
  // ─────────────────────────────────────────────
  // Top-K Frequent Elements
  // ─────────────────────────────────────────────
  //
  // The problem statement allows arbitrary tie-break order, but our
  // runner does deep equality. We pick examples where the top-k by
  // frequency are unambiguous (no ties at the cutoff). For the
  // tie-breaking case we set k high enough to include all tied
  // elements, then sort both sides via a wrapper.
  "top-k-frequent-elements": {
    kind: "python",
    entrypoint: "top_k_frequent_sorted",
    starterCode: `from typing import List

def top_k_frequent(queries: List[str], k: int) -> List[str]:
    """Return the k most frequent queries in descending order of frequency.

    Ties may be broken arbitrarily — tests sort the result before comparing.
    Example: queries=["spark","airflow","spark","snowflake","airflow","spark","dbt"], k=2
             -> ["spark", "airflow"]
    """
    # TODO: implement (Counter + heapq.nlargest is the O(n log k) target)
    pass`,
    setup: `
def top_k_frequent_sorted(queries, k):
    """Wrapper: sorts the result so tie-break order doesn't matter.

    We compare against an alphabetically-sorted expected list.
    """
    result = top_k_frequent(queries, k)
    return sorted(result)
`,
    cases: [
      {
        name: "example from problem",
        args: [
          ["spark", "airflow", "spark", "snowflake", "airflow", "spark", "dbt"],
          2,
        ],
        // spark=3, airflow=2 — unambiguous top 2.
        expected: ["airflow", "spark"], // sorted
      },
      {
        name: "k = 1, single dominant term",
        args: [["a", "a", "a", "b", "c"], 1],
        expected: ["a"],
      },
      {
        name: "k equals unique count",
        args: [["x", "y", "z", "x", "y"], 3],
        expected: ["x", "y", "z"],
      },
      {
        name: "single element list",
        args: [["only"], 1],
        expected: ["only"],
      },
      {
        name: "tie-breaking — k covers all tied elements",
        args: [["a", "b", "c", "a", "b", "c"], 3],
        // All three tied at freq 2; with k=3 the set is unambiguous.
        expected: ["a", "b", "c"],
      },
      {
        name: "stress — many unique, small k",
        args: [
          // 100 'hot' + 50 'warm' + 1 each for 'c0'..'c19'
          [
            ...Array(100).fill("hot"),
            ...Array(50).fill("warm"),
            ...Array.from({ length: 20 }, (_, i) => `c${i}`),
          ],
          2,
        ],
        expected: ["hot", "warm"],
        hidden: true,
      },
    ],
  },

  // ─────────────────────────────────────────────
  // Sliding Window Maximum
  // ─────────────────────────────────────────────
  "sliding-window-maximum": {
    kind: "python",
    entrypoint: "sliding_max",
    starterCode: `from typing import List

def sliding_max(qps: List[int], k: int) -> List[int]:
    """Return the maximum of every k-sized window in qps.

    Output length is len(qps) - k + 1.
    Example: qps=[120,340,210,400,150,90,500,220], k=3
             -> [340, 400, 400, 400, 500, 500]
    Aim for O(n) using a monotonic deque of indices.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "example from problem",
        args: [[120, 340, 210, 400, 150, 90, 500, 220], 3],
        expected: [340, 400, 400, 400, 500, 500],
      },
      {
        name: "k = 1 (every element is its own window max)",
        args: [[5, 3, 8, 1, 9], 1],
        expected: [5, 3, 8, 1, 9],
      },
      {
        name: "k = len (single window covering everything)",
        args: [[5, 3, 8, 1, 9], 5],
        expected: [9],
      },
      {
        name: "monotonically decreasing input",
        args: [[5, 4, 3, 2, 1], 2],
        expected: [5, 4, 3, 2],
      },
      {
        name: "duplicate maxes inside window",
        args: [[7, 7, 7, 7], 2],
        expected: [7, 7, 7],
      },
      {
        name: "stress — 1000 elements, k=50",
        args: [
          // values 0..999; max of any 50-wide window is the right edge.
          Array.from({ length: 1000 }, (_, i) => i),
          50,
        ],
        // window i covers [i, i+49]; max is i+49 for i in 0..950.
        expected: Array.from({ length: 951 }, (_, i) => i + 49),
        hidden: true,
      },
    ],
  },

  // ─────────────────────────────────────────────
  // Token Bucket Rate Limiter (CLASS — uses run_ops wrapper)
  // ─────────────────────────────────────────────
  //
  // The wrapper patches `time.monotonic` to a deterministic clock so
  // tests are reproducible. Ops:
  //   ["init", capacity, refill_rate]
  //   ["advance", seconds]
  //   ["allow"] or ["allow", cost]
  "token-bucket-rate-limiter": {
    kind: "python",
    entrypoint: "run_ops",
    starterCode: `import time

class TokenBucket:
    """Token-bucket rate limiter.

    Holds up to \`capacity\` tokens, refilling at \`refill_rate\` tokens/sec.
    Each allow() call consumes \`cost\` tokens (default 1) and returns True
    if tokens were available, else False. Use lazy refill based on elapsed
    time (no background thread). Use time.monotonic() for elapsed math.
    """
    def __init__(self, capacity: int, refill_rate: float):
        # TODO: store capacity, refill_rate, current tokens, last_refill timestamp
        pass

    def allow(self, cost: int = 1) -> bool:
        # TODO: refill based on elapsed time, then try to consume \`cost\` tokens
        pass`,
    setup: TOKEN_BUCKET_WRAPPER,
    cases: [
      {
        name: "burst fills capacity, then rejects",
        args: [
          [
            ["init", 5, 2.0],
            ["allow"],
            ["allow"],
            ["allow"],
            ["allow"],
            ["allow"],
            ["allow"], // 6th — bucket empty, should fail
          ],
        ],
        expected: [null, true, true, true, true, true, false],
      },
      {
        name: "refills 2 tokens after 1 second",
        args: [
          [
            ["init", 5, 2.0],
            ["allow"], ["allow"], ["allow"], ["allow"], ["allow"], // drain
            ["advance", 1.0],
            ["allow"], ["allow"], // 2 refilled
            ["allow"], // 3rd — empty again
          ],
        ],
        expected: [null, true, true, true, true, true, null, true, true, false],
      },
      {
        name: "capacity is a hard cap (long idle doesn't overflow)",
        args: [
          [
            ["init", 3, 1.0],
            ["advance", 100.0], // would refill 100 tokens, but cap is 3
            ["allow"], ["allow"], ["allow"],
            ["allow"], // 4th fails
          ],
        ],
        expected: [null, null, true, true, true, false],
      },
      {
        name: "single-token bucket",
        args: [
          [
            ["init", 1, 1.0],
            ["allow"],
            ["allow"],
            ["advance", 1.0],
            ["allow"],
          ],
        ],
        expected: [null, true, false, null, true],
      },
      {
        name: "fractional refill rate (2.5 tok/s over 0.4s = 1 token)",
        args: [
          [
            ["init", 5, 2.5],
            ["allow"], ["allow"], ["allow"], ["allow"], ["allow"], // drain
            ["advance", 0.4],
            ["allow"], // ~1.0 refilled
            ["allow"], // bucket empty again
          ],
        ],
        expected: [null, true, true, true, true, true, null, true, false],
        hidden: true,
      },
    ],
  },

  // ─────────────────────────────────────────────
  // LRU Cache (CLASS — uses run_ops wrapper)
  // ─────────────────────────────────────────────
  //
  // Ops: ["init", capacity], ["put", key, value], ["get", key]
  // Wrapper returns null for init/put and the cache value (or None) for get.
  "lru-cache-implementation": {
    kind: "python",
    entrypoint: "run_ops",
    starterCode: `class LRUCache:
    """Fixed-capacity Least-Recently-Used cache.

    get(key)        -> stored value, or None if missing. A hit promotes
                       the key to most-recently-used.
    put(key, value) -> inserts/updates. When over capacity, evicts the
                       least-recently-used entry.

    Both operations must be O(1). Implement with OrderedDict, or with a
    hash map + doubly-linked-list.
    """
    def __init__(self, capacity: int):
        # TODO: implement
        pass

    def get(self, key):
        # TODO
        pass

    def put(self, key, value) -> None:
        # TODO
        pass`,
    setup: LRU_WRAPPER,
    cases: [
      {
        name: "example from problem statement",
        args: [
          [
            ["init", 2],
            ["put", "q1", "result_a"],
            ["put", "q2", "result_b"],
            ["get", "q1"], // -> "result_a", q1 promoted
            ["put", "q3", "result_c"], // evicts q2
            ["get", "q2"], // -> None
            ["get", "q3"], // -> "result_c"
          ],
        ],
        expected: [null, null, null, "result_a", null, null, "result_c"],
      },
      {
        name: "get on miss returns None",
        args: [
          [
            ["init", 2],
            ["get", "missing"],
          ],
        ],
        expected: [null, null],
      },
      {
        name: "put updates value AND promotes existing key",
        args: [
          [
            ["init", 2],
            ["put", 1, "a"],
            ["put", 2, "b"],
            ["put", 1, "a2"], // updates + promotes 1
            ["put", 3, "c"], // evicts 2 (LRU), not 1
            ["get", 2], // None
            ["get", 1], // "a2"
            ["get", 3], // "c"
          ],
        ],
        expected: [null, null, null, null, null, null, "a2", "c"],
      },
      {
        name: "capacity 1 evicts on every distinct put",
        args: [
          [
            ["init", 1],
            ["put", "a", 1],
            ["put", "b", 2],
            ["get", "a"], // None — evicted
            ["get", "b"], // 2
          ],
        ],
        expected: [null, null, null, null, 2],
      },
      {
        name: "stress — 50 ops, capacity 3, exercises eviction order",
        args: [
          [
            ["init", 3],
            ["put", 1, 1], ["put", 2, 2], ["put", 3, 3],
            ["get", 1], // 1 promoted; LRU=2
            ["put", 4, 4], // evicts 2
            ["get", 2], // None
            ["get", 3], // 3 promoted; LRU=1
            ["put", 5, 5], // evicts 1
            ["get", 1], // None
            ["get", 4], // 4
            ["get", 5], // 5
          ],
        ],
        expected: [
          null, null, null, null, 1, null, null, 3, null, null, 4, 5,
        ],
        hidden: true,
      },
    ],
  },

  // ─────────────────────────────────────────────
  // Merge K Sorted Streams
  // ─────────────────────────────────────────────
  //
  // The wrapper turns list-of-lists into list-of-iters and materializes
  // the merged generator. Tuples come back as lists after JSON
  // roundtrip, so the wrapper normalizes pairs -> [ts, payload] lists.
  "merge-k-sorted-streams": {
    kind: "python",
    entrypoint: "run_merge",
    starterCode: `from typing import Iterable, Iterator, Any, Tuple, List

def merge_streams(streams: List[Iterable[Tuple[int, Any]]]) -> Iterator[Tuple[int, Any]]:
    """Merge k sorted streams of (timestamp, payload) tuples into one
    timestamp-sorted iterator.

    Memory must be O(k), not O(n). Use a min-heap of size k. Include a
    monotonic tiebreaker counter in heap entries so payloads are never
    compared when timestamps tie.
    """
    # TODO: implement (yield tuples lazily)
    pass`,
    setup: MERGE_STREAMS_WRAPPER,
    cases: [
      {
        name: "three streams, no ties",
        args: [
          [
            [[1, "a"], [4, "d"], [7, "g"]],
            [[2, "b"], [5, "e"]],
            [[3, "c"], [6, "f"], [8, "h"]],
          ],
        ],
        expected: [
          [1, "a"], [2, "b"], [3, "c"], [4, "d"],
          [5, "e"], [6, "f"], [7, "g"], [8, "h"],
        ],
      },
      {
        name: "single stream",
        args: [[[[1, "a"], [2, "b"], [3, "c"]]]],
        expected: [[1, "a"], [2, "b"], [3, "c"]],
      },
      {
        name: "all empty streams",
        args: [[[], [], []]],
        expected: [],
      },
      {
        name: "mix of empty and non-empty",
        args: [
          [
            [],
            [[1, "x"], [3, "y"]],
            [],
            [[2, "z"]],
          ],
        ],
        expected: [[1, "x"], [2, "z"], [3, "y"]],
      },
      {
        name: "tie on timestamp (tiebreaker counter prevents payload compare)",
        args: [
          [
            [[1, { "k": "v1" }], [2, { "k": "v2" }]],
            [[1, { "k": "v3" }]],
          ],
        ],
        // Both ts=1 entries come first; among them, stream 0's element
        // was pushed first (lower counter), so it pops first. Then ts=2.
        expected: [
          [1, { k: "v1" }],
          [1, { k: "v3" }],
          [2, { k: "v2" }],
        ],
      },
      {
        name: "stress — 10 streams of 20 each, interleaved",
        args: [
          [
            // Stream i has timestamps i, i+10, i+20, ..., i+190 (20 entries).
            ...Array.from({ length: 10 }, (_, i) =>
              Array.from({ length: 20 }, (_, j) => [i + j * 10, `s${i}-${j}`])
            ),
          ],
        ],
        // Merged: ts 0..199, payload deterministic per ts.
        expected: Array.from({ length: 200 }, (_, ts) => [
          ts,
          `s${ts % 10}-${Math.floor(ts / 10)}`,
        ]),
        hidden: true,
      },
    ],
  },

  // ─────────────────────────────────────────────
  // Running Median (CLASS — uses run_ops wrapper)
  // ─────────────────────────────────────────────
  //
  // Ops: ["init"], ["add", x], ["median"]
  // Wrapper returns null for init/add and the median value for median.
  "running-median-from-stream": {
    kind: "python",
    entrypoint: "run_ops",
    starterCode: `class LatencyMedian:
    """Running median over a stream of numeric latencies.

    add(x)   -> O(log n) insert
    median() -> O(1) read; returns the middle value (odd count) or the
                average of the two middle values (even count).

    Standard approach: two heaps — a max-heap for the lower half and a
    min-heap for the upper half, kept balanced in size.
    """
    def __init__(self):
        # TODO: initialize the two heaps
        pass

    def add(self, x: float) -> None:
        # TODO
        pass

    def median(self) -> float:
        # TODO
        pass`,
    setup: RUNNING_MEDIAN_WRAPPER,
    cases: [
      {
        name: "example from problem statement",
        args: [
          [
            ["init"],
            ["add", 50], ["median"],   // 50
            ["add", 100], ["median"],  // 75
            ["add", 200], ["median"],  // 100
            ["add", 10], ["median"],   // 75
          ],
        ],
        expected: [null, null, 50, null, 75, null, 100, null, 75],
      },
      {
        name: "single element",
        args: [[["init"], ["add", 42], ["median"]]],
        expected: [null, null, 42],
      },
      {
        name: "two elements -> average",
        args: [[["init"], ["add", 1], ["add", 3], ["median"]]],
        expected: [null, null, null, 2],
      },
      {
        name: "duplicate values stay correct",
        args: [
          [
            ["init"],
            ["add", 5], ["add", 5], ["add", 5], ["median"], // 5
            ["add", 5], ["median"],                          // 5
          ],
        ],
        expected: [null, null, null, null, 5, null, 5],
      },
      {
        name: "negative + positive mix",
        args: [
          [
            ["init"],
            ["add", -10], ["add", 10], ["median"], // 0.0
            ["add", 0], ["median"],                 // 0
            ["add", -5], ["add", 5], ["median"],   // 0
          ],
        ],
        expected: [null, null, null, 0, null, 0, null, null, 0],
      },
      {
        name: "stress — 7-element sequence from solution test",
        args: [
          [
            ["init"],
            ["add", 50], ["median"],
            ["add", 100], ["median"],
            ["add", 200], ["median"],
            ["add", 10], ["median"],
            ["add", 75], ["median"],
            ["add", 300], ["median"],
            ["add", 60], ["median"],
          ],
        ],
        // From the solution's own test: [50, 75, 100, 75, 75, 87.5, 75]
        expected: [
          null,
          null, 50,
          null, 75,
          null, 100,
          null, 75,
          null, 75,
          null, 87.5,
          null, 75,
        ],
        hidden: true,
      },
    ],
  },
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [slug, spec] of Object.entries(PYTHON_FAANG_TEST_CASES)) {
    const result = await prisma.practiceQuestion.updateMany({
      where: { slug },
      data: { testCases: spec as object },
    });
    if (result.count === 0) {
      console.warn(`  ⚠  ${slug}: no row matches — has seed-python-faang.ts run?`);
      skipped++;
      continue;
    }
    console.log(`  ✓ ${slug} (python)`);
    updated++;
  }

  console.log(
    `\nDone. Backfilled ${updated} FAANG-pattern problems${
      skipped ? `, ${skipped} skipped` : ""
    }.`
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
