/**
 * seed-practice-test-cases-algorithms.ts
 *
 * Backfills `PracticeQuestion.testCases` for the 40 algorithm problems in
 * seed-algorithms.ts. Companion to seed-practice-test-cases.ts (the demo
 * set) — this is the full algorithms pass.
 *
 * Each spec is a PythonTestSpec (kind: "python") with an entrypoint and a
 * list of {args, expected} cases. Hidden cases (revealed only after the
 * user has run their solution at least once) provide anti-overfit
 * coverage of edge cases.
 *
 * For problems whose natural input/output is a non-JSON-serializable
 * structure (linked lists, binary trees, graphs, in-place mutations,
 * class-based stateful APIs), we use the `setup` field to define a
 * wrapper function that:
 *   - takes JSON-serializable args (e.g. level-order list for trees,
 *     plain list for linked lists, list-of-events for class APIs),
 *   - constructs the real input,
 *   - calls the user's solution,
 *   - converts the result back to a JSON-serializable shape.
 * The TestSpec entrypoint is the wrapper, not the user's function. The
 * runner concatenates `setup` after the user's code, so the user's
 * symbol (e.g. reverse_list, invert_tree, Trie) is in scope.
 *
 * Run with:
 *   npx tsx prisma/seed-practice-test-cases-algorithms.ts
 *
 * Idempotent: matches by slug, overwrites testCases. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Reusable Python helpers (setup blocks) ─────────────────────────────
//
// These are appended after the user's code, so the user's class
// definitions (ListNode, TreeNode, Node, Trie, KthLargest) are in scope.
// We re-bind helpers to those user types via the `globals()` lookup
// trick — but in practice the user's definitions match the canonical
// shape, so we just reuse the user's classes directly.

const LINKED_LIST_HELPERS = `
def _list_to_linked(values):
    if not values:
        return None
    head = ListNode(values[0])
    curr = head
    for v in values[1:]:
        curr.next = ListNode(v)
        curr = curr.next
    return head

def _linked_to_list(head):
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out
`;

const TREE_HELPERS = `
from collections import deque as _deque

def _list_to_tree(values):
    """Build a binary tree from a level-order list with None for missing nodes."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    q = _deque([root])
    i = 1
    while q and i < len(values):
        node = q.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            q.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            q.append(node.right)
        i += 1
    return root

def _tree_to_list(root):
    """Convert tree back to level-order list with None for missing nodes.
    Trailing Nones are stripped to match LeetCode convention."""
    if root is None:
        return []
    out = []
    q = _deque([root])
    while q:
        node = q.popleft()
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            q.append(node.left)
            q.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out
`;

// ── Python / Algorithms test cases ─────────────────────────────────────

const PYTHON_TEST_CASES: Record<string, unknown> = {
  // ── ARRAYS / HASHING ────────────────────────────────────────────────

  "two-sum": {
    kind: "python",
    entrypoint: "two_sum",
    starterCode: `from typing import List

def two_sum(nums: List[int], target: int) -> List[int]:
    """Return indices [i, j] (i<j) of the two numbers that add up to target.

    You may assume exactly one solution exists.
    """
    # TODO: implement
    pass`,
    // Reference solution returns indices in ascending order [i, j] with i<j.
    cases: [
      { name: "basic", args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { name: "middle", args: [[3, 2, 4], 6], expected: [1, 2] },
      { name: "two element", args: [[3, 3], 6], expected: [0, 1] },
      { name: "negatives", args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      { name: "with zero", args: [[0, 4, 3, 0], 0], expected: [0, 3] },
      { name: "large list", args: [[5, 75, 25, 1, 100, 50], 125], expected: [1, 4], hidden: true },
    ],
  },

  "valid-anagram": {
    kind: "python",
    entrypoint: "is_anagram",
    starterCode: `def is_anagram(s: str, t: str) -> bool:
    """Return True if t is an anagram of s (same characters, same counts)."""
    # TODO: implement
    pass`,
    cases: [
      { name: "true", args: ["anagram", "nagaram"], expected: true },
      { name: "false same length", args: ["rat", "car"], expected: false },
      { name: "different lengths", args: ["abc", "abcd"], expected: false },
      { name: "both empty", args: ["", ""], expected: true },
      { name: "one empty", args: ["a", ""], expected: false },
      { name: "repeated char mismatch", args: ["aacc", "ccac"], expected: false, hidden: true },
    ],
  },

  "contains-duplicate": {
    kind: "python",
    entrypoint: "contains_duplicate",
    starterCode: `from typing import List

def contains_duplicate(nums: List[int]) -> bool:
    """Return True if any value appears at least twice in nums."""
    # TODO: implement
    pass`,
    cases: [
      { name: "has dup", args: [[1, 2, 3, 1]], expected: true },
      { name: "all unique", args: [[1, 2, 3, 4]], expected: false },
      { name: "single element", args: [[42]], expected: false },
      { name: "empty", args: [[]], expected: false },
      { name: "all same", args: [[1, 1, 1, 1]], expected: true },
      {
        name: "negatives + duplicate",
        args: [[-1, -2, -3, -2]],
        expected: true,
        hidden: true,
      },
    ],
  },

  "group-anagrams": {
    kind: "python",
    // Wrap to canonicalize: sort each group + sort groups so the test is
    // order-independent (group order and within-group order both vary).
    entrypoint: "_group_anagrams_canonical",
    starterCode: `from typing import List

def group_anagrams(strs: List[str]) -> List[List[str]]:
    """Group strings that are anagrams of each other.

    Order of groups and order within each group is unspecified.
    """
    # TODO: implement
    pass`,
    setup: `
def _group_anagrams_canonical(strs):
    groups = group_anagrams(strs)
    return sorted([sorted(g) for g in groups])
`,
    cases: [
      {
        name: "classic",
        args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
        expected: [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]],
      },
      { name: "empty list", args: [[]], expected: [] },
      { name: "single string", args: [["abc"]], expected: [["abc"]] },
      {
        name: "all anagrams",
        args: [["abc", "bca", "cab"]],
        expected: [["abc", "bca", "cab"]],
      },
      {
        name: "no anagrams",
        args: [["abc", "def", "ghi"]],
        expected: [["abc"], ["def"], ["ghi"]],
      },
      {
        name: "with empty strings",
        args: [["", "", "a"]],
        expected: [["", ""], ["a"]],
        hidden: true,
      },
    ],
  },

  "top-k-frequent-elements-bucket-sort": {
    kind: "python",
    // Order is unspecified — sort the result for comparison.
    entrypoint: "_top_k_sorted",
    starterCode: `from typing import List

def top_k_frequent(nums: List[int], k: int) -> List[int]:
    """Return the k most frequent elements (any order)."""
    # TODO: implement
    pass`,
    setup: `
def _top_k_sorted(nums, k):
    return sorted(top_k_frequent(nums, k))
`,
    cases: [
      { name: "k=2", args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
      { name: "k=1 single", args: [[1], 1], expected: [1] },
      {
        name: "all unique k=all",
        args: [[1, 2, 3, 4], 4],
        expected: [1, 2, 3, 4],
      },
      {
        name: "negatives",
        args: [[-1, -1, -2, -2, -2, 3], 2],
        expected: [-2, -1],
      },
      {
        name: "ties",
        args: [[4, 4, 5, 5, 6], 2],
        expected: [4, 5],
        hidden: true,
      },
    ],
  },

  "product-of-array-except-self": {
    kind: "python",
    entrypoint: "product_except_self",
    starterCode: `from typing import List

def product_except_self(nums: List[int]) -> List[int]:
    """Return an array where output[i] = product of all nums except nums[i].

    Solve without division and in O(n) time.
    """
    # TODO: implement
    pass`,
    cases: [
      { name: "basic", args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { name: "with zero", args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { name: "two elements", args: [[2, 3]], expected: [3, 2] },
      { name: "all ones", args: [[1, 1, 1, 1]], expected: [1, 1, 1, 1] },
      {
        name: "two zeros (all zero out)",
        args: [[0, 0, 4, 5]],
        expected: [0, 0, 0, 0],
        hidden: true,
      },
      {
        name: "negatives",
        args: [[-2, -3, -4]],
        expected: [12, 8, 6],
      },
    ],
  },

  // ── TWO POINTERS ────────────────────────────────────────────────────

  "valid-palindrome": {
    kind: "python",
    entrypoint: "is_palindrome",
    starterCode: `def is_palindrome(s: str) -> bool:
    """Return True if s is a palindrome considering only alphanumeric chars,
    case-insensitive.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "panama",
        args: ["A man, a plan, a canal: Panama"],
        expected: true,
      },
      { name: "race a car", args: ["race a car"], expected: false },
      { name: "empty", args: [""], expected: true },
      { name: "single char", args: ["a"], expected: true },
      { name: "only punctuation", args: [".,!?"], expected: true },
      { name: "mixed case", args: ["0P"], expected: false, hidden: true },
    ],
  },

  "two-sum-ii-sorted": {
    kind: "python",
    entrypoint: "two_sum_sorted",
    starterCode: `from typing import List

def two_sum_sorted(numbers: List[int], target: int) -> List[int]:
    """Given a 1-indexed sorted array, return [i, j] (i<j) such that
    numbers[i-1] + numbers[j-1] == target.
    """
    # TODO: implement
    pass`,
    // Returns 1-indexed [i, j] with i<j.
    cases: [
      { name: "basic", args: [[2, 7, 11, 15], 9], expected: [1, 2] },
      { name: "ends", args: [[2, 3, 4], 6], expected: [1, 3] },
      { name: "two elements", args: [[1, 2], 3], expected: [1, 2] },
      { name: "negatives", args: [[-3, -1, 0, 2, 5], -1], expected: [2, 4] },
      {
        name: "duplicates",
        args: [[1, 2, 3, 4, 4, 9, 56, 90], 8],
        expected: [4, 5],
        hidden: true,
      },
    ],
  },

  "three-sum": {
    kind: "python",
    // Reference solution returns triplets in sorted order; canonicalize
    // for the test (sort triplets + sort outer list).
    entrypoint: "_three_sum_canonical",
    starterCode: `from typing import List

def three_sum(nums: List[int]) -> List[List[int]]:
    """Return all unique triplets [a, b, c] with a + b + c == 0."""
    # TODO: implement
    pass`,
    setup: `
def _three_sum_canonical(nums):
    return sorted([sorted(t) for t in three_sum(nums)])
`,
    cases: [
      {
        name: "basic",
        args: [[-1, 0, 1, 2, -1, -4]],
        expected: [[-1, -1, 2], [-1, 0, 1]],
      },
      { name: "no solution", args: [[0, 1, 1]], expected: [] },
      { name: "all zeros", args: [[0, 0, 0]], expected: [[0, 0, 0]] },
      { name: "empty", args: [[]], expected: [] },
      { name: "two elements", args: [[1, 2]], expected: [] },
      {
        name: "many duplicates",
        args: [[-2, 0, 0, 2, 2]],
        expected: [[-2, 0, 2]],
        hidden: true,
      },
    ],
  },

  // ── SLIDING WINDOW ──────────────────────────────────────────────────

  "best-time-to-buy-sell-stock": {
    kind: "python",
    entrypoint: "max_profit",
    starterCode: `from typing import List

def max_profit(prices: List[int]) -> int:
    """Return the max profit from a single buy/sell of a stock,
    where prices[i] is the price on day i.
    """
    # TODO: implement
    pass`,
    cases: [
      { name: "basic", args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { name: "monotone decreasing", args: [[7, 6, 4, 3, 1]], expected: 0 },
      { name: "single day", args: [[5]], expected: 0 },
      { name: "empty", args: [[]], expected: 0 },
      { name: "two days profit", args: [[1, 2]], expected: 1 },
      {
        name: "min then climb",
        args: [[3, 2, 6, 5, 0, 3]],
        expected: 4,
        hidden: true,
      },
    ],
  },

  "longest-substring-without-repeating": {
    kind: "python",
    entrypoint: "length_of_longest_substring",
    starterCode: `def length_of_longest_substring(s: str) -> int:
    """Return the length of the longest substring of s without repeating
    characters.
    """
    # TODO: implement
    pass`,
    cases: [
      { name: "abcabcbb", args: ["abcabcbb"], expected: 3 },
      { name: "bbbbb", args: ["bbbbb"], expected: 1 },
      { name: "pwwkew", args: ["pwwkew"], expected: 3 },
      { name: "empty", args: [""], expected: 0 },
      { name: "all unique", args: ["abcdef"], expected: 6 },
      { name: "with spaces", args: ["dvdf"], expected: 3, hidden: true },
    ],
  },

  "minimum-window-substring": {
    kind: "python",
    entrypoint: "min_window",
    starterCode: `def min_window(s: str, t: str) -> str:
    """Return the minimum window substring of s containing every character
    of t (with multiplicity). Return "" if no such window exists.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "classic",
        args: ["ADOBECODEBANC", "ABC"],
        expected: "BANC",
      },
      { name: "no window", args: ["a", "aa"], expected: "" },
      { name: "exact", args: ["a", "a"], expected: "a" },
      { name: "duplicate in t", args: ["aa", "aa"], expected: "aa" },
      { name: "empty s", args: ["", "a"], expected: "" },
      {
        name: "t longer than s",
        args: ["ab", "abc"],
        expected: "",
        hidden: true,
      },
    ],
  },

  // ── STACK ───────────────────────────────────────────────────────────

  "valid-parentheses": {
    kind: "python",
    entrypoint: "is_valid",
    starterCode: `def is_valid(s: str) -> bool:
    """Return True if s is a valid sequence of brackets ()[]{}."""
    # TODO: implement
    pass`,
    cases: [
      { name: "simple", args: ["()"], expected: true },
      { name: "all kinds", args: ["()[]{}"], expected: true },
      { name: "mismatch", args: ["(]"], expected: false },
      { name: "interleaved", args: ["([)]"], expected: false },
      { name: "nested", args: ["{[]}"], expected: true },
      { name: "empty", args: [""], expected: true },
      { name: "single open", args: ["("], expected: false, hidden: true },
      { name: "single close", args: [")"], expected: false, hidden: true },
    ],
  },

  "daily-temperatures": {
    kind: "python",
    entrypoint: "daily_temperatures",
    starterCode: `from typing import List

def daily_temperatures(temperatures: List[int]) -> List[int]:
    """For each day, return the number of days until a warmer temperature.
    If none exists, use 0.
    """
    # TODO: implement
    pass`,
    cases: [
      {
        name: "classic",
        args: [[73, 74, 75, 71, 69, 72, 76, 73]],
        expected: [1, 1, 4, 2, 1, 1, 0, 0],
      },
      {
        name: "monotone increasing",
        args: [[30, 40, 50, 60]],
        expected: [1, 1, 1, 0],
      },
      {
        name: "monotone decreasing",
        args: [[50, 40, 30]],
        expected: [0, 0, 0],
      },
      { name: "single", args: [[30]], expected: [0] },
      { name: "all same", args: [[30, 30, 30]], expected: [0, 0, 0] },
      {
        name: "alternating",
        args: [[30, 60, 90]],
        expected: [1, 1, 0],
        hidden: true,
      },
    ],
  },

  // ── BINARY SEARCH ───────────────────────────────────────────────────

  "binary-search": {
    kind: "python",
    entrypoint: "binary_search",
    starterCode: `from typing import List

def binary_search(nums: List[int], target: int) -> int:
    """Return the index of target in the sorted array nums, or -1 if absent."""
    # TODO: implement
    pass`,
    cases: [
      { name: "found middle", args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { name: "not found", args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { name: "first", args: [[1, 2, 3, 4, 5], 1], expected: 0 },
      { name: "last", args: [[1, 2, 3, 4, 5], 5], expected: 4 },
      { name: "single found", args: [[5], 5], expected: 0 },
      { name: "single not found", args: [[5], 3], expected: -1 },
      { name: "empty", args: [[], 5], expected: -1, hidden: true },
    ],
  },

  "find-min-in-rotated-sorted-array": {
    kind: "python",
    entrypoint: "find_min",
    starterCode: `from typing import List

def find_min(nums: List[int]) -> int:
    """Return the minimum element in a rotated sorted array (no duplicates)."""
    # TODO: implement
    pass`,
    cases: [
      { name: "small rotation", args: [[3, 4, 5, 1, 2]], expected: 1 },
      { name: "larger rotation", args: [[4, 5, 6, 7, 0, 1, 2]], expected: 0 },
      { name: "no rotation", args: [[11, 13, 15, 17]], expected: 11 },
      { name: "single", args: [[1]], expected: 1 },
      { name: "two ascending", args: [[1, 2]], expected: 1 },
      { name: "two rotated", args: [[2, 1]], expected: 1 },
      {
        name: "rotation by 1",
        args: [[5, 1, 2, 3, 4]],
        expected: 1,
        hidden: true,
      },
    ],
  },

  "search-in-rotated-sorted-array": {
    kind: "python",
    entrypoint: "search",
    starterCode: `from typing import List

def search(nums: List[int], target: int) -> int:
    """Return index of target in a rotated sorted array, or -1 if absent.
    Must run in O(log n).
    """
    # TODO: implement
    pass`,
    cases: [
      { name: "found in right", args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { name: "not found", args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { name: "found in left", args: [[4, 5, 6, 7, 0, 1, 2], 5], expected: 1 },
      { name: "single found", args: [[1], 1], expected: 0 },
      { name: "single not found", args: [[1], 0], expected: -1 },
      { name: "no rotation", args: [[1, 2, 3, 4, 5], 4], expected: 3 },
      {
        name: "pivot itself",
        args: [[6, 7, 0, 1, 2, 4, 5], 0],
        expected: 2,
        hidden: true,
      },
    ],
  },

  // ── LINKED LIST ─────────────────────────────────────────────────────

  "reverse-linked-list": {
    kind: "python",
    // Wrap: take a list, build linked list, call reverse_list, convert back.
    entrypoint: "_reverse_wrapper",
    starterCode: `from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head: Optional[ListNode]) -> Optional[ListNode]:
    """Reverse a singly-linked list and return the new head."""
    # TODO: implement
    pass`,
    setup: LINKED_LIST_HELPERS + `
def _reverse_wrapper(values):
    head = _list_to_linked(values)
    return _linked_to_list(reverse_list(head))
`,
    cases: [
      { name: "five elements", args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { name: "two elements", args: [[1, 2]], expected: [2, 1] },
      { name: "single", args: [[1]], expected: [1] },
      { name: "empty", args: [[]], expected: [] },
      { name: "with negatives", args: [[-1, -2, -3]], expected: [-3, -2, -1], hidden: true },
    ],
  },

  "merge-two-sorted-lists": {
    kind: "python",
    entrypoint: "_merge_wrapper",
    starterCode: `from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def merge_two_lists(l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
    """Merge two sorted linked lists into one sorted linked list."""
    # TODO: implement
    pass`,
    setup: LINKED_LIST_HELPERS + `
def _merge_wrapper(a, b):
    return _linked_to_list(merge_two_lists(_list_to_linked(a), _list_to_linked(b)))
`,
    cases: [
      { name: "classic", args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { name: "both empty", args: [[], []], expected: [] },
      { name: "one empty", args: [[], [1, 2]], expected: [1, 2] },
      { name: "other empty", args: [[1, 2], []], expected: [1, 2] },
      { name: "interleaved", args: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6] },
      {
        name: "all of a < all of b",
        args: [[1, 2], [3, 4]],
        expected: [1, 2, 3, 4],
        hidden: true,
      },
    ],
  },

  "linked-list-cycle": {
    kind: "python",
    // Take values + pos (index where tail.next points; -1 for no cycle).
    entrypoint: "_has_cycle_wrapper",
    starterCode: `from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def has_cycle(head: Optional[ListNode]) -> bool:
    """Return True if the linked list contains a cycle."""
    # TODO: implement
    pass`,
    setup: `
def _has_cycle_wrapper(values, pos):
    if not values:
        return has_cycle(None)
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if pos != -1:
        nodes[-1].next = nodes[pos]
    return has_cycle(nodes[0])
`,
    cases: [
      { name: "cycle at idx 1", args: [[3, 2, 0, -4], 1], expected: true },
      { name: "cycle at idx 0", args: [[1, 2], 0], expected: true },
      { name: "no cycle", args: [[1, 2, 3], -1], expected: false },
      { name: "single no cycle", args: [[1], -1], expected: false },
      { name: "single self-loop", args: [[1], 0], expected: true },
      { name: "empty", args: [[], -1], expected: false, hidden: true },
    ],
  },

  // ── TREES ───────────────────────────────────────────────────────────

  "invert-binary-tree": {
    kind: "python",
    entrypoint: "_invert_wrapper",
    starterCode: `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def invert_tree(root: Optional[TreeNode]) -> Optional[TreeNode]:
    """Invert a binary tree (mirror left/right at every node)."""
    # TODO: implement
    pass`,
    setup: TREE_HELPERS + `
def _invert_wrapper(values):
    return _tree_to_list(invert_tree(_list_to_tree(values)))
`,
    cases: [
      {
        name: "classic",
        args: [[4, 2, 7, 1, 3, 6, 9]],
        expected: [4, 7, 2, 9, 6, 3, 1],
      },
      { name: "empty", args: [[]], expected: [] },
      { name: "single node", args: [[1]], expected: [1] },
      { name: "two levels", args: [[2, 1, 3]], expected: [2, 3, 1] },
      {
        name: "left-skewed",
        args: [[1, 2, null, 3]],
        expected: [1, null, 2, null, 3],
        hidden: true,
      },
    ],
  },

  "maximum-depth-binary-tree": {
    kind: "python",
    entrypoint: "_max_depth_wrapper",
    starterCode: `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(root: Optional[TreeNode]) -> int:
    """Return the maximum depth (number of nodes on the longest root-to-leaf path)."""
    # TODO: implement
    pass`,
    setup: TREE_HELPERS + `
def _max_depth_wrapper(values):
    return max_depth(_list_to_tree(values))
`,
    cases: [
      { name: "classic", args: [[3, 9, 20, null, null, 15, 7]], expected: 3 },
      { name: "empty", args: [[]], expected: 0 },
      { name: "single", args: [[1]], expected: 1 },
      { name: "left skew depth 4", args: [[1, 2, null, 3, null, 4]], expected: 4 },
      { name: "balanced depth 2", args: [[1, 2, 3]], expected: 2 },
      {
        name: "right skew depth 3",
        args: [[1, null, 2, null, 3]],
        expected: 3,
        hidden: true,
      },
    ],
  },

  "same-tree": {
    kind: "python",
    entrypoint: "_same_wrapper",
    starterCode: `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_same_tree(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
    """Return True if two binary trees have identical structure and values."""
    # TODO: implement
    pass`,
    setup: TREE_HELPERS + `
def _same_wrapper(p_vals, q_vals):
    return is_same_tree(_list_to_tree(p_vals), _list_to_tree(q_vals))
`,
    cases: [
      { name: "identical", args: [[1, 2, 3], [1, 2, 3]], expected: true },
      {
        name: "structure mismatch",
        args: [[1, 2], [1, null, 2]],
        expected: false,
      },
      {
        name: "value mismatch",
        args: [[1, 2, 1], [1, 1, 2]],
        expected: false,
      },
      { name: "both empty", args: [[], []], expected: true },
      { name: "one empty", args: [[1], []], expected: false },
      {
        name: "deep identical",
        args: [[1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7]],
        expected: true,
        hidden: true,
      },
    ],
  },

  "validate-bst": {
    kind: "python",
    entrypoint: "_bst_wrapper",
    starterCode: `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root: Optional[TreeNode]) -> bool:
    """Return True if the tree is a valid BST (strict inequalities)."""
    # TODO: implement
    pass`,
    setup: TREE_HELPERS + `
def _bst_wrapper(values):
    return is_valid_bst(_list_to_tree(values))
`,
    cases: [
      { name: "valid simple", args: [[2, 1, 3]], expected: true },
      {
        name: "invalid right grandchild",
        args: [[5, 1, 4, null, null, 3, 6]],
        expected: false,
      },
      { name: "single node", args: [[1]], expected: true },
      { name: "empty", args: [[]], expected: true },
      {
        name: "equal values not strict",
        args: [[1, 1]],
        expected: false,
      },
      {
        name: "valid larger tree",
        args: [[10, 5, 15, 3, 7, 12, 20]],
        expected: true,
        hidden: true,
      },
    ],
  },

  "binary-tree-level-order-traversal": {
    kind: "python",
    entrypoint: "_level_order_wrapper",
    starterCode: `from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order(root: Optional[TreeNode]) -> List[List[int]]:
    """Return the level-order (BFS) traversal of a binary tree."""
    # TODO: implement
    pass`,
    setup: TREE_HELPERS + `
def _level_order_wrapper(values):
    return level_order(_list_to_tree(values))
`,
    cases: [
      {
        name: "classic",
        args: [[3, 9, 20, null, null, 15, 7]],
        expected: [[3], [9, 20], [15, 7]],
      },
      { name: "empty", args: [[]], expected: [] },
      { name: "single", args: [[1]], expected: [[1]] },
      { name: "two levels", args: [[1, 2, 3]], expected: [[1], [2, 3]] },
      {
        name: "left skew",
        args: [[1, 2, null, 3]],
        expected: [[1], [2], [3]],
        hidden: true,
      },
    ],
  },

  // ── TRIE ────────────────────────────────────────────────────────────

  "implement-trie": {
    kind: "python",
    // Simulate operations: ops is list of [method, arg] pairs.
    // Returns list of return values (None for insert).
    entrypoint: "_trie_simulator",
    starterCode: `class Trie:
    def __init__(self):
        # TODO: initialize the trie
        pass

    def insert(self, word: str) -> None:
        """Insert a word into the trie."""
        # TODO: implement
        pass

    def search(self, word: str) -> bool:
        """Return True if the exact word is in the trie."""
        # TODO: implement
        pass

    def starts_with(self, prefix: str) -> bool:
        """Return True if any inserted word begins with prefix."""
        # TODO: implement
        pass`,
    setup: `
def _trie_simulator(ops):
    t = Trie()
    out = []
    for op in ops:
        method, arg = op[0], op[1]
        if method == "insert":
            t.insert(arg)
            out.append(None)
        elif method == "search":
            out.append(t.search(arg))
        elif method == "starts_with":
            out.append(t.starts_with(arg))
    return out
`,
    cases: [
      {
        name: "leetcode example",
        args: [
          [
            ["insert", "apple"],
            ["search", "apple"],
            ["search", "app"],
            ["starts_with", "app"],
            ["insert", "app"],
            ["search", "app"],
          ],
        ],
        expected: [null, true, false, true, null, true],
      },
      {
        name: "empty trie searches",
        args: [
          [
            ["search", "abc"],
            ["starts_with", ""],
          ],
        ],
        expected: [false, true],
      },
      {
        name: "multi-word",
        args: [
          [
            ["insert", "cat"],
            ["insert", "car"],
            ["search", "cat"],
            ["search", "ca"],
            ["starts_with", "ca"],
            ["starts_with", "cb"],
          ],
        ],
        expected: [null, null, true, false, true, false],
      },
      {
        name: "duplicate insert",
        args: [
          [
            ["insert", "x"],
            ["insert", "x"],
            ["search", "x"],
          ],
        ],
        expected: [null, null, true],
      },
      {
        name: "longer prefix",
        args: [
          [
            ["insert", "abcdef"],
            ["starts_with", "abcde"],
            ["search", "abcde"],
            ["starts_with", "abcdefg"],
          ],
        ],
        expected: [null, true, false, false],
        hidden: true,
      },
    ],
  },

  // ── HEAP ────────────────────────────────────────────────────────────

  "kth-largest-element-in-stream": {
    kind: "python",
    // Sim: first arg is k, second is initial nums, third is list of add() values.
    // Returns list of add() return values.
    entrypoint: "_kth_simulator",
    starterCode: `from typing import List

class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        """Initialize with k and an initial stream of numbers."""
        # TODO: implement
        pass

    def add(self, val: int) -> int:
        """Insert val and return the current k-th largest element."""
        # TODO: implement
        pass`,
    setup: `
def _kth_simulator(k, nums, adds):
    kt = KthLargest(k, nums)
    return [kt.add(v) for v in adds]
`,
    cases: [
      {
        name: "leetcode example",
        args: [3, [4, 5, 8, 2], [3, 5, 10, 9, 4]],
        expected: [4, 5, 5, 8, 8],
      },
      {
        name: "empty initial",
        args: [1, [], [1, 2, 3]],
        expected: [1, 2, 3],
      },
      {
        name: "k=1 always max",
        args: [1, [5], [10, 3, 7, 20]],
        expected: [10, 10, 10, 20],
      },
      {
        name: "k larger than initial",
        args: [2, [1], [2, 3, 4]],
        expected: [1, 2, 3],
      },
      {
        name: "duplicates",
        args: [2, [4, 4], [4, 5]],
        expected: [4, 4],
        hidden: true,
      },
    ],
  },

  // ── BACKTRACKING ────────────────────────────────────────────────────

  "subsets": {
    kind: "python",
    // Order of subsets is unspecified — canonicalize.
    entrypoint: "_subsets_canonical",
    starterCode: `from typing import List

def subsets(nums: List[int]) -> List[List[int]]:
    """Return all possible subsets of nums (the power set). Order unspecified."""
    # TODO: implement
    pass`,
    setup: `
def _subsets_canonical(nums):
    return sorted([sorted(s) for s in subsets(nums)])
`,
    cases: [
      {
        name: "three elements",
        args: [[1, 2, 3]],
        expected: [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]],
      },
      { name: "empty", args: [[]], expected: [[]] },
      { name: "single", args: [[5]], expected: [[], [5]] },
      { name: "two elements", args: [[1, 2]], expected: [[], [1], [1, 2], [2]] },
      {
        name: "with negative",
        args: [[-1, 2]],
        expected: [[], [-1], [-1, 2], [2]],
        hidden: true,
      },
    ],
  },

  "combination-sum": {
    kind: "python",
    entrypoint: "_comb_canonical",
    starterCode: `from typing import List

def combination_sum(candidates: List[int], target: int) -> List[List[int]]:
    """Return all unique combinations of candidates summing to target.
    Each candidate may be used unlimited times.
    """
    # TODO: implement
    pass`,
    setup: `
def _comb_canonical(candidates, target):
    return sorted([sorted(c) for c in combination_sum(candidates, target)])
`,
    cases: [
      {
        name: "classic",
        args: [[2, 3, 6, 7], 7],
        expected: [[2, 2, 3], [7]],
      },
      {
        name: "multiple combos",
        args: [[2, 3, 5], 8],
        expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]],
      },
      { name: "no solution", args: [[2], 3], expected: [] },
      { name: "target zero", args: [[1, 2], 0], expected: [[]] },
      { name: "single candidate exact", args: [[5], 10], expected: [[5, 5]] },
      {
        name: "candidate > target",
        args: [[10], 5],
        expected: [],
        hidden: true,
      },
    ],
  },

  // ── GRAPHS ──────────────────────────────────────────────────────────

  "number-of-islands": {
    kind: "python",
    // num_islands mutates the grid. Wrap so each test passes a fresh copy.
    entrypoint: "_islands_wrapper",
    starterCode: `from typing import List

def num_islands(grid: List[List[str]]) -> int:
    """Count islands of '1's connected 4-directionally in a grid of '0'/'1'."""
    # TODO: implement
    pass`,
    setup: `
def _islands_wrapper(grid):
    copy = [row[:] for row in grid]
    return num_islands(copy)
`,
    cases: [
      {
        name: "three islands",
        args: [
          [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"],
          ],
        ],
        expected: 3,
      },
      {
        name: "one big island",
        args: [
          [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"],
          ],
        ],
        expected: 1,
      },
      { name: "all water", args: [[["0", "0"], ["0", "0"]]], expected: 0 },
      { name: "all land", args: [[["1", "1"], ["1", "1"]]], expected: 1 },
      { name: "single cell land", args: [[["1"]]], expected: 1 },
      {
        name: "diagonal not connected",
        args: [
          [
            ["1", "0", "1"],
            ["0", "1", "0"],
            ["1", "0", "1"],
          ],
        ],
        expected: 5,
        hidden: true,
      },
    ],
  },

  "clone-graph": {
    kind: "python",
    // Build adjacency-list graph, clone, verify it's a deep copy and that
    // the cloned adjacency list (sorted by val) matches input.
    entrypoint: "_clone_wrapper",
    starterCode: `from typing import List, Optional

class Node:
    def __init__(self, val: int = 0, neighbors: Optional[List["Node"]] = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def clone_graph(node: Optional[Node]) -> Optional[Node]:
    """Return a deep copy of a connected undirected graph."""
    # TODO: implement
    pass`,
    setup: `
def _clone_wrapper(adj_list):
    """adj_list: 1-indexed adjacency list. adj_list[i] = neighbors of node i+1."""
    if not adj_list:
        return []
    n = len(adj_list)
    nodes = [Node(i + 1) for i in range(n)]
    for i, neighbors in enumerate(adj_list):
        nodes[i].neighbors = [nodes[j - 1] for j in neighbors]
    cloned = clone_graph(nodes[0])
    if cloned is None:
        return []
    # BFS the clone, build adjacency list back.
    from collections import deque as _dq
    visited = {cloned: True}
    order = [cloned]
    q = _dq([cloned])
    while q:
        node = q.popleft()
        for nei in node.neighbors:
            if nei not in visited:
                visited[nei] = True
                order.append(nei)
                q.append(nei)
    # Sort by val to get a deterministic representation.
    order.sort(key=lambda x: x.val)
    # Verify it's actually a clone (different identity).
    for orig, c in zip(nodes, [n for n in order]):
        if orig is c:
            return "NOT_A_DEEP_COPY"
    return [sorted([nei.val for nei in node.neighbors]) for node in order]
`,
    cases: [
      {
        name: "4-cycle",
        args: [[[2, 4], [1, 3], [2, 4], [1, 3]]],
        expected: [[2, 4], [1, 3], [2, 4], [1, 3]],
      },
      { name: "single node", args: [[[]]], expected: [[]] },
      { name: "empty graph", args: [[]], expected: [] },
      {
        name: "two-node",
        args: [[[2], [1]]],
        expected: [[2], [1]],
      },
      {
        name: "triangle",
        args: [[[2, 3], [1, 3], [1, 2]]],
        expected: [[2, 3], [1, 3], [1, 2]],
        hidden: true,
      },
    ],
  },

  "pacific-atlantic-water-flow": {
    kind: "python",
    // Order is unspecified — canonicalize by sorting cells.
    entrypoint: "_pac_atl_canonical",
    starterCode: `from typing import List

def pacific_atlantic(heights: List[List[int]]) -> List[List[int]]:
    """Return all cells [r, c] from which water can flow to both the
    Pacific (top/left edges) and Atlantic (bottom/right edges).
    """
    # TODO: implement
    pass`,
    setup: `
def _pac_atl_canonical(heights):
    return sorted([list(c) for c in pacific_atlantic(heights)])
`,
    cases: [
      {
        name: "classic 5x5",
        args: [
          [
            [1, 2, 2, 3, 5],
            [3, 2, 3, 4, 4],
            [2, 4, 5, 3, 1],
            [6, 7, 1, 4, 5],
            [5, 1, 1, 2, 4],
          ],
        ],
        expected: [
          [0, 4],
          [1, 3],
          [1, 4],
          [2, 2],
          [3, 0],
          [3, 1],
          [4, 0],
        ],
      },
      { name: "single cell", args: [[[1]]], expected: [[0, 0]] },
      {
        name: "all same height",
        args: [
          [
            [1, 1],
            [1, 1],
          ],
        ],
        expected: [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ],
      },
      {
        name: "single row",
        args: [[[1, 2, 3]]],
        expected: [
          [0, 0],
          [0, 1],
          [0, 2],
        ],
      },
      {
        name: "single column",
        args: [[[3], [2], [1]]],
        expected: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        hidden: true,
      },
    ],
  },

  "course-schedule": {
    kind: "python",
    entrypoint: "can_finish",
    starterCode: `from typing import List

def can_finish(num_courses: int, prerequisites: List[List[int]]) -> bool:
    """Return True if all courses can be finished given prereq pairs [a, b]
    meaning b must be taken before a (i.e. detect no cycle).
    """
    # TODO: implement
    pass`,
    cases: [
      { name: "simple line", args: [2, [[1, 0]]], expected: true },
      { name: "cycle", args: [2, [[1, 0], [0, 1]]], expected: false },
      { name: "no prereqs", args: [3, []], expected: true },
      { name: "single course", args: [1, []], expected: true },
      {
        name: "longer chain",
        args: [4, [[1, 0], [2, 1], [3, 2]]],
        expected: true,
      },
      {
        name: "self-loop",
        args: [1, [[0, 0]]],
        expected: false,
        hidden: true,
      },
      {
        name: "diamond no cycle",
        args: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]],
        expected: true,
        hidden: true,
      },
    ],
  },

  // ── DYNAMIC PROGRAMMING ─────────────────────────────────────────────

  "climbing-stairs": {
    kind: "python",
    entrypoint: "climb_stairs",
    starterCode: `def climb_stairs(n: int) -> int:
    """Return the number of distinct ways to climb n stairs taking 1 or 2 steps."""
    # TODO: implement
    pass`,
    cases: [
      { name: "n=1", args: [1], expected: 1 },
      { name: "n=2", args: [2], expected: 2 },
      { name: "n=3", args: [3], expected: 3 },
      { name: "n=5", args: [5], expected: 8 },
      { name: "n=10", args: [10], expected: 89 },
      { name: "n=20", args: [20], expected: 10946, hidden: true },
    ],
  },

  "house-robber": {
    kind: "python",
    entrypoint: "rob",
    starterCode: `from typing import List

def rob(nums: List[int]) -> int:
    """Return the max amount you can rob without robbing two adjacent houses."""
    # TODO: implement
    pass`,
    cases: [
      { name: "basic 4", args: [[1, 2, 3, 1]], expected: 4 },
      { name: "basic 5", args: [[2, 7, 9, 3, 1]], expected: 12 },
      { name: "single", args: [[5]], expected: 5 },
      { name: "two pick max", args: [[3, 7]], expected: 7 },
      { name: "empty", args: [[]], expected: 0 },
      { name: "all same", args: [[5, 5, 5, 5]], expected: 10, hidden: true },
    ],
  },

  "coin-change": {
    kind: "python",
    entrypoint: "coin_change",
    starterCode: `from typing import List

def coin_change(coins: List[int], amount: int) -> int:
    """Return the fewest coins needed to make amount, or -1 if impossible."""
    # TODO: implement
    pass`,
    cases: [
      { name: "classic", args: [[1, 2, 5], 11], expected: 3 },
      { name: "impossible", args: [[2], 3], expected: -1 },
      { name: "amount zero", args: [[1], 0], expected: 0 },
      { name: "exact one coin", args: [[1, 2, 5], 5], expected: 1 },
      {
        name: "greedy fails",
        args: [[1, 3, 4], 6],
        expected: 2,
      },
      {
        name: "large amount",
        args: [[1, 2, 5], 100],
        expected: 20,
        hidden: true,
      },
    ],
  },

  "longest-increasing-subsequence": {
    kind: "python",
    entrypoint: "length_of_lis",
    starterCode: `from typing import List

def length_of_lis(nums: List[int]) -> int:
    """Return the length of the longest strictly increasing subsequence."""
    # TODO: implement
    pass`,
    cases: [
      {
        name: "classic",
        args: [[10, 9, 2, 5, 3, 7, 101, 18]],
        expected: 4,
      },
      { name: "duplicates", args: [[0, 1, 0, 3, 2, 3]], expected: 4 },
      { name: "all same", args: [[7, 7, 7, 7]], expected: 1 },
      { name: "single", args: [[5]], expected: 1 },
      { name: "empty", args: [[]], expected: 0 },
      { name: "monotone descending", args: [[5, 4, 3, 2, 1]], expected: 1 },
      {
        name: "monotone ascending",
        args: [[1, 2, 3, 4, 5]],
        expected: 5,
        hidden: true,
      },
    ],
  },

  "word-break": {
    kind: "python",
    entrypoint: "word_break",
    starterCode: `from typing import List

def word_break(s: str, word_dict: List[str]) -> bool:
    """Return True if s can be segmented into a sequence of words from word_dict."""
    # TODO: implement
    pass`,
    cases: [
      { name: "leetcode", args: ["leetcode", ["leet", "code"]], expected: true },
      {
        name: "applepenapple",
        args: ["applepenapple", ["apple", "pen"]],
        expected: true,
      },
      {
        name: "catsandog",
        args: ["catsandog", ["cats", "dog", "sand", "and", "cat"]],
        expected: false,
      },
      { name: "empty string", args: ["", ["a"]], expected: true },
      { name: "single matching word", args: ["a", ["a"]], expected: true },
      { name: "single nonmatching", args: ["a", ["b"]], expected: false },
      {
        name: "reusable word",
        args: ["aaaa", ["a", "aa"]],
        expected: true,
        hidden: true,
      },
    ],
  },

  // ── INTERVALS ───────────────────────────────────────────────────────

  "merge-intervals": {
    kind: "python",
    // Output IS expected to be sorted by start (problem requires it).
    entrypoint: "merge",
    starterCode: `from typing import List

def merge(intervals: List[List[int]]) -> List[List[int]]:
    """Merge all overlapping intervals and return them sorted by start."""
    # TODO: implement
    pass`,
    cases: [
      {
        name: "classic",
        args: [
          [
            [1, 3],
            [2, 6],
            [8, 10],
            [15, 18],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
          [15, 18],
        ],
      },
      {
        name: "touching merges",
        args: [
          [
            [1, 4],
            [4, 5],
          ],
        ],
        expected: [[1, 5]],
      },
      { name: "single", args: [[[1, 5]]], expected: [[1, 5]] },
      { name: "empty", args: [[]], expected: [] },
      {
        name: "all overlap",
        args: [
          [
            [1, 10],
            [2, 3],
            [4, 5],
          ],
        ],
        expected: [[1, 10]],
      },
      {
        name: "unsorted input",
        args: [
          [
            [5, 6],
            [1, 2],
            [3, 4],
          ],
        ],
        expected: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
        hidden: true,
      },
    ],
  },

  "non-overlapping-intervals": {
    kind: "python",
    entrypoint: "erase_overlap_intervals",
    starterCode: `from typing import List

def erase_overlap_intervals(intervals: List[List[int]]) -> int:
    """Return the minimum number of intervals to remove so the rest don't overlap."""
    # TODO: implement
    pass`,
    cases: [
      {
        name: "remove one",
        args: [
          [
            [1, 2],
            [2, 3],
            [3, 4],
            [1, 3],
          ],
        ],
        expected: 1,
      },
      {
        name: "all duplicates",
        args: [
          [
            [1, 2],
            [1, 2],
            [1, 2],
          ],
        ],
        expected: 2,
      },
      {
        name: "no overlap",
        args: [
          [
            [1, 2],
            [2, 3],
          ],
        ],
        expected: 0,
      },
      { name: "single", args: [[[1, 2]]], expected: 0 },
      { name: "empty", args: [[]], expected: 0 },
      {
        name: "nested intervals",
        args: [
          [
            [1, 100],
            [11, 22],
            [1, 11],
            [2, 12],
          ],
        ],
        expected: 2,
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
    const kind = (spec as { kind: string }).kind;
    console.log(`  ✓ ${slug} (${kind})`);
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
