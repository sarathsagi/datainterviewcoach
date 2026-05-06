/**
 * seed-practice-test-cases-python.ts
 *
 * Backfills `PracticeQuestion.testCases` for the 25 Python data-engineering
 * problems defined in `prisma/seed-python.ts`. Each spec follows the
 * `PythonTestSpec` discriminated-union variant from
 * `src/lib/executors/types.ts`:
 *
 *   - kind: "python"
 *   - entrypoint: function name the user must define
 *   - cases: 3-5 visible cases + optional `hidden: true` edge cases
 *
 * Run with:
 *   npx tsx prisma/seed-practice-test-cases-python.ts
 *
 * Idempotent: matches by slug, overwrites testCases. Safe to re-run.
 *
 * Notes / special handling:
 *   - `coerce-record-types`, `dataclass-config-loader`: solutions return
 *     objects containing non-JSON-serializable values (datetime.date,
 *     dataclass instances). We pin entrypoints to thin wrappers callers
 *     are expected to define — see each spec's `setup` block where
 *     applicable, or test cases that probe JSON-safe subsets.
 *   - `merge-incremental-state`: solution mutates `state` in place AND
 *     returns it; safe to test by return value.
 *   - `context-manager-timer`, `in-memory-cache-with-ttl`,
 *     `watermark-stateful-processor`, `parallel-api-fetcher`,
 *     `pipeline-runner`: classes / decorators / time- or IO-dependent.
 *     We define a top-level wrapper (via `setup`) that exercises the
 *     class / decorator deterministically and pin `entrypoint` to that
 *     wrapper.
 *   - `batch-file-generator`: relies on filesystem; we test the
 *     in-memory equivalent that takes a CSV string via StringIO.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PYTHON_TEST_CASES: Record<string, unknown> = {
  // ── EASY ───────────────────────────────────────────────────────────

  "flatten-nested-json": {
    kind: "python",
    entrypoint: "flatten",
    starterCode: `def flatten(data: dict, prefix: str = "") -> dict:
    """Flatten a nested dict using dot notation for keys.

    Example:
        {"a": 1, "b": {"c": 2}} -> {"a": 1, "b.c": 2}
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "two levels",
        args: [{ user: { id: 1, address: { city: "NYC", zip: "10001" } }, score: 99 }],
        expected: { "user.id": 1, "user.address.city": "NYC", "user.address.zip": "10001", score: 99 },
      },
      {
        name: "flat input",
        args: [{ a: 1, b: 2 }],
        expected: { a: 1, b: 2 },
      },
      {
        name: "deeply nested",
        args: [{ x: { y: { z: { w: 5 } } } }],
        expected: { "x.y.z.w": 5 },
      },
      {
        name: "empty dict",
        args: [{}],
        expected: {},
        hidden: true,
      },
      {
        name: "list values stay as-is",
        args: [{ a: [1, 2, 3], b: { c: null } }],
        expected: { a: [1, 2, 3], "b.c": null },
        hidden: true,
      },
    ],
  },

  "group-records-by-key": {
    kind: "python",
    entrypoint: "group_by",
    starterCode: `from typing import Any

def group_by(records: list[dict], key: str) -> dict[Any, list[dict]]:
    """Group a list of dicts by the value at \`key\`.

    Records missing the key go into a "__missing__" group.
    Order within each group must be preserved.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "two groups",
        args: [
          [
            { dept: "eng", name: "Alice" },
            { dept: "eng", name: "Bob" },
            { dept: "hr", name: "Carol" },
          ],
          "dept",
        ],
        expected: {
          eng: [
            { dept: "eng", name: "Alice" },
            { dept: "eng", name: "Bob" },
          ],
          hr: [{ dept: "hr", name: "Carol" }],
        },
      },
      {
        name: "single group",
        args: [[{ k: "a", v: 1 }, { k: "a", v: 2 }], "k"],
        expected: { a: [{ k: "a", v: 1 }, { k: "a", v: 2 }] },
      },
      {
        name: "missing key goes to __missing__",
        args: [
          [
            { dept: "eng", name: "Alice" },
            { name: "Dave" },
          ],
          "dept",
        ],
        expected: {
          eng: [{ dept: "eng", name: "Alice" }],
          __missing__: [{ name: "Dave" }],
        },
      },
      {
        name: "empty list",
        args: [[], "dept"],
        expected: {},
        hidden: true,
      },
    ],
  },

  "remove-duplicates-preserve-order": {
    kind: "python",
    entrypoint: "deduplicate",
    starterCode: `def deduplicate(items: list) -> list:
    """Remove duplicates from \`items\`, preserving the order of first occurrence.

    Example:
        [3, 1, 4, 1, 5, 9, 2, 6, 5, 3] -> [3, 1, 4, 5, 9, 2, 6]
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "mixed dupes",
        args: [[3, 1, 4, 1, 5, 9, 2, 6, 5, 3]],
        expected: [3, 1, 4, 5, 9, 2, 6],
      },
      {
        name: "no dupes",
        args: [[1, 2, 3]],
        expected: [1, 2, 3],
      },
      {
        name: "all same",
        args: [[7, 7, 7, 7]],
        expected: [7],
      },
      {
        name: "empty",
        args: [[]],
        expected: [],
        hidden: true,
      },
      {
        name: "strings preserve first occurrence",
        args: [["a", "b", "a", "c", "b"]],
        expected: ["a", "b", "c"],
        hidden: true,
      },
    ],
  },

  "chunk-list-into-batches": {
    kind: "python",
    entrypoint: "chunk_to_list",
    setup: `# Wrapper materializes the generator so cases can compare lists.
def chunk_to_list(iterable, size):
    return list(chunked(iterable, size))
`,
    starterCode: `from itertools import islice
from typing import Iterable, TypeVar

T = TypeVar("T")

def chunked(iterable: Iterable[T], size: int):
    """Yield successive sublists of \`iterable\` of length \`size\`.

    The last chunk may be smaller if the total isn't evenly divisible.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "even split",
        args: [[1, 2, 3, 4, 5, 6], 2],
        expected: [[1, 2], [3, 4], [5, 6]],
      },
      {
        name: "uneven split, last chunk smaller",
        args: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3],
        expected: [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]],
      },
      {
        name: "size larger than input",
        args: [[1, 2], 5],
        expected: [[1, 2]],
      },
      {
        name: "empty input",
        args: [[], 4],
        expected: [],
        hidden: true,
      },
      {
        name: "size of 1",
        args: [["a", "b", "c"], 1],
        expected: [["a"], ["b"], ["c"]],
        hidden: true,
      },
    ],
  },

  "count-field-frequencies": {
    kind: "python",
    entrypoint: "value_counts",
    starterCode: `def value_counts(records: list[dict], field: str) -> dict:
    """Count how often each value of \`field\` appears across \`records\`.

    Return a dict sorted by count descending. Skip records missing the field.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "country counts",
        args: [
          [
            { country: "US", plan: "pro" },
            { country: "UK", plan: "free" },
            { country: "US", plan: "free" },
            { country: "US", plan: "enterprise" },
          ],
          "country",
        ],
        expected: { US: 3, UK: 1 },
      },
      {
        name: "plan counts",
        args: [
          [
            { country: "US", plan: "pro" },
            { country: "UK", plan: "free" },
            { country: "US", plan: "free" },
            { country: "US", plan: "enterprise" },
          ],
          "plan",
        ],
        expected: { free: 2, pro: 1, enterprise: 1 },
      },
      {
        name: "missing field skipped",
        args: [
          [{ country: "US" }, { plan: "free" }, { country: "US" }],
          "country",
        ],
        expected: { US: 2 },
      },
      {
        name: "empty list",
        args: [[], "country"],
        expected: {},
        hidden: true,
      },
    ],
  },

  "safe-nested-dict-access": {
    kind: "python",
    entrypoint: "safe_get_call",
    setup: `# Wrapper avoids varargs/kwargs serialization quirks.
def safe_get_call(data, keys, default=None):
    return safe_get(data, *keys, default=default)
`,
    starterCode: `from typing import Any

def safe_get(data: dict, *keys: str, default: Any = None) -> Any:
    """Safely retrieve a value from a nested dict without raising.

    Example:
        safe_get({"a": {"b": 1}}, "a", "b") -> 1
        safe_get({"a": {"b": 1}}, "a", "c", default="x") -> "x"
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "deep hit",
        args: [{ user: { address: { city: "NYC" } } }, ["user", "address", "city"]],
        expected: "NYC",
      },
      {
        name: "missing path returns None",
        args: [{ user: { address: { city: "NYC" } } }, ["user", "phone", "number"]],
        expected: null,
      },
      {
        name: "missing path with default",
        args: [{ user: { address: { city: "NYC" } } }, ["user", "address", "zip"], "N/A"],
        expected: "N/A",
      },
      {
        name: "non-dict midway",
        args: [{ a: { b: 5 } }, ["a", "b", "c"], "fallback"],
        expected: "fallback",
        hidden: true,
      },
      {
        name: "empty keys returns root",
        args: [{ x: 1 }, []],
        expected: { x: 1 },
        hidden: true,
      },
    ],
  },

  "parse-and-sort-dates": {
    kind: "python",
    entrypoint: "sort_by_date",
    starterCode: `def sort_by_date(records: list[dict], date_field: str, ascending: bool = True) -> list[dict]:
    """Sort \`records\` by an ISO 8601 date string at \`date_field\`.

    Records where the date field is missing or None should be sorted last.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "basic sort",
        args: [
          [
            { id: 1, ts: "2024-03-15T10:30:00Z" },
            { id: 2, ts: "2024-01-01T00:00:00Z" },
            { id: 3, ts: "2024-03-15T09:00:00Z" },
          ],
          "ts",
        ],
        expected: [
          { id: 2, ts: "2024-01-01T00:00:00Z" },
          { id: 3, ts: "2024-03-15T09:00:00Z" },
          { id: 1, ts: "2024-03-15T10:30:00Z" },
        ],
      },
      {
        name: "missing date last",
        args: [
          [
            { id: 1, ts: "2024-03-15T10:30:00Z" },
            { id: 2, ts: null },
            { id: 3, ts: "2024-01-01T00:00:00Z" },
          ],
          "ts",
        ],
        expected: [
          { id: 3, ts: "2024-01-01T00:00:00Z" },
          { id: 1, ts: "2024-03-15T10:30:00Z" },
          { id: 2, ts: null },
        ],
      },
      {
        name: "already sorted",
        args: [
          [
            { id: 1, ts: "2024-01-01T00:00:00Z" },
            { id: 2, ts: "2024-02-01T00:00:00Z" },
          ],
          "ts",
        ],
        expected: [
          { id: 1, ts: "2024-01-01T00:00:00Z" },
          { id: 2, ts: "2024-02-01T00:00:00Z" },
        ],
      },
      {
        name: "empty list",
        args: [[], "ts"],
        expected: [],
        hidden: true,
      },
    ],
  },

  "coerce-record-types": {
    kind: "python",
    entrypoint: "coerce_record_str",
    setup: `# Wrapper restricts schemas to JSON-safe types so cases can round-trip.
# The schema arg is a dict[str, str]; we map names to real types here.
_TYPE_MAP = {"int": int, "float": float, "str": str, "bool": bool}

def coerce_record_str(record, schema_str):
    schema = {k: _TYPE_MAP[v] for k, v in schema_str.items()}
    out = coerce_record(record, schema)
    # convert any non-JSON-safe value to repr; not needed for these cases
    return out
`,
    starterCode: `def coerce_record(record: dict, schema: dict) -> dict:
    """Coerce each field of \`record\` to its target type per \`schema\`.

    schema maps field names to target types (int, float, str, bool).
    Missing fields, empty strings, and conversion errors should yield None.
    Note: bool("false") is True in Python — handle bool by string value.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "happy path",
        args: [
          { id: "42", name: "Widget", price: "9.99", is_active: "true" },
          { id: "int", name: "str", price: "float", is_active: "bool" },
        ],
        expected: { id: 42, name: "Widget", price: 9.99, is_active: true },
      },
      {
        name: "bool false-y strings",
        args: [
          { is_active: "false" },
          { is_active: "bool" },
        ],
        expected: { is_active: false },
      },
      {
        name: "bad int returns None",
        args: [
          { id: "not-a-number" },
          { id: "int" },
        ],
        expected: { id: null },
      },
      {
        name: "missing field becomes None",
        args: [
          { id: "1" },
          { id: "int", name: "str" },
        ],
        expected: { id: 1, name: null },
        hidden: true,
      },
      {
        name: "empty string becomes None",
        args: [
          { price: "" },
          { price: "float" },
        ],
        expected: { price: null },
        hidden: true,
      },
    ],
  },

  // ── MEDIUM ─────────────────────────────────────────────────────────

  "retry-decorator": {
    kind: "python",
    entrypoint: "run_flaky",
    setup: `# Drives the decorated function with a deterministic counter so we
# can assert on call count + final return value.
_state = {"calls": 0}

def run_flaky(fail_times, max_attempts):
    _state["calls"] = 0

    @retry(max_attempts=max_attempts, delay=0, exceptions=(ValueError,))
    def f():
        _state["calls"] += 1
        if _state["calls"] <= fail_times:
            raise ValueError("not yet")
        return "success"

    try:
        result = f()
        return {"result": result, "calls": _state["calls"], "raised": False}
    except ValueError:
        return {"result": None, "calls": _state["calls"], "raised": True}
`,
    starterCode: `from typing import Type

def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    exceptions: tuple[Type[Exception], ...] = (Exception,),
):
    """Decorator that retries a function on failure.

    Retries up to \`max_attempts\` times with \`delay\` seconds between tries,
    only on the specified exception types. Re-raises the last exception
    after exhausting attempts.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "succeeds on second attempt",
        args: [1, 3],
        expected: { result: "success", calls: 2, raised: false },
      },
      {
        name: "succeeds on first attempt",
        args: [0, 3],
        expected: { result: "success", calls: 1, raised: false },
      },
      {
        name: "exhausts attempts then raises",
        args: [5, 3],
        expected: { result: null, calls: 3, raised: true },
      },
      {
        name: "single attempt no retry",
        args: [1, 1],
        expected: { result: null, calls: 1, raised: true },
        hidden: true,
      },
    ],
  },

  "batch-file-generator": {
    kind: "python",
    entrypoint: "batch_csv_string",
    setup: `# Tests the in-memory CSV batcher equivalent (no filesystem).
import csv
import io
from itertools import islice

def batch_csv_string(csv_text, batch_size):
    reader = csv.DictReader(io.StringIO(csv_text))
    batches = []
    while True:
        batch = list(islice(reader, batch_size))
        if not batch:
            break
        batches.append(batch)
    return batches
`,
    starterCode: `from pathlib import Path

def read_in_batches(filepath: str | Path, batch_size: int = 1000):
    """Generator that yields batches of CSV rows as list[dict].

    Reads the file lazily without loading the entire file into memory.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "even batches",
        args: ["id,name\\n1,a\\n2,b\\n3,c\\n4,d", 2],
        expected: [
          [{ id: "1", name: "a" }, { id: "2", name: "b" }],
          [{ id: "3", name: "c" }, { id: "4", name: "d" }],
        ],
      },
      {
        name: "uneven last batch",
        args: ["id,name\\n1,a\\n2,b\\n3,c", 2],
        expected: [
          [{ id: "1", name: "a" }, { id: "2", name: "b" }],
          [{ id: "3", name: "c" }],
        ],
      },
      {
        name: "single batch",
        args: ["id\\n1\\n2", 10],
        expected: [[{ id: "1" }, { id: "2" }]],
      },
      {
        name: "header only",
        args: ["id,name", 5],
        expected: [],
        hidden: true,
      },
    ],
  },

  "context-manager-timer": {
    kind: "python",
    entrypoint: "timer_runs",
    setup: `# Verify Timer works as a context manager and exposes elapsed.
def timer_runs():
    with Timer("test") as t:
        x = sum(range(100))
    return {
        "is_float": isinstance(t.elapsed, float),
        "non_negative": t.elapsed >= 0,
        "computed": x,
    }
`,
    starterCode: `class Timer:
    """Context manager that records elapsed time on exit.

    Usage:
        with Timer("step") as t:
            do_work()
        print(t.elapsed)
    """

    def __init__(self, name: str = ""):
        # TODO: implement
        pass

    def __enter__(self):
        # TODO: implement
        pass

    def __exit__(self, exc_type, exc_val, exc_tb):
        # TODO: implement
        pass`,
    cases: [
      {
        name: "exposes elapsed",
        args: [],
        expected: { is_float: true, non_negative: true, computed: 4950 },
      },
      {
        name: "second invocation independent",
        args: [],
        expected: { is_float: true, non_negative: true, computed: 4950 },
      },
      {
        name: "third invocation",
        args: [],
        expected: { is_float: true, non_negative: true, computed: 4950 },
      },
    ],
  },

  "deduplicate-by-latest-timestamp": {
    kind: "python",
    entrypoint: "keep_latest",
    starterCode: `def keep_latest(records: list[dict], id_field: str, ts_field: str) -> list[dict]:
    """Deduplicate \`records\` by \`id_field\`, keeping the row with the latest \`ts_field\`.

    \`ts_field\` values are ISO 8601 timestamp strings.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "two ids with dupes",
        args: [
          [
            { id: 1, status: "pending", updated_at: "2024-03-01T10:00:00Z" },
            { id: 2, status: "active", updated_at: "2024-03-01T09:00:00Z" },
            { id: 1, status: "completed", updated_at: "2024-03-01T11:00:00Z" },
            { id: 2, status: "churned", updated_at: "2024-03-01T08:00:00Z" },
          ],
          "id",
          "updated_at",
        ],
        expected: [
          { id: 1, status: "completed", updated_at: "2024-03-01T11:00:00Z" },
          { id: 2, status: "active", updated_at: "2024-03-01T09:00:00Z" },
        ],
      },
      {
        name: "no duplicates",
        args: [
          [
            { id: 1, updated_at: "2024-01-01T00:00:00Z" },
            { id: 2, updated_at: "2024-01-02T00:00:00Z" },
          ],
          "id",
          "updated_at",
        ],
        expected: [
          { id: 1, updated_at: "2024-01-01T00:00:00Z" },
          { id: 2, updated_at: "2024-01-02T00:00:00Z" },
        ],
      },
      {
        name: "single id many updates",
        args: [
          [
            { id: 1, v: "a", updated_at: "2024-01-01T00:00:00Z" },
            { id: 1, v: "b", updated_at: "2024-01-03T00:00:00Z" },
            { id: 1, v: "c", updated_at: "2024-01-02T00:00:00Z" },
          ],
          "id",
          "updated_at",
        ],
        expected: [{ id: 1, v: "b", updated_at: "2024-01-03T00:00:00Z" }],
      },
      {
        name: "empty",
        args: [[], "id", "updated_at"],
        expected: [],
        hidden: true,
      },
    ],
  },

  "schema-validator": {
    kind: "python",
    entrypoint: "validate_records",
    setup: `# Wrap class API: schema arg uses string type names (JSON-safe).
_TYPE_MAP = {"int": int, "str": str, "float": float, "bool": bool}

def _resolve(schema_str):
    return {
        field: {
            "type": _TYPE_MAP[rules["type"]],
            "required": rules.get("required", True),
            "nullable": rules.get("nullable", False),
        }
        for field, rules in schema_str.items()
    }

def validate_records(schema_str, records):
    validator = SchemaValidator(_resolve(schema_str))
    valid, invalid = validator.validate_batch(records)
    return {"valid_count": len(valid), "invalid_count": len(invalid)}
`,
    starterCode: `class SchemaValidator:
    """Validate records against a schema.

    schema format: {field_name: {"type": type, "required": bool, "nullable": bool}}
    """

    def __init__(self, schema: dict):
        # TODO: implement
        pass

    def validate(self, record: dict) -> list[str]:
        """Return a list of error strings (empty list = valid)."""
        # TODO: implement
        pass

    def validate_batch(self, records: list[dict]) -> tuple[list[dict], list[dict]]:
        """Return (valid_records, invalid_records)."""
        # TODO: implement
        pass`,
    cases: [
      {
        name: "mixed batch",
        args: [
          {
            id: { type: "int", required: true, nullable: false },
            email: { type: "str", required: true, nullable: false },
            score: { type: "float", required: false, nullable: true },
          },
          [
            { id: 1, email: "a@b.com", score: 9.5 },
            { id: 2, email: null },
            { id: "x", email: "c@d.com" },
            { email: "e@f.com" },
          ],
        ],
        expected: { valid_count: 1, invalid_count: 3 },
      },
      {
        name: "all valid",
        args: [
          {
            id: { type: "int", required: true, nullable: false },
            name: { type: "str", required: true, nullable: false },
          },
          [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
          ],
        ],
        expected: { valid_count: 2, invalid_count: 0 },
      },
      {
        name: "all invalid",
        args: [
          {
            id: { type: "int", required: true, nullable: false },
          },
          [{ id: "x" }, { id: null }, {}],
        ],
        expected: { valid_count: 0, invalid_count: 3 },
      },
      {
        name: "empty batch",
        args: [
          { id: { type: "int", required: true, nullable: false } },
          [],
        ],
        expected: { valid_count: 0, invalid_count: 0 },
        hidden: true,
      },
    ],
  },

  "explode-nested-array-field": {
    kind: "python",
    entrypoint: "explode",
    starterCode: `def explode(records: list[dict], array_field: str) -> list[dict]:
    """Explode each record's \`array_field\` into one record per element.

    Other fields are copied. If the array element is a dict, merge it
    into the parent. Empty arrays preserve the parent (without array_field).
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "two orders, multiple items",
        args: [
          [
            {
              order_id: 1,
              customer: "Alice",
              items: [
                { sku: "A", qty: 2 },
                { sku: "B", qty: 1 },
              ],
            },
            { order_id: 2, customer: "Bob", items: [{ sku: "C", qty: 5 }] },
          ],
          "items",
        ],
        expected: [
          { order_id: 1, customer: "Alice", sku: "A", qty: 2 },
          { order_id: 1, customer: "Alice", sku: "B", qty: 1 },
          { order_id: 2, customer: "Bob", sku: "C", qty: 5 },
        ],
      },
      {
        name: "empty array preserves parent",
        args: [
          [{ order_id: 3, customer: "Carol", items: [] }],
          "items",
        ],
        expected: [{ order_id: 3, customer: "Carol" }],
      },
      {
        name: "scalar array elements",
        args: [
          [{ id: 1, tags: ["a", "b"] }],
          "tags",
        ],
        expected: [
          { id: 1, tags: "a" },
          { id: 1, tags: "b" },
        ],
      },
      {
        name: "empty input",
        args: [[], "items"],
        expected: [],
        hidden: true,
      },
    ],
  },

  "sliding-window-average": {
    kind: "python",
    entrypoint: "moving_average",
    starterCode: `def moving_average(values: list[float], window: int) -> list[float]:
    """Compute the moving average of \`values\` with the given window size.

    Positions with fewer than \`window\` data points use the average of
    available points.

    Example:
        moving_average([1, 2, 3, 4, 5, 6, 7], 3) -> [1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0]
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "window 3 over 7 ints",
        args: [[1, 2, 3, 4, 5, 6, 7], 3],
        expected: [1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0],
      },
      {
        name: "window 1 returns identity",
        args: [[10.0, 20.0, 30.0], 1],
        expected: [10.0, 20.0, 30.0],
      },
      {
        name: "window equal to length",
        args: [[2.0, 4.0, 6.0, 8.0], 4],
        expected: [2.0, 3.0, 4.0, 5.0],
      },
      {
        name: "single element",
        args: [[42.0], 5],
        expected: [42.0],
        hidden: true,
      },
      {
        name: "empty input",
        args: [[], 3],
        expected: [],
        hidden: true,
      },
    ],
  },

  "paginate-api-results": {
    kind: "python",
    entrypoint: "fetch_all",
    setup: `# Drive the paginate generator with a deterministic mock fetch_page.
def make_mock(total, page_size):
    def mock_fetch(page, params):
        start = (page - 1) * page_size
        end = start + page_size
        all_data = [{"id": i} for i in range(1, total + 1)]
        chunk = all_data[start:end]
        return {
            "data": chunk,
            "has_more": end < len(all_data),
            "next_page": page + 1,
        }
    return mock_fetch

def fetch_all(total, page_size):
    return list(paginate(make_mock(total, page_size)))
`,
    starterCode: `from typing import Callable, Iterator

def paginate(fetch_page: Callable, params: dict = {}) -> Iterator[dict]:
    """Generator that yields individual records across all pages.

    \`fetch_page(page_num, params)\` returns a dict:
        {"data": [...records...], "has_more": bool, "next_page": int | None}
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "25 records, page size 10",
        args: [25, 10],
        expected: Array.from({ length: 25 }, (_, i) => ({ id: i + 1 })),
      },
      {
        name: "single page",
        args: [3, 10],
        expected: [{ id: 1 }, { id: 2 }, { id: 3 }],
      },
      {
        name: "exact multiple",
        args: [10, 5],
        expected: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })),
      },
      {
        name: "no records",
        args: [0, 5],
        expected: [],
        hidden: true,
      },
    ],
  },

  "merge-incremental-state": {
    kind: "python",
    entrypoint: "apply_upserts_wrapper",
    setup: `# Wrap because the keys of state in the question are arbitrary scalars
# (ints in the example). JSON has only string keys, so test cases use
# string keys throughout.
def apply_upserts_wrapper(state, updates, key_field):
    return apply_upserts(dict(state), updates, key_field)
`,
    starterCode: `def apply_upserts(state: dict, updates: list[dict], key_field: str) -> dict:
    """Merge a batch of update records into \`state\`.

    For each update:
      - If record has \`_deleted: True\`, remove that key from state.
      - Otherwise, upsert: merge new fields over existing ones.
    Return the updated state.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "update + insert + delete",
        args: [
          {
            "1": { id: "1", name: "Alice", plan: "free" },
            "3": { id: "3", name: "Carol", plan: "enterprise" },
          },
          [
            { id: "1", name: "Alice", plan: "pro" },
            { id: "2", name: "Bob", plan: "free" },
            { id: "3", _deleted: true },
            { id: "4", _deleted: true },
          ],
          "id",
        ],
        expected: {
          "1": { id: "1", name: "Alice", plan: "pro" },
          "2": { id: "2", name: "Bob", plan: "free" },
        },
      },
      {
        name: "all inserts on empty state",
        args: [
          {},
          [
            { id: "a", v: 1 },
            { id: "b", v: 2 },
          ],
          "id",
        ],
        expected: {
          a: { id: "a", v: 1 },
          b: { id: "b", v: 2 },
        },
      },
      {
        name: "delete only",
        args: [
          { x: { id: "x", v: 7 } },
          [{ id: "x", _deleted: true }],
          "id",
        ],
        expected: {},
      },
      {
        name: "update preserves untouched fields",
        args: [
          { "1": { id: "1", a: 1, b: 2, c: 3 } },
          [{ id: "1", b: 99 }],
          "id",
        ],
        expected: { "1": { id: "1", a: 1, b: 99, c: 3 } },
        hidden: true,
      },
    ],
  },

  "transform-api-response": {
    kind: "python",
    entrypoint: "normalize_orders",
    starterCode: `def normalize_orders(response: dict) -> list[dict]:
    """Flatten a nested customers/orders API response into a list of order rows.

    Each output row contains customer_id, customer_name, order_id, amount,
    status, and tags joined as a comma-separated string.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "two customers, three orders",
        args: [
          {
            status: "ok",
            data: {
              customers: [
                {
                  customer_id: "C1",
                  name: "Alice",
                  orders: [
                    { order_id: "O1", amount: 99.0, status: "completed", tags: ["urgent"] },
                    { order_id: "O2", amount: 45.0, status: "pending", tags: [] },
                  ],
                },
                {
                  customer_id: "C2",
                  name: "Bob",
                  orders: [
                    { order_id: "O3", amount: 250.0, status: "completed", tags: ["vip", "bulk"] },
                  ],
                },
              ],
            },
          },
        ],
        expected: [
          { customer_id: "C1", customer_name: "Alice", order_id: "O1", amount: 99.0, status: "completed", tags: "urgent" },
          { customer_id: "C1", customer_name: "Alice", order_id: "O2", amount: 45.0, status: "pending", tags: "" },
          { customer_id: "C2", customer_name: "Bob", order_id: "O3", amount: 250.0, status: "completed", tags: "vip,bulk" },
        ],
      },
      {
        name: "no customers",
        args: [{ status: "ok", data: { customers: [] } }],
        expected: [],
      },
      {
        name: "customer with no orders",
        args: [
          {
            status: "ok",
            data: {
              customers: [{ customer_id: "C1", name: "Alice", orders: [] }],
            },
          },
        ],
        expected: [],
      },
      {
        name: "single tag",
        args: [
          {
            status: "ok",
            data: {
              customers: [
                {
                  customer_id: "C1",
                  name: "A",
                  orders: [{ order_id: "O1", amount: 1.0, status: "ok", tags: ["x"] }],
                },
              ],
            },
          },
        ],
        expected: [
          { customer_id: "C1", customer_name: "A", order_id: "O1", amount: 1.0, status: "ok", tags: "x" },
        ],
        hidden: true,
      },
    ],
  },

  // ── HARD ───────────────────────────────────────────────────────────

  "in-memory-cache-with-ttl": {
    kind: "python",
    entrypoint: "cache_lifecycle",
    setup: `# Drive the TTLCache through a deterministic sequence of operations.
def cache_lifecycle(ops):
    cache = TTLCache(default_ttl=300)
    out = []
    for op in ops:
        kind = op["op"]
        if kind == "set":
            cache.set(op["key"], op["value"], ttl=op.get("ttl", 300))
            out.append(None)
        elif kind == "get":
            out.append(cache.get(op["key"]))
        elif kind == "delete":
            cache.delete(op["key"])
            out.append(None)
        elif kind == "size":
            out.append(cache.size())
    return out
`,
    starterCode: `from typing import Any

class TTLCache:
    """Thread-safe in-memory cache with per-entry TTL expiry."""

    def __init__(self, default_ttl: float = 300):
        # TODO: implement
        pass

    def set(self, key: str, value: Any, ttl: float = None) -> None:
        # TODO: implement
        pass

    def get(self, key: str, default: Any = None) -> Any:
        # TODO: implement
        pass

    def delete(self, key: str) -> None:
        # TODO: implement
        pass

    def size(self) -> int:
        """Return number of non-expired entries."""
        # TODO: implement
        pass`,
    cases: [
      {
        name: "set then get",
        args: [
          [
            { op: "set", key: "a", value: 1 },
            { op: "get", key: "a" },
            { op: "size" },
          ],
        ],
        expected: [null, 1, 1],
      },
      {
        name: "get missing returns None",
        args: [[{ op: "get", key: "missing" }]],
        expected: [null],
      },
      {
        name: "delete removes",
        args: [
          [
            { op: "set", key: "a", value: 1 },
            { op: "delete", key: "a" },
            { op: "get", key: "a" },
            { op: "size" },
          ],
        ],
        expected: [null, null, null, 0],
      },
      {
        name: "overwrite",
        args: [
          [
            { op: "set", key: "a", value: 1 },
            { op: "set", key: "a", value: 2 },
            { op: "get", key: "a" },
          ],
        ],
        expected: [null, null, 2],
        hidden: true,
      },
    ],
  },

  "exponential-backoff": {
    kind: "python",
    entrypoint: "run_backoff",
    setup: `# Drive the decorated function deterministically (jitter=False, no sleep
# overhead because base_delay is tiny).
_state = {"calls": 0}

def run_backoff(fail_times, max_attempts):
    _state["calls"] = 0

    @exponential_backoff(
        max_attempts=max_attempts,
        base_delay=0.0,
        max_delay=0.0,
        jitter=False,
        exceptions=(IOError,),
    )
    def f():
        _state["calls"] += 1
        if _state["calls"] <= fail_times:
            raise IOError("nope")
        return f"ok-{_state['calls']}"

    try:
        return {"result": f(), "calls": _state["calls"], "raised": False}
    except IOError:
        return {"result": None, "calls": _state["calls"], "raised": True}
`,
    starterCode: `from typing import Type

def exponential_backoff(
    max_attempts: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    exceptions: tuple[Type[Exception], ...] = (Exception,),
):
    """Decorator that retries with exponential backoff and optional jitter.

    Delay between attempts is min(base_delay * 2**attempt, max_delay).
    With jitter, adds random ±50% variance to prevent thundering herd.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "succeeds after 2 failures",
        args: [2, 4],
        expected: { result: "ok-3", calls: 3, raised: false },
      },
      {
        name: "succeeds on first try",
        args: [0, 3],
        expected: { result: "ok-1", calls: 1, raised: false },
      },
      {
        name: "exhausts and raises",
        args: [10, 3],
        expected: { result: null, calls: 3, raised: true },
      },
      {
        name: "single attempt no retry",
        args: [1, 1],
        expected: { result: null, calls: 1, raised: true },
        hidden: true,
      },
    ],
  },

  "dataclass-config-loader": {
    kind: "python",
    entrypoint: "load_pipeline_config",
    setup: `# Wrap load_config so cases can pass a plain dict and receive a plain
# dict back (dataclass instances aren't JSON-comparable directly).
from dataclasses import asdict

def load_pipeline_config(source):
    cfg = load_config(PipelineConfig, source)
    return asdict(cfg)
`,
    starterCode: `from dataclasses import dataclass
from typing import Type, TypeVar

T = TypeVar("T")


@dataclass
class PipelineConfig:
    db_host: str
    db_port: int = 5432
    batch_size: int = 1000
    dry_run: bool = False
    max_retries: int = 3
    output_bucket: str = ""


def load_config(config_cls: Type[T], source: dict = None) -> T:
    """Load and validate a dataclass config from a dict.

    - Type-coerce string values to each field's type
    - Support uppercase env-style keys (DB_HOST -> db_host)
    - Validate db_port in 1-65535 and batch_size > 0
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "all overrides",
        args: [
          {
            db_host: "prod-db.example.com",
            db_port: "5433",
            dry_run: "true",
            batch_size: "500",
          },
        ],
        expected: {
          db_host: "prod-db.example.com",
          db_port: 5433,
          batch_size: 500,
          dry_run: true,
          max_retries: 3,
          output_bucket: "",
        },
      },
      {
        name: "defaults applied",
        args: [{ db_host: "local" }],
        expected: {
          db_host: "local",
          db_port: 5432,
          batch_size: 1000,
          dry_run: false,
          max_retries: 3,
          output_bucket: "",
        },
      },
      {
        name: "bool false",
        args: [{ db_host: "h", dry_run: "false" }],
        expected: {
          db_host: "h",
          db_port: 5432,
          batch_size: 1000,
          dry_run: false,
          max_retries: 3,
          output_bucket: "",
        },
      },
      {
        name: "uppercase env-style key",
        args: [{ DB_HOST: "envhost", DB_PORT: "6000" }],
        expected: {
          db_host: "envhost",
          db_port: 6000,
          batch_size: 1000,
          dry_run: false,
          max_retries: 3,
          output_bucket: "",
        },
        hidden: true,
      },
    ],
  },

  "topological-sort-dag": {
    kind: "python",
    entrypoint: "topo_check",
    setup: `# Topological sort isn't unique. Verify the result is a valid order:
# every task appears once and all deps precede it.
def topo_check(tasks):
    try:
        order = topological_sort(tasks)
    except ValueError:
        return {"ok": False, "cycle": True}
    if sorted(order) != sorted(tasks.keys()):
        return {"ok": False, "cycle": False}
    position = {name: i for i, name in enumerate(order)}
    for task, deps in tasks.items():
        for dep in deps:
            if position[dep] >= position[task]:
                return {"ok": False, "cycle": False}
    return {"ok": True, "cycle": False}
`,
    starterCode: `def topological_sort(tasks: dict[str, list[str]]) -> list[str]:
    """Return a valid execution order for tasks given their dependencies.

    \`tasks\` maps each task name to the list of task names it depends on.
    Raise ValueError on circular dependencies.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "linear DAG",
        args: [
          {
            load_raw: [],
            clean_orders: ["load_raw"],
            clean_customers: ["load_raw"],
            join_tables: ["clean_orders", "clean_customers"],
            create_report: ["join_tables"],
          },
        ],
        expected: { ok: true, cycle: false },
      },
      {
        name: "single node",
        args: [{ a: [] }],
        expected: { ok: true, cycle: false },
      },
      {
        name: "cycle detected",
        args: [{ A: ["B"], B: ["C"], C: ["A"] }],
        expected: { ok: false, cycle: true },
      },
      {
        name: "diamond shape",
        args: [
          {
            a: [],
            b: ["a"],
            c: ["a"],
            d: ["b", "c"],
          },
        ],
        expected: { ok: true, cycle: false },
        hidden: true,
      },
    ],
  },

  "watermark-stateful-processor": {
    kind: "python",
    entrypoint: "run_incremental",
    setup: `# Use a tmp file for state; drive a deterministic mock fetch.
import tempfile
import os

def run_incremental(records, commit_ts):
    tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
    tmp.close()
    try:
        proc = IncrementalProcessor(tmp.name)

        def fetch(since):
            return [r for r in records if r["updated_at"] > since]

        first = proc.get_new_records("orders", fetch)
        proc.commit("orders", commit_ts)

        # Second processor, same file: simulates restart.
        proc2 = IncrementalProcessor(tmp.name)
        second = proc2.get_new_records("orders", fetch)

        return {
            "first_count": len(first),
            "second_count": len(second),
            "watermark_after": proc2.get_watermark("orders"),
        }
    finally:
        try:
            os.remove(tmp.name)
        except OSError:
            pass
`,
    starterCode: `from typing import Callable

class IncrementalProcessor:
    """Tracks per-table watermarks (last-processed timestamps) in a JSON file.

    Survives restarts by persisting watermarks. Thread-safe.
    """

    def __init__(self, state_file: str = "watermarks.json"):
        # TODO: implement
        pass

    def get_watermark(self, table: str) -> str:
        """Return the current watermark for \`table\` (ISO timestamp string)."""
        # TODO: implement
        pass

    def get_new_records(
        self, table: str, fetch_fn: Callable[[str], list[dict]]
    ) -> list[dict]:
        """Call fetch_fn(since=watermark) and return its records."""
        # TODO: implement
        pass

    def commit(self, table: str, max_ts: str) -> None:
        """Advance the watermark to \`max_ts\` and persist."""
        # TODO: implement
        pass`,
    cases: [
      {
        name: "commit halfway, restart picks up rest",
        args: [
          [
            { id: 1, updated_at: "2024-01-01T00:00:00Z" },
            { id: 2, updated_at: "2024-01-02T00:00:00Z" },
            { id: 3, updated_at: "2024-01-03T00:00:00Z" },
          ],
          "2024-01-02T00:00:00Z",
        ],
        expected: {
          first_count: 3,
          second_count: 1,
          watermark_after: "2024-01-02T00:00:00Z",
        },
      },
      {
        name: "commit to latest",
        args: [
          [
            { id: 1, updated_at: "2024-01-01T00:00:00Z" },
            { id: 2, updated_at: "2024-01-02T00:00:00Z" },
          ],
          "2024-01-02T00:00:00Z",
        ],
        expected: {
          first_count: 2,
          second_count: 0,
          watermark_after: "2024-01-02T00:00:00Z",
        },
      },
      {
        name: "no records",
        args: [[], "2024-01-01T00:00:00Z"],
        expected: {
          first_count: 0,
          second_count: 0,
          watermark_after: "2024-01-01T00:00:00Z",
        },
      },
    ],
  },

  "parallel-api-fetcher": {
    kind: "python",
    entrypoint: "run_parallel",
    setup: `# Mock fetch_fn deterministically: urls containing "bad" raise.
def run_parallel(urls):
    def fetch(url):
        if "bad" in url:
            raise ConnectionError(f"failed: {url}")
        return {"url": url, "ok": True}

    results, errors = parallel_fetch(urls, fetch, max_workers=4, timeout=10.0)
    # Order is non-deterministic — sort by url for stable comparison.
    results_sorted = sorted(results, key=lambda r: r["url"])
    errors_sorted = sorted(errors, key=lambda e: e["url"])
    return {
        "results": results_sorted,
        "error_urls": [e["url"] for e in errors_sorted],
        "error_count": len(errors_sorted),
    }
`,
    starterCode: `from typing import Callable

def parallel_fetch(
    urls: list[str],
    fetch_fn: Callable[[str], dict],
    max_workers: int = 10,
    timeout: float = 30.0,
) -> tuple[list[dict], list[dict]]:
    """Fetch each URL concurrently using a thread pool.

    Returns (results, errors). Each error dict includes the offending url.
    Tolerates partial failures.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "mixed success and failure",
        args: [["a", "b", "bad-1", "c", "bad-2"]],
        expected: {
          results: [
            { url: "a", ok: true },
            { url: "b", ok: true },
            { url: "c", ok: true },
          ],
          error_urls: ["bad-1", "bad-2"],
          error_count: 2,
        },
      },
      {
        name: "all succeed",
        args: [["x", "y", "z"]],
        expected: {
          results: [
            { url: "x", ok: true },
            { url: "y", ok: true },
            { url: "z", ok: true },
          ],
          error_urls: [],
          error_count: 0,
        },
      },
      {
        name: "all fail",
        args: [["bad-a", "bad-b"]],
        expected: {
          results: [],
          error_urls: ["bad-a", "bad-b"],
          error_count: 2,
        },
      },
      {
        name: "empty url list",
        args: [[]],
        expected: { results: [], error_urls: [], error_count: 0 },
        hidden: true,
      },
    ],
  },

  "pipeline-runner": {
    kind: "python",
    entrypoint: "run_pipeline",
    setup: `# Build a Pipeline from a recipe of named ops + run it.
def run_pipeline(recipe, data, stop_on_error=True):
    p = Pipeline(stop_on_error=stop_on_error)

    for step in recipe:
        name = step["name"]
        kind = step["kind"]
        if kind == "filter_positive":
            p.add_step(name, lambda recs: [r for r in recs if r["amount"] > 0])
        elif kind == "add_flag":
            p.add_step(name, lambda recs: [{**r, "processed": True} for r in recs])
        elif kind == "double_amount":
            p.add_step(name, lambda recs: [{**r, "amount": r["amount"] * 2} for r in recs])
        elif kind == "boom":
            def boom(_recs):
                raise RuntimeError("step failed")
            p.add_step(name, boom)
        else:
            raise ValueError(f"unknown op: {kind}")

    result = p.run(data)
    return {
        "data": result.data,
        "success": result.success,
        "step_names": [s.name for s in result.steps],
        "step_errors": [s.error for s in result.steps],
    }
`,
    starterCode: `from dataclasses import dataclass, field
from typing import Callable


@dataclass
class StepResult:
    name: str
    error: str | None = None


@dataclass
class PipelineResult:
    data: list
    steps: list[StepResult] = field(default_factory=list)
    success: bool = True


class Pipeline:
    """Composable pipeline that chains transform steps.

    add_step(name, fn) registers a step; run(data) executes them in order,
    passing output of one as input to the next. On error, stop_on_error
    controls whether to halt or continue.
    """

    def __init__(self, stop_on_error: bool = True):
        # TODO: implement
        pass

    def add_step(self, name: str, fn: Callable[[list], list]) -> "Pipeline":
        # TODO: implement
        pass

    def run(self, data: list) -> PipelineResult:
        # TODO: implement
        pass`,
    cases: [
      {
        name: "filter then flag",
        args: [
          [
            { name: "filter", kind: "filter_positive" },
            { name: "flag", kind: "add_flag" },
          ],
          [
            { id: 1, amount: 100 },
            { id: 2, amount: -5 },
            { id: 3, amount: 200 },
          ],
        ],
        expected: {
          data: [
            { id: 1, amount: 100, processed: true },
            { id: 3, amount: 200, processed: true },
          ],
          success: true,
          step_names: ["filter", "flag"],
          step_errors: [null, null],
        },
      },
      {
        name: "stop on error keeps original data",
        args: [
          [
            { name: "double", kind: "double_amount" },
            { name: "kaboom", kind: "boom" },
            { name: "flag", kind: "add_flag" },
          ],
          [{ id: 1, amount: 10 }],
          true,
        ],
        expected: {
          data: [{ id: 1, amount: 10 }],
          success: false,
          step_names: ["double", "kaboom"],
          step_errors: [null, "step failed"],
        },
      },
      {
        name: "single step",
        args: [
          [{ name: "double", kind: "double_amount" }],
          [
            { id: 1, amount: 5 },
            { id: 2, amount: 10 },
          ],
        ],
        expected: {
          data: [
            { id: 1, amount: 10 },
            { id: 2, amount: 20 },
          ],
          success: true,
          step_names: ["double"],
          step_errors: [null],
        },
      },
      {
        name: "no steps passes through",
        args: [[], [{ id: 1 }]],
        expected: {
          data: [{ id: 1 }],
          success: true,
          step_names: [],
          step_errors: [],
        },
        hidden: true,
      },
    ],
  },
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [slug, spec] of Object.entries(PYTHON_TEST_CASES)) {
    const result = await prisma.practiceQuestion.updateMany({
      where: { slug },
      data: { testCases: spec as object },
    });
    if (result.count === 0) {
      console.warn(`  ⚠  ${slug}: no row matches — has the seed run?`);
      skipped++;
      continue;
    }
    console.log(`  ✓ ${slug} (python)`);
    updated++;
  }

  console.log(
    `\nDone. Backfilled ${updated} problems${skipped ? `, ${skipped} skipped` : ""}.`,
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
