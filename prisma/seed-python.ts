import { PrismaClient, PracticeCategory, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const pythonQuestions = [
  // ═══════════════════════════════════════════════
  // EASY (8)
  // ═══════════════════════════════════════════════
  {
    slug: "flatten-nested-json",
    title: "Flatten a Nested JSON Object",
    difficulty: Difficulty.EASY,
    description: `Write a function \`flatten(data, prefix="")\` that takes a **nested dictionary** and returns a **flat dictionary** where nested keys are joined with a dot.

**Example:**
\`\`\`python
input  = {"user": {"id": 1, "address": {"city": "NYC", "zip": "10001"}}, "score": 99}
output = {"user.id": 1, "user.address.city": "NYC", "user.address.zip": "10001", "score": 99}
\`\`\`

Requirements:
- Handle arbitrarily deep nesting
- Leave non-dict values as-is (strings, numbers, lists, None)
- Empty dict values should not produce a key`,
    context: undefined,
    hints: [
      "Use recursion: if a value is a dict, recurse into it with an updated prefix.",
      "Build the new key as f\"{prefix}.{key}\" if prefix exists, else just key.",
      "Base case: if the value is NOT a dict, add it to the result dict.",
    ],
    solution: `def flatten(data: dict, prefix: str = "") -> dict:
    result = {}
    for key, value in data.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict) and value:
            result.update(flatten(value, new_key))
        else:
            result[new_key] = value
    return result


# Test
if __name__ == "__main__":
    data = {
        "user": {
            "id": 1,
            "address": {"city": "NYC", "zip": "10001"}
        },
        "score": 99
    }
    print(flatten(data))
    # {"user.id": 1, "user.address.city": "NYC", "user.address.zip": "10001", "score": 99}`,
    explanation: `Recursive flattening is a fundamental ETL skill — JSON from APIs is almost always nested and needs to land in flat columnar storage. The pattern: iterate keys, build the compound key with dot notation, recurse if the value is a non-empty dict, otherwise write to the result. This exact function (or a close variant) ships in production pipelines for Kafka schema flattening, Salesforce object normalization, and Snowpipe preprocessing.`,
    tags: ["recursion", "json", "dict", "etl"],
    order: 1,
  },
  {
    slug: "group-records-by-key",
    title: "Group a List of Records by Key",
    difficulty: Difficulty.EASY,
    description: `Write a function \`group_by(records, key)\` that groups a list of dictionaries by the value of a given key.

**Example:**
\`\`\`python
records = [
    {"dept": "eng", "name": "Alice"},
    {"dept": "eng", "name": "Bob"},
    {"dept": "hr",  "name": "Carol"},
]
group_by(records, "dept")
# {"eng": [{"dept": "eng", "name": "Alice"}, {"dept": "eng", "name": "Bob"}],
#  "hr":  [{"dept": "hr",  "name": "Carol"}]}
\`\`\`

Requirements:
- Records with a missing key should go into a \`"__missing__"\` group
- Preserve the original order within each group
- Return a regular dict (not defaultdict)`,
    context: undefined,
    hints: [
      "Use a dict to accumulate groups: if the key doesn't exist in the result, initialize it with an empty list.",
      "Use record.get(key, '__missing__') to handle missing keys safely.",
      "collections.defaultdict(list) is a clean alternative, but convert to dict before returning.",
    ],
    solution: `from collections import defaultdict
from typing import Any

def group_by(records: list[dict], key: str) -> dict[Any, list[dict]]:
    groups = defaultdict(list)
    for record in records:
        group_key = record.get(key, "__missing__")
        groups[group_key].append(record)
    return dict(groups)


# Test
if __name__ == "__main__":
    records = [
        {"dept": "eng", "name": "Alice"},
        {"dept": "eng", "name": "Bob"},
        {"dept": "hr",  "name": "Carol"},
        {"name": "Dave"},  # missing 'dept'
    ]
    result = group_by(records, "dept")
    for dept, people in result.items():
        print(f"{dept}: {[p['name'] for p in people]}")`,
    explanation: `Grouping records by key is the Python equivalent of SQL GROUP BY — essential for aggregation before loading into a warehouse. defaultdict(list) avoids the verbose "if key not in dict: dict[key] = []" pattern. Converting to dict() at the end gives a clean return type without defaultdict's surprising auto-creation behavior. In production pipelines this pattern appears constantly for partitioning records before writing to separate Parquet files or Kafka topics.`,
    tags: ["dict", "grouping", "collections", "etl"],
    order: 2,
  },
  {
    slug: "remove-duplicates-preserve-order",
    title: "Remove Duplicates Preserving Order",
    difficulty: Difficulty.EASY,
    description: `Write a function \`deduplicate(items)\` that removes duplicate values from a list while **preserving the insertion order** of the first occurrence.

**Example:**
\`\`\`python
deduplicate([3, 1, 4, 1, 5, 9, 2, 6, 5, 3])
# [3, 1, 4, 5, 9, 2, 6]
\`\`\`

Then write a second version \`deduplicate_dicts(records, key)\` that deduplicates a list of dicts by a given key, keeping the **first occurrence**.`,
    context: undefined,
    hints: [
      "Use a set to track seen values, and only append to the result if not already seen.",
      "Sets in Python have O(1) lookup, making this O(n) overall.",
      "For dicts, extract the key value with record[key] or record.get(key) as the seen tracker.",
    ],
    solution: `def deduplicate(items: list) -> list:
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def deduplicate_dicts(records: list[dict], key: str) -> list[dict]:
    seen = set()
    result = []
    for record in records:
        k = record.get(key)
        if k not in seen:
            seen.add(k)
            result.append(record)
    return result


# dict version using dict.fromkeys() (Python 3.7+ preserves insertion order):
def deduplicate_simple(items: list) -> list:
    return list(dict.fromkeys(items))


# Test
print(deduplicate([3, 1, 4, 1, 5, 9, 2, 6, 5, 3]))
# [3, 1, 4, 5, 9, 2, 6]

records = [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"},
    {"id": 1, "name": "Alice (dupe)"},
]
print(deduplicate_dicts(records, "id"))
# [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]`,
    explanation: `The seen-set pattern is the canonical O(n) deduplication. dict.fromkeys() is the elegant one-liner for primitives (Python 3.7+ dicts preserve insertion order). The dict-key version is what you'd use in a streaming pipeline to deduplicate events by event_id before writing to a sink. Note: if you want to keep the LATEST occurrence instead of first, reverse the list before deduplicating, then reverse the result.`,
    tags: ["set", "deduplication", "list", "etl"],
    order: 3,
  },
  {
    slug: "chunk-list-into-batches",
    title: "Chunk a List into Batches of N",
    difficulty: Difficulty.EASY,
    description: `Write a generator function \`chunked(iterable, size)\` that yields successive sublists of a given size. The last chunk may be smaller if the total isn't evenly divisible.

**Example:**
\`\`\`python
list(chunked(range(10), 3))
# [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]
\`\`\`

Then explain **why a generator is better than returning a list** for large datasets.`,
    context: undefined,
    hints: [
      "Use islice from itertools to slice the iterable N items at a time.",
      "Or use a simple index loop: for i in range(0, len(lst), size): yield lst[i:i+size].",
      "A generator yields chunks lazily — the full list is never held in memory at once.",
    ],
    solution: `from itertools import islice
from typing import Iterable, TypeVar

T = TypeVar("T")

# Generator approach (memory efficient, works on any iterable)
def chunked(iterable: Iterable[T], size: int):
    it = iter(iterable)
    while chunk := list(islice(it, size)):
        yield chunk


# Simple list-based version (requires the full list in memory)
def chunked_list(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


# Why generator is better:
# - Processes one chunk at a time → constant memory usage regardless of input size
# - Works on any iterable (files, DB cursors, streams) not just lists
# - Caller can stop early without processing all chunks


# Test
if __name__ == "__main__":
    print(list(chunked(range(10), 3)))
    # [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]

    # Works on a file line by line:
    # for batch in chunked(open("huge_file.csv"), 1000):
    #     load_to_db(batch)`,
    explanation: `Chunking (batching) is fundamental to every production pipeline — writing to a DB 1 row at a time is 100x slower than batch inserts of 1000 rows. The walrus operator (:=) in "while chunk := list(islice(...))" is Python 3.8+ and makes this very concise. The itertools.islice version is superior to the index-slice version because it works on any iterable — including file handles, DB cursors, and Kafka consumers — not just lists.`,
    tags: ["generator", "iterator", "batching", "itertools", "etl"],
    order: 4,
  },
  {
    slug: "count-field-frequencies",
    title: "Count Value Frequencies Across Records",
    difficulty: Difficulty.EASY,
    description: `Write a function \`value_counts(records, field)\` that counts how often each value of a given field appears across a list of records.

Return a dict sorted by count descending.

**Example:**
\`\`\`python
records = [
    {"country": "US", "plan": "pro"},
    {"country": "UK", "plan": "free"},
    {"country": "US", "plan": "free"},
    {"country": "US", "plan": "enterprise"},
]
value_counts(records, "country")
# {"US": 3, "UK": 1}
\`\`\``,
    context: undefined,
    hints: [
      "Use collections.Counter for the frequency counting.",
      "Counter(record.get(field) for record in records) counts in one line.",
      "Sort with dict(sorted(counter.items(), key=lambda x: x[1], reverse=True)).",
    ],
    solution: `from collections import Counter

def value_counts(records: list[dict], field: str) -> dict:
    counts = Counter(
        record.get(field)
        for record in records
        if record.get(field) is not None  # skip missing values
    )
    return dict(counts.most_common())  # most_common() returns sorted by count desc


# Extended version: top-N
def value_counts_top(records: list[dict], field: str, n: int = None) -> dict:
    counts = Counter(record.get(field) for record in records if field in record)
    return dict(counts.most_common(n))


# Test
records = [
    {"country": "US", "plan": "pro"},
    {"country": "UK", "plan": "free"},
    {"country": "US", "plan": "free"},
    {"country": "US", "plan": "enterprise"},
]
print(value_counts(records, "country"))  # {"US": 3, "UK": 1}
print(value_counts(records, "plan"))     # {"free": 2, "pro": 1, "enterprise": 1}`,
    explanation: `Counter is Python's built-in frequency counter — it's a subclass of dict that counts hashable items. most_common() returns elements sorted by count descending (using a heap internally, so most_common(n) is O(n log k) where k is the number of distinct values). This function is the Python equivalent of SELECT field, COUNT(*) FROM table GROUP BY field ORDER BY 2 DESC.`,
    tags: ["counter", "collections", "aggregation", "frequency"],
    order: 5,
  },
  {
    slug: "safe-nested-dict-access",
    title: "Safe Nested Dictionary Access",
    difficulty: Difficulty.EASY,
    description: `Write a function \`safe_get(data, *keys, default=None)\` that safely retrieves a value from a nested dictionary without raising KeyError or TypeError.

**Example:**
\`\`\`python
data = {"user": {"address": {"city": "NYC"}}}
safe_get(data, "user", "address", "city")   # "NYC"
safe_get(data, "user", "phone", "number")   # None
safe_get(data, "user", "address", "zip", default="N/A")  # "N/A"
\`\`\`

Then write a second version using \`functools.reduce\`.`,
    context: undefined,
    hints: [
      "Iterate through keys, accessing each level with .get() which returns None on a missing key.",
      "If the current value is not a dict (or is None), stop and return the default.",
      "functools.reduce(lambda obj, key: obj.get(key) if isinstance(obj, dict) else None, keys, data)",
    ],
    solution: `from functools import reduce
from typing import Any

def safe_get(data: dict, *keys: str, default: Any = None) -> Any:
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
        if current is None:
            return default
    return current if current is not None else default


# Functional version using reduce
def safe_get_reduce(data: dict, *keys: str, default: Any = None) -> Any:
    def _get(obj, key):
        return obj.get(key) if isinstance(obj, dict) else None
    result = reduce(_get, keys, data)
    return result if result is not None else default


# Test
data = {"user": {"address": {"city": "NYC"}, "scores": [10, 20]}}
print(safe_get(data, "user", "address", "city"))   # "NYC"
print(safe_get(data, "user", "phone", "number"))   # None
print(safe_get(data, "user", "address", "zip", default="N/A"))  # "N/A"
print(safe_get(data, "user", "scores"))            # [10, 20]`,
    explanation: `Safely accessing nested API responses without crashing is one of the most common DE coding patterns. The loop version is explicit and easy to follow in code review. The reduce version is elegant but harder to debug. In production, consider glom or python-box libraries for complex nested access. Note: this function returns default=None when the value IS None vs when the key is missing — if you need to distinguish those cases, you'd use a sentinel object instead of None.`,
    tags: ["dict", "nested", "functional", "error-handling"],
    order: 6,
  },
  {
    slug: "parse-and-sort-dates",
    title: "Parse and Sort ISO Date Strings",
    difficulty: Difficulty.EASY,
    description: `Write a function \`sort_by_date(records, date_field)\` that takes a list of dicts and sorts them by a date field containing **ISO 8601 date strings** (e.g. \`"2024-03-15T10:30:00Z"\`).

**Example:**
\`\`\`python
records = [
    {"id": 1, "ts": "2024-03-15T10:30:00Z"},
    {"id": 2, "ts": "2024-01-01T00:00:00Z"},
    {"id": 3, "ts": "2024-03-15T09:00:00Z"},
]
sort_by_date(records, "ts")
# sorted: id 2, id 3, id 1
\`\`\`

Also handle records where the date field is missing or None (put them last).`,
    context: undefined,
    hints: [
      "Use datetime.fromisoformat() or dateutil.parser.parse() to convert strings to datetime objects.",
      "For the sort key, use a lambda: lambda r: r.get(date_field) or ''.",
      "ISO strings sort correctly as plain strings too (YYYY-MM-DD format), but datetimes are safer.",
    ],
    solution: `from datetime import datetime, timezone
from typing import Optional

def parse_date(date_str: Optional[str]) -> datetime:
    if not date_str:
        return datetime.max.replace(tzinfo=timezone.utc)  # missing dates sort last
    # Handle both 'Z' suffix and '+00:00'
    normalized = date_str.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def sort_by_date(records: list[dict], date_field: str, ascending: bool = True) -> list[dict]:
    return sorted(
        records,
        key=lambda r: parse_date(r.get(date_field)),
        reverse=not ascending,
    )


# Simpler: ISO strings sort correctly as plain strings if format is consistent
def sort_by_date_simple(records: list[dict], date_field: str) -> list[dict]:
    return sorted(records, key=lambda r: r.get(date_field) or "9999")


# Test
records = [
    {"id": 1, "ts": "2024-03-15T10:30:00Z"},
    {"id": 2, "ts": "2024-01-01T00:00:00Z"},
    {"id": 3, "ts": "2024-03-15T09:00:00Z"},
    {"id": 4, "ts": None},
]
for r in sort_by_date(records, "ts"):
    print(r["id"], r["ts"])  # 2, 3, 1, 4`,
    explanation: `datetime.fromisoformat() (Python 3.7+) is the built-in parser for ISO 8601 strings, but it didn't support the 'Z' suffix until Python 3.11 — hence the .replace("Z", "+00:00") normalization. For production pipelines with inconsistent date formats, use dateutil.parser.parse() which handles almost anything. Sorting ISO strings as plain strings works when all strings have the same format and timezone, but converting to datetime objects is safer and handles timezone-aware comparison correctly.`,
    tags: ["datetime", "sorting", "parsing", "etl"],
    order: 7,
  },
  {
    slug: "coerce-record-types",
    title: "Type Coercion for ETL Records",
    difficulty: Difficulty.EASY,
    description: `CSV files load all values as strings. Write a function \`coerce_record(record, schema)\` that converts each field to the type defined in the schema.

**Example:**
\`\`\`python
schema = {
    "id":         int,
    "name":       str,
    "price":      float,
    "is_active":  bool,
    "created_at": "date",
}
record = {"id": "42", "name": "Widget", "price": "9.99", "is_active": "true", "created_at": "2024-03-15"}
coerce_record(record, schema)
# {"id": 42, "name": "Widget", "price": 9.99, "is_active": True, "created_at": date(2024, 3, 15)}
\`\`\`

Handle: missing fields (keep as None), conversion errors (keep as None and log), and the special case of bool (where bool("false") == True in Python!).`,
    context: undefined,
    hints: [
      "For bool, check if the string value is 'true'/'1'/'yes' (case-insensitive) — don't use bool(value) directly.",
      "Wrap each conversion in a try/except to handle bad data without crashing the pipeline.",
      "For 'date', use datetime.date.fromisoformat(value).",
    ],
    solution: `from datetime import date
from typing import Any
import logging

logger = logging.getLogger(__name__)

BOOL_TRUE_VALUES = {"true", "1", "yes", "y", "on"}


def coerce_value(value: str, target_type) -> Any:
    if value is None or value == "":
        return None
    try:
        if target_type == bool:
            return value.strip().lower() in BOOL_TRUE_VALUES
        elif target_type == "date":
            return date.fromisoformat(value.strip())
        else:
            return target_type(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Coercion failed for value={value!r} to {target_type}: {e}")
        return None


def coerce_record(record: dict, schema: dict) -> dict:
    return {
        field: coerce_value(record.get(field), target_type)
        for field, target_type in schema.items()
    }


# Test
schema = {"id": int, "name": str, "price": float, "is_active": bool, "created_at": "date"}
record = {"id": "42", "name": "Widget", "price": "9.99", "is_active": "true", "created_at": "2024-03-15"}
print(coerce_record(record, schema))
# {"id": 42, "name": "Widget", "price": 9.99, "is_active": True, "created_at": date(2024, 3, 15)}`,
    explanation: `This is a core ETL building block. The critical gotcha: bool("false") returns True in Python because any non-empty string is truthy. Always implement boolean parsing by checking the string value explicitly. Wrapping in try/except ensures one bad record doesn't crash the whole pipeline — the value becomes None and gets logged. This pattern scales to a full schema class with Pydantic or dataclasses for production use.`,
    tags: ["type-coercion", "etl", "csv", "error-handling", "schema"],
    order: 8,
  },

  // ═══════════════════════════════════════════════
  // MEDIUM (10)
  // ═══════════════════════════════════════════════
  {
    slug: "retry-decorator",
    title: "Retry Decorator with Max Attempts and Backoff",
    difficulty: Difficulty.MEDIUM,
    description: `Write a decorator \`@retry(max_attempts=3, delay=1.0, exceptions=(Exception,))\` that:
- Retries the decorated function on failure, up to \`max_attempts\` times
- Waits \`delay\` seconds between attempts
- Only retries on the specified exception types
- Re-raises the last exception if all attempts fail
- Logs each retry attempt

**Example usage:**
\`\`\`python
@retry(max_attempts=3, delay=0.5, exceptions=(ConnectionError, TimeoutError))
def fetch_data(url):
    ...  # might raise ConnectionError
\`\`\``,
    context: undefined,
    hints: [
      "A decorator that takes arguments needs three levels of nesting: outer function (takes args) → middle function (takes func) → inner function (takes *args, **kwargs).",
      "Use time.sleep(delay) between retries.",
      "Track attempt number in a loop: for attempt in range(1, max_attempts + 1).",
      "Re-raise with 'raise' (no argument) inside the except block to preserve the original traceback.",
    ],
    solution: `import time
import logging
import functools
from typing import Type

logger = logging.getLogger(__name__)


def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    exceptions: tuple[Type[Exception], ...] = (Exception,),
):
    def decorator(func):
        @functools.wraps(func)  # preserve func name and docstring
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt < max_attempts:
                        logger.warning(
                            f"{func.__name__} failed (attempt {attempt}/{max_attempts}): {e}. "
                            f"Retrying in {delay}s..."
                        )
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {e}"
                        )
            raise last_exc
        return wrapper
    return decorator


# Test
call_count = 0

@retry(max_attempts=3, delay=0, exceptions=(ValueError,))
def flaky_function():
    global call_count
    call_count += 1
    if call_count < 3:
        raise ValueError("Not ready yet")
    return "success"

result = flaky_function()
print(result)       # "success"
print(call_count)   # 3`,
    explanation: `functools.wraps is essential — without it, introspection tools, logging, and Sphinx docs see "wrapper" instead of the real function name. The three-level nesting is the standard pattern for parameterized decorators. In production pipelines, this decorator wraps API calls, database connections, and S3 reads that can transiently fail. The next level up from this is exponential backoff with jitter — see the Hard section.`,
    tags: ["decorator", "retry", "error-handling", "functools"],
    order: 9,
  },
  {
    slug: "batch-file-generator",
    title: "Batch Generator for Large File Processing",
    difficulty: Difficulty.MEDIUM,
    description: `Write a generator function \`read_in_batches(filepath, batch_size=1000)\` that:
- Opens a CSV file and reads it **without loading the whole file into memory**
- Yields lists of parsed row dicts, \`batch_size\` rows at a time
- Handles the header row correctly
- Works for files with **millions of rows**

Then write a \`process_file(filepath)\` function that uses it to print a summary per batch.`,
    context: undefined,
    hints: [
      "Use csv.DictReader which reads one row at a time — it's already lazy.",
      "Combine with your chunked() generator from the Easy section.",
      "Never call list(reader) — that loads the whole file into memory.",
    ],
    solution: `import csv
from itertools import islice
from pathlib import Path


def read_in_batches(filepath: str | Path, batch_size: int = 1000):
    """Yields batches of rows as list[dict], never loading full file in memory."""
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        while True:
            batch = list(islice(reader, batch_size))
            if not batch:
                break
            yield batch


def process_file(filepath: str, batch_size: int = 1000):
    total_rows = 0
    for batch_num, batch in enumerate(read_in_batches(filepath, batch_size), start=1):
        total_rows += len(batch)
        print(f"Batch {batch_num}: {len(batch)} rows (total so far: {total_rows})")
        # process batch here: transform, validate, load to DB, etc.

    print(f"Done. Processed {total_rows} total rows.")


# Memory usage comparison:
# BAD:  rows = list(csv.DictReader(open("10GB_file.csv")))  # OOM
# GOOD: for batch in read_in_batches("10GB_file.csv", 5000): ...  # constant ~5000 rows in memory

# Test: create a small CSV and test
if __name__ == "__main__":
    import io
    sample = "id,name,amount\\n1,Alice,100\\n2,Bob,200\\n3,Carol,300"
    # simulate with StringIO
    reader = csv.DictReader(io.StringIO(sample))
    print(list(reader))`,
    explanation: `csv.DictReader is lazy — it reads one line at a time from the file object. Wrapping it with islice batches those lazy reads into chunks that are then materialized as lists. The while True / break pattern handles the end-of-file cleanly. The context manager (with open) ensures the file is properly closed even if an exception occurs. This pattern is the standard way to process files larger than available RAM — a 100GB CSV file uses only ~batch_size rows worth of memory at any time.`,
    tags: ["generator", "csv", "file-io", "batching", "memory-efficient"],
    order: 10,
  },
  {
    slug: "context-manager-timer",
    title: "Context Manager for Timing and Resource Management",
    difficulty: Difficulty.MEDIUM,
    description: `Write a context manager \`Timer(name)\` that:
- Records the start time on \`__enter__\`
- Prints the elapsed time on \`__exit__\`
- Suppresses no exceptions (re-raises them)
- Returns itself from \`__enter__\` so the caller can access the elapsed time

Then write the same thing using \`@contextlib.contextmanager\`.

**Example usage:**
\`\`\`python
with Timer("load step") as t:
    load_data()
# Prints: "[load step] elapsed: 2.341s"
print(t.elapsed)  # 2.341
\`\`\``,
    context: undefined,
    hints: [
      "Use time.perf_counter() for high-precision timing (better than time.time()).",
      "__enter__ should return self so 'as t' gives access to the Timer object.",
      "__exit__(self, exc_type, exc_val, exc_tb) — return False (or None) to not suppress exceptions.",
      "For the contextmanager version, yield between setup and teardown code.",
    ],
    solution: `import time
from contextlib import contextmanager


class Timer:
    """Context manager that measures elapsed time."""

    def __init__(self, name: str = ""):
        self.name = name
        self.elapsed: float = 0.0
        self._start: float = 0.0

    def __enter__(self):
        self._start = time.perf_counter()
        return self  # allows: with Timer() as t: ... t.elapsed

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.perf_counter() - self._start
        label = f"[{self.name}] " if self.name else ""
        print(f"{label}elapsed: {self.elapsed:.3f}s")
        return False  # don't suppress exceptions


# ── Equivalent using contextlib.contextmanager ───────────────
@contextmanager
def timer(name: str = ""):
    start = time.perf_counter()
    try:
        yield  # code inside 'with' block runs here
    finally:
        elapsed = time.perf_counter() - start
        label = f"[{name}] " if name else ""
        print(f"{label}elapsed: {elapsed:.3f}s")


# Test
with Timer("extract step") as t:
    time.sleep(0.1)  # simulate work
print(f"Recorded: {t.elapsed:.3f}s")

with timer("transform step"):
    time.sleep(0.05)`,
    explanation: `Context managers are tested because they reveal understanding of Python's resource management model. __enter__/__exit__ is the class-based approach; @contextmanager with yield is the cleaner functional approach for simple cases. The try/finally in the contextmanager version ensures cleanup runs even if an exception is raised — this is the same reason you use context managers for file handles and DB connections. perf_counter() is monotonic (won't go backward) and higher resolution than time.time().`,
    tags: ["context-manager", "decorator", "timing", "resource-management"],
    order: 11,
  },
  {
    slug: "deduplicate-by-latest-timestamp",
    title: "Deduplicate Records Keeping Latest by Timestamp",
    difficulty: Difficulty.MEDIUM,
    description: `In a streaming pipeline, the same event can arrive multiple times (at-least-once delivery). Write a function \`keep_latest(records, id_field, ts_field)\` that deduplicates a list of records, **keeping the one with the latest timestamp** for each unique id.

**Example:**
\`\`\`python
records = [
    {"id": 1, "status": "pending",   "updated_at": "2024-03-01T10:00:00Z"},
    {"id": 2, "status": "active",    "updated_at": "2024-03-01T09:00:00Z"},
    {"id": 1, "status": "completed", "updated_at": "2024-03-01T11:00:00Z"},  # dupe, newer
    {"id": 2, "status": "churned",   "updated_at": "2024-03-01T08:00:00Z"},  # dupe, older
]
keep_latest(records, "id", "updated_at")
# [{"id": 1, "status": "completed", ...}, {"id": 2, "status": "active", ...}]
\`\`\``,
    context: undefined,
    hints: [
      "Build a dict keyed by id_field. For each record, keep it only if its timestamp is newer than what's already stored.",
      "Compare timestamp strings directly (ISO format sorts lexicographically correctly).",
      "Or parse to datetime for robust comparison.",
    ],
    solution: `from datetime import datetime, timezone

def parse_ts(ts_str: str) -> datetime:
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

def keep_latest(records: list[dict], id_field: str, ts_field: str) -> list[dict]:
    latest: dict = {}  # id -> record
    for record in records:
        record_id = record[id_field]
        if record_id not in latest:
            latest[record_id] = record
        else:
            existing_ts = parse_ts(latest[record_id][ts_field])
            record_ts   = parse_ts(record[ts_field])
            if record_ts > existing_ts:
                latest[record_id] = record
    return list(latest.values())


# Compact version using sorted + deduplicate:
def keep_latest_sorted(records: list[dict], id_field: str, ts_field: str) -> list[dict]:
    # Sort descending by timestamp, then deduplicate keeping first (= latest)
    sorted_records = sorted(records, key=lambda r: r[ts_field], reverse=True)
    seen = set()
    result = []
    for r in sorted_records:
        if r[id_field] not in seen:
            seen.add(r[id_field])
            result.append(r)
    return result


# Test
records = [
    {"id": 1, "status": "pending",   "updated_at": "2024-03-01T10:00:00Z"},
    {"id": 2, "status": "active",    "updated_at": "2024-03-01T09:00:00Z"},
    {"id": 1, "status": "completed", "updated_at": "2024-03-01T11:00:00Z"},
    {"id": 2, "status": "churned",   "updated_at": "2024-03-01T08:00:00Z"},
]
result = keep_latest(records, "id", "updated_at")
for r in result:
    print(r)`,
    explanation: `This is the Python-side equivalent of the SQL "deduplicate — keep latest" pattern with ROW_NUMBER(). The dict-based approach is O(n) and processes records in a single pass — ideal for streaming. The sorted+deduplicate approach is O(n log n) but more readable. In a Kafka consumer or Flink job, this is called "upsert semantics" — every message with the same key overwrites the previous state if it's newer. The key insight: always compare by parsed datetime, not raw strings, to avoid timezone bugs.`,
    tags: ["deduplication", "datetime", "streaming", "etl", "upsert"],
    order: 12,
  },
  {
    slug: "schema-validator",
    title: "Simple Schema Validator for Incoming Records",
    difficulty: Difficulty.MEDIUM,
    description: `Before loading data into a warehouse, you need to validate it. Write a \`SchemaValidator\` class that:
- Takes a schema: \`{field_name: {"type": type, "required": bool, "nullable": bool}}\`
- Has a \`validate(record)\` method that returns a list of validation errors (empty = valid)
- Has a \`validate_batch(records)\` method that returns \`(valid_records, invalid_records)\`

**Example:**
\`\`\`python
schema = {
    "id":    {"type": int,   "required": True,  "nullable": False},
    "email": {"type": str,   "required": True,  "nullable": False},
    "score": {"type": float, "required": False, "nullable": True},
}
\`\`\``,
    context: undefined,
    hints: [
      "For each field in the schema, check: is it present? is it None when nullable=False? is it the right type?",
      "Build a list of error strings per record — one string per violation.",
      "validate_batch iterates records, calls validate on each, splits into valid/invalid.",
    ],
    solution: `from typing import Any


class SchemaValidator:
    def __init__(self, schema: dict):
        # schema: {field: {"type": type, "required": bool, "nullable": bool}}
        self.schema = schema

    def validate(self, record: dict) -> list[str]:
        errors = []
        for field, rules in self.schema.items():
            required = rules.get("required", True)
            nullable = rules.get("nullable", False)
            expected_type = rules.get("type")
            value = record.get(field)

            if required and field not in record:
                errors.append(f"'{field}' is required but missing")
                continue

            if field not in record:
                continue  # optional and absent — OK

            if value is None:
                if not nullable:
                    errors.append(f"'{field}' is not nullable but got None")
                continue  # None passes type check if nullable

            if expected_type and not isinstance(value, expected_type):
                errors.append(
                    f"'{field}' expected {expected_type.__name__}, got {type(value).__name__} ({value!r})"
                )
        return errors

    def validate_batch(
        self, records: list[dict]
    ) -> tuple[list[dict], list[dict[str, Any]]]:
        valid, invalid = [], []
        for record in records:
            errors = self.validate(record)
            if errors:
                invalid.append({"record": record, "errors": errors})
            else:
                valid.append(record)
        return valid, invalid


# Test
schema = {
    "id":    {"type": int,   "required": True,  "nullable": False},
    "email": {"type": str,   "required": True,  "nullable": False},
    "score": {"type": float, "required": False, "nullable": True},
}
validator = SchemaValidator(schema)

records = [
    {"id": 1, "email": "a@b.com", "score": 9.5},   # valid
    {"id": 2, "email": None},                         # invalid: email not nullable
    {"id": "x", "email": "c@d.com"},                 # invalid: id wrong type
    {"email": "e@f.com"},                             # invalid: id missing
]
valid, invalid = validator.validate_batch(records)
print(f"Valid: {len(valid)}, Invalid: {len(invalid)}")
for inv in invalid:
    print(inv["errors"])`,
    explanation: `Schema validation is the first line of defense in any data pipeline — catching bad data before it corrupts the warehouse. This pattern is what Pydantic, Great Expectations, and dbt tests all implement at a higher level. The key design decisions: validate vs raise (return errors instead of raising exceptions so one bad record doesn't kill the whole batch), and separate valid/invalid paths so bad records can be routed to a dead-letter queue. In interviews, show you think about data quality proactively.`,
    tags: ["validation", "schema", "data-quality", "class", "etl"],
    order: 13,
  },
  {
    slug: "explode-nested-array-field",
    title: "Explode/Unnest a Nested Array Field",
    difficulty: Difficulty.MEDIUM,
    description: `In many APIs, one record contains an array of sub-items. Write a function \`explode(records, array_field)\` that "explodes" records with an array field into **one record per array element**, copying all other fields.

**Example:**
\`\`\`python
records = [
    {"order_id": 1, "customer": "Alice", "items": [{"sku": "A", "qty": 2}, {"sku": "B", "qty": 1}]},
    {"order_id": 2, "customer": "Bob",   "items": [{"sku": "C", "qty": 5}]},
]
explode(records, "items")
# [
#   {"order_id": 1, "customer": "Alice", "sku": "A", "qty": 2},
#   {"order_id": 1, "customer": "Alice", "sku": "B", "qty": 1},
#   {"order_id": 2, "customer": "Bob",   "sku": "C", "qty": 5},
# ]
\`\`\`

This is the Python equivalent of SQL's \`UNNEST()\` or Spark's \`explode()\`.`,
    context: undefined,
    hints: [
      "For each record, get the array field value.",
      "For each element in that array, merge the parent record (minus the array field) with the element dict.",
      "Use {**parent, **child} to merge dicts. If element is not a dict, add it as a key named after array_field.",
    ],
    solution: `def explode(records: list[dict], array_field: str) -> list[dict]:
    result = []
    for record in records:
        items = record.get(array_field, [])
        # Base record without the array field
        base = {k: v for k, v in record.items() if k != array_field}

        if not items:
            # Preserve records with empty arrays (like SQL LEFT JOIN UNNEST)
            result.append(base)
            continue

        for item in items:
            if isinstance(item, dict):
                result.append({**base, **item})
            else:
                # Scalar array element: add as the field name
                result.append({**base, array_field: item})
    return result


# Test
records = [
    {
        "order_id": 1,
        "customer": "Alice",
        "items": [{"sku": "A", "qty": 2}, {"sku": "B", "qty": 1}],
    },
    {"order_id": 2, "customer": "Bob", "items": [{"sku": "C", "qty": 5}]},
    {"order_id": 3, "customer": "Carol", "items": []},  # empty array
]
for r in explode(records, "items"):
    print(r)`,
    explanation: `Exploding nested arrays is one of the most common data transformation operations — APIs return one-to-many relationships as nested arrays, but warehouses want flat tables. {**base, **item} merges two dicts where item's keys override base's if there's a conflict. This is Python's equivalent of Spark's explode() or BigQuery's UNNEST(). The edge case of empty arrays (preserve the parent row) mirrors LEFT JOIN UNNEST behavior in SQL — always ask your interviewer which behavior is expected.`,
    tags: ["explode", "unnest", "nested", "transformation", "etl"],
    order: 14,
  },
  {
    slug: "sliding-window-average",
    title: "Sliding Window Moving Average",
    difficulty: Difficulty.MEDIUM,
    description: `Write a function \`moving_average(values, window)\` that calculates the **moving average** over a list of numbers using a sliding window of size \`window\`.

For positions where fewer than \`window\` data points are available (start of the list), calculate the average of available points.

Also write a version using \`collections.deque\` for efficiency.

**Example:**
\`\`\`python
moving_average([1, 2, 3, 4, 5, 6, 7], window=3)
# [1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0]
\`\`\``,
    context: undefined,
    hints: [
      "Naive: for each index i, take values[max(0, i-window+1):i+1] and average it.",
      "Efficient: use a deque with maxlen=window — appending automatically drops the oldest value.",
      "Running sum: maintain a running sum, subtract the dropped value and add the new one.",
    ],
    solution: `from collections import deque


# Naive O(n*w) — clear but slow for large windows
def moving_average_naive(values: list[float], window: int) -> list[float]:
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        chunk = values[start : i + 1]
        result.append(sum(chunk) / len(chunk))
    return result


# Efficient O(n) using deque — constant time per element
def moving_average(values: list[float], window: int) -> list[float]:
    result = []
    buf = deque(maxlen=window)
    running_sum = 0.0
    for v in values:
        if len(buf) == window:
            running_sum -= buf[0]  # deque will evict buf[0] on next append
        buf.append(v)
        running_sum += v
        result.append(running_sum / len(buf))
    return result


# Test
data = [1, 2, 3, 4, 5, 6, 7]
print(moving_average_naive(data, 3))  # [1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0]
print(moving_average(data, 3))        # same result

# Real-world usage: smooth noisy metrics
daily_dau = [1000, 1100, 950, 1200, 1150, 1300, 1250]
smoothed = moving_average(daily_dau, 7)
print([round(v) for v in smoothed])`,
    explanation: `The deque(maxlen=window) approach is O(n) vs the naive O(n*w) because: deque with maxlen automatically evicts the oldest element on append, and we maintain a running sum so we don't re-sum the window on each step. Just subtract the evicted value, add the new one. The trick is that buf[0] before the append is the element that will be evicted. In production, this same algorithm underlies pandas rolling().mean() and the SQL window AVG with a ROWS frame. For very large n, consider numpy for vectorized computation.`,
    tags: ["sliding-window", "deque", "moving-average", "collections", "optimization"],
    order: 15,
  },
  {
    slug: "paginate-api-results",
    title: "Paginate Through API Results",
    difficulty: Difficulty.MEDIUM,
    description: `Many APIs return paginated results. Write a generator function \`paginate(fetch_page, params={})\` that:
- Calls \`fetch_page(page_num, params)\` repeatedly starting at page 1
- Yields individual records from each page
- Stops when the response indicates no more pages (e.g. \`has_more=False\` or empty results)

The \`fetch_page\` function returns a dict:
\`\`\`python
{"data": [...records...], "has_more": True/False, "next_page": int | None}
\`\`\`

Then write a second version using \`requests\` with a real cursor-based pagination style.`,
    context: undefined,
    hints: [
      "Start with page = 1. Call fetch_page(page, params), yield each record, then check has_more.",
      "Increment page and loop while has_more is True.",
      "A generator is perfect here — the caller doesn't need to know about pagination at all.",
    ],
    solution: `from typing import Callable, Iterator


def paginate(
    fetch_page: Callable,
    params: dict = {},
    start_page: int = 1,
) -> Iterator[dict]:
    """Generator that yields individual records across all pages."""
    page = start_page
    while True:
        response = fetch_page(page, params)
        records = response.get("data", [])

        if not records:
            break  # empty page = done

        yield from records  # yield each record individually

        if not response.get("has_more", False):
            break

        next_page = response.get("next_page")
        page = next_page if next_page is not None else page + 1


# Cursor-based pagination (common in Stripe, GitHub APIs)
def paginate_cursor(fetch_page: Callable, params: dict = {}) -> Iterator[dict]:
    cursor = None
    while True:
        response = fetch_page(cursor=cursor, **params)
        yield from response.get("data", [])
        cursor = response.get("next_cursor")
        if not cursor:
            break


# Test with mock fetch_page
def mock_fetch(page: int, params: dict) -> dict:
    all_data = [{"id": i} for i in range(1, 26)]  # 25 records
    page_size = 10
    start = (page - 1) * page_size
    end = start + page_size
    chunk = all_data[start:end]
    return {"data": chunk, "has_more": end < len(all_data), "next_page": page + 1}

records = list(paginate(mock_fetch))
print(f"Total records fetched: {len(records)}")  # 25`,
    explanation: `"yield from iterable" delegates to another iterable — it's equivalent to "for item in iterable: yield item" but cleaner. This generator completely hides pagination from the caller: they just iterate and get records. This is a widely-used pattern for Salesforce, Stripe, GitHub, and REST APIs. The cursor-based version is more robust than page numbers because adding records to page 1 doesn't shift all subsequent pages. In production, add rate limiting (time.sleep) and retry logic between pages.`,
    tags: ["generator", "pagination", "api", "iterator", "yield-from"],
    order: 16,
  },
  {
    slug: "merge-incremental-state",
    title: "Merge Incremental Records into State",
    difficulty: Difficulty.MEDIUM,
    description: `You're building a stateful streaming processor. Write a function \`apply_upserts(state, updates, key_field)\` that merges a batch of update records into an existing state dictionary.

Rules:
- If the record's key exists in state: **update** all fields from the incoming record
- If the record's key doesn't exist: **insert** it
- If the record has a \`"_deleted": True\` flag: **remove** it from state

Return the updated state dict.

**Example:**
\`\`\`python
state = {1: {"id": 1, "name": "Alice", "plan": "free"}}
updates = [
    {"id": 1, "name": "Alice", "plan": "pro"},       # update
    {"id": 2, "name": "Bob",   "plan": "free"},       # insert
    {"id": 3, "_deleted": True},                      # delete (not in state, no-op)
]
\`\`\``,
    context: undefined,
    hints: [
      "For each update, extract the key value using update[key_field].",
      "Check for '_deleted': True first — if present, pop the key from state.",
      "For inserts/updates: state[key] = {**state.get(key, {}), **update} merges fields.",
    ],
    solution: `def apply_upserts(
    state: dict,
    updates: list[dict],
    key_field: str,
) -> dict:
    for record in updates:
        key = record.get(key_field)
        if key is None:
            continue  # skip records without the key field

        if record.get("_deleted"):
            state.pop(key, None)  # safe delete — no error if key missing
        else:
            # Merge: existing fields + new fields (new fields take precedence)
            existing = state.get(key, {})
            state[key] = {**existing, **record}

    return state


# Test
state = {
    1: {"id": 1, "name": "Alice", "plan": "free"},
    3: {"id": 3, "name": "Carol", "plan": "enterprise"},
}
updates = [
    {"id": 1, "name": "Alice", "plan": "pro"},    # update plan
    {"id": 2, "name": "Bob",   "plan": "free"},    # insert new
    {"id": 3, "_deleted": True},                   # delete Carol
    {"id": 4, "_deleted": True},                   # delete non-existent (no-op)
]
result = apply_upserts(state, updates, key_field="id")
print(result)
# {1: {"id": 1, "name": "Alice", "plan": "pro"},
#  2: {"id": 2, "name": "Bob",   "plan": "free"}}`,
    explanation: `This is the Python-side implementation of a Kafka compacted topic consumer or a database CDC event processor. The {**existing, **record} merge ensures existing fields are preserved while new fields override — matching the semantics of a SQL MERGE. pop(key, None) is the safe delete pattern. In real streaming systems (Flink, Kafka Streams), this state is stored in a RocksDB-backed state store rather than a Python dict, but the logic is identical.`,
    tags: ["streaming", "state", "upsert", "dict", "cdc"],
    order: 17,
  },
  {
    slug: "transform-api-response",
    title: "Transform a Nested API Response",
    difficulty: Difficulty.MEDIUM,
    description: `A third-party API returns the following response structure. Write a function \`normalize_orders(response)\` that transforms it into a flat list of order records suitable for loading into a warehouse.

\`\`\`python
response = {
    "status": "ok",
    "data": {
        "customers": [
            {
                "customer_id": "C1",
                "name": "Alice",
                "orders": [
                    {"order_id": "O1", "amount": 99.0,  "status": "completed", "tags": ["urgent"]},
                    {"order_id": "O2", "amount": 45.0,  "status": "pending",   "tags": []},
                ]
            },
        ]
    }
}
\`\`\`

Output should be a flat list of dicts, one per order, with customer fields included.`,
    context: undefined,
    hints: [
      "Navigate the nested structure with safe_get or direct key access.",
      "Iterate customers, then iterate their orders.",
      "For each order, merge customer-level fields (id, name) with order-level fields.",
      "Join the tags list into a comma-separated string (or leave as-is if your target supports arrays).",
    ],
    solution: `def normalize_orders(response: dict) -> list[dict]:
    if response.get("status") != "ok":
        raise ValueError(f"API error: {response.get('status')}")

    customers = response.get("data", {}).get("customers", [])
    result = []

    for customer in customers:
        customer_id = customer.get("customer_id")
        customer_name = customer.get("name")

        for order in customer.get("orders", []):
            flat_record = {
                # customer fields
                "customer_id":   customer_id,
                "customer_name": customer_name,
                # order fields
                "order_id":      order.get("order_id"),
                "amount":        order.get("amount"),
                "status":        order.get("status"),
                # flatten array → string for SQL compatibility
                "tags":          ",".join(order.get("tags", [])),
            }
            result.append(flat_record)

    return result


# Test
response = {
    "status": "ok",
    "data": {
        "customers": [
            {
                "customer_id": "C1", "name": "Alice",
                "orders": [
                    {"order_id": "O1", "amount": 99.0,  "status": "completed", "tags": ["urgent"]},
                    {"order_id": "O2", "amount": 45.0,  "status": "pending",   "tags": []},
                ],
            },
            {
                "customer_id": "C2", "name": "Bob",
                "orders": [
                    {"order_id": "O3", "amount": 250.0, "status": "completed", "tags": ["vip", "bulk"]},
                ],
            },
        ]
    },
}
for r in normalize_orders(response):
    print(r)`,
    explanation: `API normalization is the "E" in ETL. The key insight is to flatten the hierarchical structure into a relational format: two nested loops (customers → orders) with parent context merged into each child record. Always handle the error status first — failing fast on API errors prevents confusing downstream failures. Tag handling is a real design decision: comma-joining is safe for SQL VARCHAR, but storing as JSON array is better if your warehouse supports ARRAY types (BigQuery, Snowflake, Redshift).`,
    tags: ["api", "json", "transformation", "normalization", "etl"],
    order: 18,
  },

  // ═══════════════════════════════════════════════
  // HARD (7)
  // ═══════════════════════════════════════════════
  {
    slug: "in-memory-cache-with-ttl",
    title: "In-Memory Cache with TTL Expiry",
    difficulty: Difficulty.HARD,
    description: `Implement a \`TTLCache\` class that:
- Stores key-value pairs with a per-entry time-to-live (TTL in seconds)
- On \`get(key)\`: returns the value if not expired, else \`None\` (and removes it)
- On \`set(key, value, ttl)\`: stores the value with the given TTL
- On \`delete(key)\`: removes an entry
- \`size()\`: returns number of non-expired entries
- Thread-safe (use \`threading.Lock\`)

**Example usage:**
\`\`\`python
cache = TTLCache(default_ttl=60)
cache.set("token", "abc123", ttl=10)
cache.get("token")   # "abc123"
time.sleep(11)
cache.get("token")   # None (expired)
\`\`\``,
    context: undefined,
    hints: [
      "Store (value, expiry_timestamp) where expiry = time.monotonic() + ttl.",
      "On get, check if time.monotonic() > expiry — if so, delete and return None.",
      "Wrap all dict operations in a threading.Lock to prevent race conditions.",
    ],
    solution: `import time
import threading
from typing import Any, Optional


class TTLCache:
    def __init__(self, default_ttl: float = 300):
        self.default_ttl = default_ttl
        self._store: dict[str, tuple[Any, float]] = {}  # key → (value, expiry)
        self._lock = threading.Lock()

    def set(self, key: str, value: Any, ttl: float = None) -> None:
        ttl = ttl if ttl is not None else self.default_ttl
        expiry = time.monotonic() + ttl
        with self._lock:
            self._store[key] = (value, expiry)

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return default
            value, expiry = entry
            if time.monotonic() > expiry:
                del self._store[key]
                return default
            return value

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def size(self) -> int:
        now = time.monotonic()
        with self._lock:
            # Evict expired entries and count remaining
            expired = [k for k, (_, exp) in self._store.items() if now > exp]
            for k in expired:
                del self._store[k]
            return len(self._store)

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None


# Test
cache = TTLCache(default_ttl=60)
cache.set("user:1", {"name": "Alice"}, ttl=1)
print(cache.get("user:1"))   # {"name": "Alice"}
time.sleep(1.1)
print(cache.get("user:1"))   # None (expired)
print(cache.size())           # 0`,
    explanation: `This is a real pattern used in every production pipeline — caching API tokens, DB connection strings, or expensive query results. time.monotonic() is used instead of time.time() because it's guaranteed not to go backwards (e.g. after NTP sync). threading.Lock prevents race conditions when multiple threads call get/set concurrently. Note: this implementation has "lazy eviction" (expired entries are only removed when accessed). A production cache would add a background thread that periodically sweeps expired entries to reclaim memory. For distributed caching, this is replaced by Redis.`,
    tags: ["cache", "threading", "ttl", "class", "production-patterns"],
    order: 19,
  },
  {
    slug: "exponential-backoff",
    title: "Exponential Backoff with Jitter",
    difficulty: Difficulty.HARD,
    description: `Implement an \`exponential_backoff\` decorator that:
- Retries on specified exceptions
- Waits \`base_delay * (2 ** attempt)\` seconds between retries (exponential)
- Adds random jitter (±50% of the delay) to prevent thundering herd
- Has a \`max_delay\` cap (e.g. 60 seconds max wait)
- Has \`max_attempts\` total attempts
- Logs each retry with the delay

**Why jitter?** Without it, all failed clients retry at exactly the same time, creating a "thundering herd" that overwhelms the recovering server.`,
    context: undefined,
    hints: [
      "delay = min(base_delay * (2 ** attempt), max_delay)",
      "jitter = random.uniform(-delay * 0.5, delay * 0.5)",
      "sleep_time = max(0, delay + jitter)",
      "Use functools.wraps to preserve the decorated function's metadata.",
    ],
    solution: `import time
import random
import logging
import functools
from typing import Type

logger = logging.getLogger(__name__)


def exponential_backoff(
    max_attempts: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    exceptions: tuple[Type[Exception], ...] = (Exception,),
):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt == max_attempts - 1:
                        break  # last attempt, don't sleep

                    delay = min(base_delay * (2 ** attempt), max_delay)
                    if jitter:
                        delay += random.uniform(-delay * 0.5, delay * 0.5)
                    delay = max(0, delay)  # no negative sleep

                    logger.warning(
                        f"{func.__name__} attempt {attempt + 1}/{max_attempts} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    time.sleep(delay)

            raise last_exc
        return wrapper
    return decorator


# Test
attempt_count = 0

@exponential_backoff(max_attempts=4, base_delay=0.1, jitter=False, exceptions=(IOError,))
def unstable_api():
    global attempt_count
    attempt_count += 1
    if attempt_count < 3:
        raise IOError("Service temporarily unavailable")
    return f"Success on attempt {attempt_count}"

logging.basicConfig(level=logging.WARNING)
print(unstable_api())  # "Success on attempt 3"

# Delay progression without jitter:
# attempt 0 fail → sleep 0.1s
# attempt 1 fail → sleep 0.2s
# attempt 2 pass → return`,
    explanation: `Exponential backoff is the industry-standard retry strategy for transient failures (API rate limits, network blips, overloaded services). The delay schedule: 1s, 2s, 4s, 8s, 16s, ... capped at max_delay. Jitter (random variance) is critical in distributed systems — without it, 1000 clients that all fail at t=0 will all retry at t=1, t=2, etc. in lockstep, causing repeated thundering herds. Full jitter (random.uniform(0, delay)) is actually better than ±50% jitter per AWS research. This is what boto3, requests-retry, and Kafka clients use internally.`,
    tags: ["backoff", "retry", "decorator", "distributed-systems", "production-patterns"],
    order: 20,
  },
  {
    slug: "dataclass-config-loader",
    title: "Type-Safe Config Loader with Dataclasses",
    difficulty: Difficulty.HARD,
    description: `Configuration management is critical in production pipelines. Write a \`load_config\` function that:
- Loads config from a dict (could come from env vars, YAML, or a secrets manager)
- Validates required fields are present
- Type-coerces values (env vars are always strings)
- Returns a typed dataclass instance

\`\`\`python
@dataclass
class PipelineConfig:
    db_host:       str
    db_port:       int = 5432
    batch_size:    int = 1000
    dry_run:       bool = False
    max_retries:   int = 3
    output_bucket: str = ""
\`\`\`

Then add validation (db_port must be 1–65535, batch_size must be > 0).`,
    context: undefined,
    hints: [
      "Use dataclasses.fields() to iterate over a dataclass's fields and their types.",
      "For each field, try to convert the config value to the field's type.",
      "Fields with defaults are optional; fields without defaults are required.",
      "Use dataclasses.field(default=...) for complex defaults.",
    ],
    solution: `from dataclasses import dataclass, fields, field, MISSING
from typing import Any, Type, TypeVar, get_type_hints
import os

T = TypeVar("T")

BOOL_TRUE = {"true", "1", "yes", "on"}


def coerce(value: Any, target_type: Type) -> Any:
    if value is None:
        return None
    if target_type == bool:
        if isinstance(value, bool):
            return value
        return str(value).lower() in BOOL_TRUE
    return target_type(value)


def load_config(config_cls: Type[T], source: dict = None) -> T:
    """Load and validate a dataclass config from a dict (defaults to os.environ)."""
    source = source or dict(os.environ)
    kwargs = {}
    type_hints = get_type_hints(config_cls)

    for f in fields(config_cls):
        env_key = f.name.upper()
        raw_value = source.get(env_key) or source.get(f.name)

        if raw_value is not None:
            try:
                kwargs[f.name] = coerce(raw_value, type_hints[f.name])
            except (ValueError, TypeError) as e:
                raise ValueError(f"Config '{f.name}': cannot convert {raw_value!r} to {type_hints[f.name].__name__}: {e}")
        elif f.default is not MISSING:
            kwargs[f.name] = f.default
        elif f.default_factory is not MISSING:
            kwargs[f.name] = f.default_factory()
        else:
            raise ValueError(f"Required config field '{f.name}' not found in source")

    instance = config_cls(**kwargs)
    validate_config(instance)
    return instance


def validate_config(cfg):
    """Post-load business rule validation."""
    if hasattr(cfg, "db_port") and not (1 <= cfg.db_port <= 65535):
        raise ValueError(f"db_port must be 1–65535, got {cfg.db_port}")
    if hasattr(cfg, "batch_size") and cfg.batch_size <= 0:
        raise ValueError(f"batch_size must be > 0, got {cfg.batch_size}")


@dataclass
class PipelineConfig:
    db_host:       str
    db_port:       int  = 5432
    batch_size:    int  = 1000
    dry_run:       bool = False
    max_retries:   int  = 3
    output_bucket: str  = ""


# Test
config = load_config(PipelineConfig, {
    "db_host": "prod-db.example.com",
    "db_port": "5433",
    "dry_run": "true",
    "batch_size": "500",
})
print(config)
# PipelineConfig(db_host='prod-db.example.com', db_port=5433, batch_size=500, dry_run=True, ...)`,
    explanation: `Type-safe configuration is a hallmark of production-grade pipelines. dataclasses.fields() gives you the field list with metadata at runtime. get_type_hints() resolves forward references and is more reliable than field.type for complex types. The MISSING sentinel from the dataclasses module distinguishes "no default" from "default is None". In production, this pattern is the foundation of tools like Pydantic (BaseSettings), dynaconf, and python-decouple. The key insight: validate config at startup, not at runtime — fail fast if the pipeline is misconfigured.`,
    tags: ["dataclasses", "config", "type-hints", "validation", "production-patterns"],
    order: 21,
  },
  {
    slug: "topological-sort-dag",
    title: "Topological Sort for a Pipeline DAG",
    difficulty: Difficulty.HARD,
    description: `Data pipelines have tasks with dependencies — task B can't run until task A completes. Write a function \`topological_sort(tasks)\` that returns a valid execution order using **Kahn's algorithm**.

\`\`\`python
tasks = {
    "load_raw":        [],                        # no dependencies
    "clean_orders":    ["load_raw"],
    "clean_customers": ["load_raw"],
    "join_tables":     ["clean_orders", "clean_customers"],
    "create_report":   ["join_tables"],
}
topological_sort(tasks)
# One valid order: ["load_raw", "clean_customers", "clean_orders", "join_tables", "create_report"]
\`\`\`

Also detect **circular dependencies** and raise an error.`,
    context: undefined,
    hints: [
      "Kahn's algorithm: start with all tasks that have 0 in-degree (no dependencies).",
      "Process one task at a time, decrementing the in-degree of tasks that depended on it.",
      "When a task's in-degree reaches 0, add it to the queue.",
      "If the result has fewer tasks than the input, there's a cycle.",
    ],
    solution: `from collections import defaultdict, deque


def topological_sort(tasks: dict[str, list[str]]) -> list[str]:
    """
    tasks: {task_name: [dependency1, dependency2, ...]}
    Returns a valid topological order.
    Raises ValueError if a cycle is detected.
    """
    # Build adjacency and in-degree maps
    in_degree = {task: 0 for task in tasks}
    dependents = defaultdict(list)  # dep → [tasks that depend on dep]

    for task, deps in tasks.items():
        for dep in deps:
            if dep not in tasks:
                raise ValueError(f"Unknown dependency: '{dep}' required by '{task}'")
            in_degree[task] += 1
            dependents[dep].append(task)

    # Kahn's algorithm
    queue = deque(task for task, deg in in_degree.items() if deg == 0)
    order = []

    while queue:
        task = queue.popleft()
        order.append(task)
        for dependent in dependents[task]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    if len(order) != len(tasks):
        # Some tasks never reached in-degree 0 → cycle exists
        cycle_tasks = [t for t in tasks if t not in order]
        raise ValueError(f"Circular dependency detected among: {cycle_tasks}")

    return order


# Test
tasks = {
    "load_raw":        [],
    "clean_orders":    ["load_raw"],
    "clean_customers": ["load_raw"],
    "join_tables":     ["clean_orders", "clean_customers"],
    "create_report":   ["join_tables"],
}
print(topological_sort(tasks))

# Cycle detection
cyclic = {"A": ["B"], "B": ["C"], "C": ["A"]}
try:
    topological_sort(cyclic)
except ValueError as e:
    print(e)  # Circular dependency detected among: ['A', 'B', 'C']`,
    explanation: `Topological sort is the algorithm at the heart of every workflow orchestrator — Airflow, Prefect, and dbt all use it to determine task execution order. Kahn's algorithm uses in-degree (number of unsatisfied dependencies) as the core data structure. Starting with 0-in-degree tasks, processing them, and decrementing dependents is both elegant and efficient at O(V + E). The cycle detection is built-in: if the output has fewer tasks than the input, some in-degrees never reached 0 — proving a cycle exists. This question tests graph algorithms, which appear in senior DE interviews.`,
    tags: ["graph", "topological-sort", "dag", "algorithms", "airflow"],
    order: 22,
  },
  {
    slug: "watermark-stateful-processor",
    title: "Stateful Incremental Processor with Watermark",
    difficulty: Difficulty.HARD,
    description: `Build an \`IncrementalProcessor\` class that:
- Tracks the **last processed timestamp** (watermark) per source table
- Has a \`get_new_records(table, fetch_fn)\` method that fetches only records newer than the watermark
- Has a \`commit(table, max_ts)\` method that advances the watermark after successful processing
- Persists watermarks to a JSON file so the pipeline can **resume after crashes**
- Thread-safe

This simulates the watermark pattern used in Spark Structured Streaming, Flink, and dbt incremental models.`,
    context: undefined,
    hints: [
      "Store watermarks as a dict {table_name: iso_timestamp_string} in a JSON file.",
      "get_new_records should call fetch_fn(since=watermark) and return results.",
      "Only commit() after the records have been successfully processed — not before.",
      "Use a threading.Lock for thread safety and json.dump/load for persistence.",
    ],
    solution: `import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Any

EPOCH = "1970-01-01T00:00:00+00:00"


class IncrementalProcessor:
    def __init__(self, state_file: str = "watermarks.json"):
        self.state_file = Path(state_file)
        self._lock = threading.Lock()
        self._watermarks: dict[str, str] = self._load()

    def _load(self) -> dict:
        if self.state_file.exists():
            try:
                return json.loads(self.state_file.read_text())
            except (json.JSONDecodeError, OSError):
                return {}
        return {}

    def _save(self) -> None:
        self.state_file.write_text(json.dumps(self._watermarks, indent=2))

    def get_watermark(self, table: str) -> str:
        with self._lock:
            return self._watermarks.get(table, EPOCH)

    def commit(self, table: str, max_ts: str) -> None:
        """Advance watermark to max_ts after successful processing."""
        with self._lock:
            current = self._watermarks.get(table, EPOCH)
            if max_ts > current:  # ISO strings compare lexicographically
                self._watermarks[table] = max_ts
                self._save()

    def get_new_records(
        self, table: str, fetch_fn: Callable[[str], list[dict]]
    ) -> list[dict]:
        """Fetch records newer than the current watermark."""
        watermark = self.get_watermark(table)
        return fetch_fn(watermark)

    def process_table(
        self,
        table: str,
        fetch_fn: Callable[[str], list[dict]],
        transform_fn: Callable[[list[dict]], list[dict]],
        load_fn: Callable[[list[dict]], None],
        ts_field: str = "updated_at",
    ) -> int:
        """Full extract → transform → load → commit cycle."""
        records = self.get_new_records(table, fetch_fn)
        if not records:
            return 0

        transformed = transform_fn(records)
        load_fn(transformed)

        # Only commit AFTER successful load
        max_ts = max(r[ts_field] for r in records if r.get(ts_field))
        self.commit(table, max_ts)
        return len(records)


# Test
processor = IncrementalProcessor("/tmp/test_watermarks.json")

def mock_fetch(since: str) -> list[dict]:
    all_records = [
        {"id": 1, "val": "a", "updated_at": "2024-01-01T00:00:00Z"},
        {"id": 2, "val": "b", "updated_at": "2024-01-02T00:00:00Z"},
        {"id": 3, "val": "c", "updated_at": "2024-01-03T00:00:00Z"},
    ]
    return [r for r in all_records if r["updated_at"] > since]

# First run: gets all 3 records
records = processor.get_new_records("orders", mock_fetch)
print(f"Got {len(records)} records")  # 3
processor.commit("orders", "2024-01-02T00:00:00Z")  # commit up to Jan 2

# Second run: only gets Jan 3 record
records = processor.get_new_records("orders", mock_fetch)
print(f"Got {len(records)} records")  # 1`,
    explanation: `This is the exact pattern used in Spark Structured Streaming (StreamingQuery watermarks), Flink (ProcessingTime watermarks), and dbt incremental models (is_incremental() macro). The critical design decision: commit AFTER load, never before. If commit happens before load and the load fails, you lose those records forever — the watermark already moved past them. ISO string comparison works for lexicographic ordering because the format is YYYY-MM-DDThh:mm:ss — alphabetically ordered = chronologically ordered. In production, the state file would be in S3 or a database for durability and sharing across workers.`,
    tags: ["streaming", "watermark", "stateful", "incremental", "production-patterns"],
    order: 23,
  },
  {
    slug: "parallel-api-fetcher",
    title: "Parallel API Fetcher with ThreadPoolExecutor",
    difficulty: Difficulty.HARD,
    description: `You need to fetch data from 50 API endpoints. Sequential fetching takes 50 seconds (1s/endpoint). Write a \`parallel_fetch(urls, max_workers=10)\` function that fetches them concurrently.

Use \`concurrent.futures.ThreadPoolExecutor\`. Handle:
- Partial failures (some URLs fail, others succeed)
- Timeouts per request
- Merging all results into a single list

Return: \`(results: list[dict], errors: list[dict])\` where errors include the URL and error message.`,
    context: undefined,
    hints: [
      "Use executor.map() for simple cases, but submit() gives more control over exceptions.",
      "With submit(), use {future: url for url, future in ...} to map futures back to their URLs.",
      "Use as_completed() to process futures as they finish rather than in submission order.",
    ],
    solution: `import concurrent.futures
import time
import random
from typing import Callable


def parallel_fetch(
    urls: list[str],
    fetch_fn: Callable[[str], dict],
    max_workers: int = 10,
    timeout: float = 30.0,
) -> tuple[list[dict], list[dict]]:
    results = []
    errors = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks and track which URL each future belongs to
        future_to_url = {
            executor.submit(fetch_fn, url): url for url in urls
        }

        for future in concurrent.futures.as_completed(future_to_url, timeout=timeout):
            url = future_to_url[future]
            try:
                data = future.result()
                results.append(data)
            except Exception as e:
                errors.append({"url": url, "error": str(e), "error_type": type(e).__name__})

    return results, errors


# Test with mock fetch function
def mock_fetch(url: str) -> dict:
    time.sleep(random.uniform(0.01, 0.1))  # simulate network latency
    if "bad" in url:
        raise ConnectionError(f"Failed to connect to {url}")
    return {"url": url, "data": f"result from {url}"}


urls = [f"https://api.example.com/data/{i}" for i in range(20)]
urls.append("https://bad.example.com/data")  # one failure

start = time.perf_counter()
results, errors = parallel_fetch(urls, mock_fetch, max_workers=10)
elapsed = time.perf_counter() - start

print(f"Success: {len(results)}, Errors: {len(errors)}, Time: {elapsed:.2f}s")
# vs sequential which would take sum(all latencies) ≈ 1s+ instead of ~0.2s`,
    explanation: `ThreadPoolExecutor is ideal for I/O-bound work (API calls, file reads) where Python's GIL doesn't matter — threads are blocked on network I/O, not CPU. The future_to_url pattern is the standard way to map results back to their inputs when using submit(). as_completed() processes futures as they finish (not in submission order), giving faster overall throughput. For CPU-bound work, use ProcessPoolExecutor instead. In production data pipelines, this pattern is used for parallel ingestion of multiple API sources, parallel S3 reads, and fan-out enrichment calls.`,
    tags: ["concurrency", "threading", "threadpool", "api", "performance"],
    order: 24,
  },
  {
    slug: "pipeline-runner",
    title: "Composable ETL Pipeline Runner",
    difficulty: Difficulty.HARD,
    description: `Build a \`Pipeline\` class that chains transform functions together, passing data through each step sequentially.

Requirements:
- \`pipeline.add_step(name, fn)\` registers a transform step
- \`pipeline.run(data)\` executes all steps in order, passing output of one as input to next
- Collect timing per step and any errors
- Optionally: stop on first error vs continue with remaining steps
- Return a \`PipelineResult\` dataclass with records, timings, and errors

**Example:**
\`\`\`python
pipeline = Pipeline()
pipeline.add_step("filter", lambda recs: [r for r in recs if r["amount"] > 0])
pipeline.add_step("enrich", add_date_column)
pipeline.add_step("validate", validate_schema)
result = pipeline.run(raw_records)
\`\`\``,
    context: undefined,
    hints: [
      "Store steps as a list of (name, fn) tuples.",
      "In run(), loop through steps: data = step_fn(data) and track time per step.",
      "Use a dataclass for PipelineResult with fields: data, step_timings, errors, success.",
    ],
    solution: `import time
import logging
from dataclasses import dataclass, field
from typing import Callable, Any

logger = logging.getLogger(__name__)


@dataclass
class StepResult:
    name: str
    elapsed_ms: float
    input_count: int
    output_count: int
    error: str | None = None


@dataclass
class PipelineResult:
    data: list
    steps: list[StepResult] = field(default_factory=list)
    success: bool = True

    def summary(self) -> str:
        lines = [f"Pipeline {'SUCCEEDED' if self.success else 'FAILED'}"]
        for step in self.steps:
            status = "ERROR" if step.error else "OK"
            lines.append(
                f"  [{status}] {step.name}: {step.input_count}→{step.output_count} rows "
                f"({step.elapsed_ms:.1f}ms)"
            )
            if step.error:
                lines.append(f"         Error: {step.error}")
        return "\\n".join(lines)


class Pipeline:
    def __init__(self, stop_on_error: bool = True):
        self.stop_on_error = stop_on_error
        self._steps: list[tuple[str, Callable]] = []

    def add_step(self, name: str, fn: Callable[[list], list]) -> "Pipeline":
        self._steps.append((name, fn))
        return self  # enables chaining: pipeline.add_step(...).add_step(...)

    def run(self, data: list) -> PipelineResult:
        result = PipelineResult(data=data)
        current_data = data

        for name, fn in self._steps:
            input_count = len(current_data) if hasattr(current_data, "__len__") else -1
            start = time.perf_counter()
            try:
                current_data = fn(current_data)
                elapsed_ms = (time.perf_counter() - start) * 1000
                output_count = len(current_data) if hasattr(current_data, "__len__") else -1
                result.steps.append(StepResult(name, elapsed_ms, input_count, output_count))
            except Exception as e:
                elapsed_ms = (time.perf_counter() - start) * 1000
                result.steps.append(StepResult(name, elapsed_ms, input_count, 0, error=str(e)))
                result.success = False
                logger.error(f"Pipeline step '{name}' failed: {e}")
                if self.stop_on_error:
                    break

        result.data = current_data if result.success else data
        return result


# Test
raw_data = [
    {"id": 1, "amount": 100, "status": "completed"},
    {"id": 2, "amount": -5,  "status": "error"},
    {"id": 3, "amount": 200, "status": "completed"},
]

pipeline = (
    Pipeline()
    .add_step("filter_positive", lambda recs: [r for r in recs if r["amount"] > 0])
    .add_step("add_flag",        lambda recs: [{**r, "processed": True} for r in recs])
)

result = pipeline.run(raw_data)
print(result.summary())
print(result.data)`,
    explanation: `The composable pipeline pattern is the foundation of every ETL framework — dbt, Spark, Beam, Luigi all implement this at scale. Return self from add_step() enables fluent chaining. Separating data flow from error tracking keeps the run loop clean. The critical design decision: stop_on_error=True prevents corrupted intermediate data from cascading; stop_on_error=False is useful for validation pipelines where you want to see all failures. In production, extend this with: async steps, parallel steps, checkpointing, and distributed execution.`,
    tags: ["pipeline", "etl", "design-patterns", "dataclass", "functional"],
    order: 25,
  },
];

async function main() {
  console.log("🌱 Seeding Python practice questions...");

  for (const q of pythonQuestions) {
    await prisma.practiceQuestion.upsert({
      where: { slug: q.slug },
      update: {
        title: q.title,
        difficulty: q.difficulty,
        description: q.description,
        context: q.context ?? null,
        hints: q.hints,
        solution: q.solution,
        explanation: q.explanation,
        tags: q.tags,
        order: q.order,
      },
      create: {
        ...q,
        category: PracticeCategory.PYTHON,
        context: q.context ?? null,
      },
    });
  }

  console.log(`✅ Seeded ${pythonQuestions.length} Python practice questions.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
