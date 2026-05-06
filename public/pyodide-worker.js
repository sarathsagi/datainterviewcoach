/**
 * Pyodide worker — runs user Python code off the main thread.
 *
 * We load Pyodide from the official CDN inside the worker. This avoids
 * bundling ~8MB of WASM + stdlib into our build, and the browser caches
 * it across sessions.
 *
 * Worker protocol (postMessage / onmessage):
 *
 *   Main → Worker:
 *     { type: "run", id, code, setup?, entrypoint, cases }
 *       code        — user's Python solution string
 *       setup       — optional preamble run before code (helpers/imports)
 *       entrypoint  — function name to call for each case
 *       cases       — array of { args[], expected }
 *
 *   Worker → Main:
 *     { type: "ready", id }                          first message after Pyodide loads
 *     { type: "result", id, passed, cases, totalMs } final result for a run request
 *     { type: "error", id, message }                 fatal (couldn't load Pyodide, etc.)
 *
 * The id round-trips so the main thread can correlate responses to the
 * request that fired them — useful when the user clicks Run twice quickly.
 */

/* global self, importScripts, loadPyodide */

// Pinned to a stable, widely-deployed Pyodide version. Bumping this is a
// load-bearing change — the loader script + WASM + stdlib are versioned
// together, and newer Pyodide releases occasionally tighten init semantics
// in ways the worker isn't ready for. Test in a preview deploy before
// bumping. Last-known-good: 0.26.4 (Nov 2024 release, broad browser coverage).
const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = null;

async function ensurePyodide() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    importScripts(`${PYODIDE_CDN}pyodide.js`);
    // eslint-disable-next-line no-undef
    const py = await loadPyodide({ indexURL: PYODIDE_CDN });
    return py;
  })();
  return pyodidePromise;
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "run") return;

  const { id, code, setup, entrypoint, cases } = msg;
  const startedAt = performance.now();

  let py;
  try {
    py = await ensurePyodide();
  } catch (err) {
    self.postMessage({
      type: "error",
      id,
      message: `Couldn't load the Python runtime: ${err?.message ?? err}`,
    });
    return;
  }

  const results = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const caseStart = performance.now();

    // Each case runs in a fresh dict namespace. We don't reuse the
    // global scope across cases — leaks state, lets case N depend on
    // case N-1's side effects, makes failures harder to interpret.
    const ns = py.toPy({});
    try {
      // Combine setup + user code, then call the entrypoint with this
      // case's args. We JSON-encode args/expected on the JS side and
      // decode in Python so any JSON-serializable value round-trips
      // cleanly through the boundary.
      const argsJson = JSON.stringify(c.args ?? []);
      const expectedJson = JSON.stringify(c.expected);

      // Pre-import the typing primitives users routinely use without
      // importing them (LeetCode-style code expects `List`, `Dict`, etc.
      // to "just work"). Costs ~0ms and skips a class of NameError that
      // would otherwise be the user's first frustrating result.
      // Resolve the entrypoint flexibly so users can write code in any of:
      //   1. The exact configured name           (def two_sum(...): ...)
      //   2. camelCase variant                   (def twoSum(...): ...)  ← LeetCode habit
      //   3. snake_case variant when the spec uses camelCase
      //   4. Method on a `Solution` class         (LeetCode submission template)
      // This mirrors the muscle memory of every coding-prep platform.
      // Without it, candidates who write LeetCode-style code see
      // "NameError: two_sum is not defined" and bounce.
      const program = `
import json
from typing import List, Dict, Tuple, Set, Optional, Any, Iterable, Iterator, Callable, Union
from collections import defaultdict, Counter, deque, OrderedDict
import heapq
import math
import re
${setup ?? ""}
${code}

def __snake_to_camel(s):
    parts = s.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])

def __camel_to_snake(s):
    out = []
    for i, ch in enumerate(s):
        if ch.isupper() and i > 0:
            out.append("_")
        out.append(ch.lower())
    return "".join(out)

def __resolve_entrypoint():
    """Find the user's solution function across naming conventions."""
    name = ${JSON.stringify(entrypoint)}
    candidates = [name]
    if "_" in name:
        candidates.append(__snake_to_camel(name))
    if any(c.isupper() for c in name):
        candidates.append(__camel_to_snake(name))
    # 1. Free function in module scope (most common)
    g = globals()
    for c in candidates:
        if c in g and callable(g[c]):
            return g[c]
    # 2. Method on a Solution class (LeetCode template). Instantiate
    #    with no args — if __init__ requires args we let the error surface.
    if "Solution" in g:
        try:
            __sol_instance = g["Solution"]()
        except TypeError:
            __sol_instance = None
        if __sol_instance is not None:
            for c in candidates:
                if hasattr(__sol_instance, c):
                    method = getattr(__sol_instance, c)
                    if callable(method):
                        return method
    raise NameError(
        f"Couldn't find your solution function. Expected one of: "
        f"{', '.join(repr(c) for c in candidates)} (free function or method on Solution class)."
    )

__fn = __resolve_entrypoint()
__args = json.loads(${JSON.stringify(argsJson)})
__expected = json.loads(${JSON.stringify(expectedJson)})
__actual = __fn(*__args)

# Round-trip __actual through JSON so tuples become lists, sets become
# arrays — match how the JS side will compare.
__actual_json = json.dumps(__actual, default=str, sort_keys=True)
__expected_json = json.dumps(__expected, default=str, sort_keys=True)
__passed = __actual_json == __expected_json
`;

      await py.runPythonAsync(program, { globals: ns });

      const passed = ns.get("__passed");
      if (passed) {
        results.push({
          index: i,
          name: c.name,
          passed: true,
          durationMs: Math.round(performance.now() - caseStart),
          hidden: !!c.hidden,
        });
      } else {
        const actual = JSON.parse(ns.get("__actual_json"));
        const expected = JSON.parse(ns.get("__expected_json"));
        results.push({
          index: i,
          name: c.name,
          passed: false,
          error: "Returned value did not match expected.",
          actual: c.hidden ? undefined : actual,
          expected: c.hidden ? undefined : expected,
          durationMs: Math.round(performance.now() - caseStart),
          hidden: !!c.hidden,
        });
      }
    } catch (err) {
      // Python exceptions and runtime errors bubble up here. We pass
      // the message through verbatim — Pyodide's traceback strings are
      // already user-readable.
      results.push({
        index: i,
        name: c.name,
        passed: false,
        error: err?.message ?? String(err),
        durationMs: Math.round(performance.now() - caseStart),
        hidden: !!c.hidden,
      });
    } finally {
      // Free the Python proxy. Required — Pyodide's GC won't reclaim it
      // automatically on the JS side.
      try {
        ns.destroy();
      } catch {
        // best effort; if destroy throws, the namespace will leak but
        // it's a one-off — not worth crashing the whole run for.
      }
    }
  }

  self.postMessage({
    type: "result",
    id,
    passed: results.every((r) => r.passed),
    cases: results,
    totalMs: Math.round(performance.now() - startedAt),
  });
};
