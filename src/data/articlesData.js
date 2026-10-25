export const topicsTree = [
  {
    category: "Data Structures",
    icon: "Code",
    subtopics: [
      { id: "binary-search", title: "Binary Search Algorithm", difficulty: "Easy", readTime: "8 min", lastUpdated: "19 Oct, 2026", hasVisualizer: true },
      { id: "two-pointers", title: "Two Pointers Technique", difficulty: "Easy", readTime: "10 min", lastUpdated: "18 Oct, 2026", hasVisualizer: true },
      { id: "sliding-window", title: "Sliding Window Maximum & Subarrays", difficulty: "Medium", readTime: "11 min", lastUpdated: "17 Oct, 2026", hasVisualizer: false },
      { id: "linked-list-cycle", title: "Detect & Remove Cycle in Linked List", difficulty: "Medium", readTime: "9 min", lastUpdated: "16 Oct, 2026", hasVisualizer: false },
      { id: "tree-traversals", title: "Binary Tree Traversals (Inorder, Preorder, Postorder)", difficulty: "Easy", readTime: "8 min", lastUpdated: "15 Oct, 2026", hasVisualizer: false }
    ]
  },
  {
    category: "Algorithms & DP",
    icon: "Cpu",
    subtopics: [
      { id: "knapsack-01", title: "0/1 Knapsack Problem (Dynamic Programming)", difficulty: "Medium", readTime: "12 min", lastUpdated: "14 Oct, 2026", hasVisualizer: false },
      { id: "lcs-dp", title: "Longest Common Subsequence (LCS)", difficulty: "Medium", readTime: "10 min", lastUpdated: "13 Oct, 2026", hasVisualizer: false },
      { id: "graph-bfs-dfs", title: "Graph BFS & DFS Traversals", difficulty: "Medium", readTime: "11 min", lastUpdated: "12 Oct, 2026", hasVisualizer: false },
      { id: "dijkstra-shortest-path", title: "Dijkstra's Shortest Path Algorithm", difficulty: "Hard", readTime: "14 min", lastUpdated: "11 Oct, 2026", hasVisualizer: false }
    ]
  },
  {
    category: "System Design",
    icon: "Server",
    subtopics: [
      { id: "lru-cache-design", title: "Design LRU Cache (Hash Map + Doubly Linked List)", difficulty: "Hard", readTime: "14 min", lastUpdated: "10 Oct, 2026", hasVisualizer: false },
      { id: "load-balancer", title: "System Design: Load Balancers & Algorithms", difficulty: "Medium", readTime: "10 min", lastUpdated: "09 Oct, 2026", hasVisualizer: false },
      { id: "consistent-hashing", title: "Consistent Hashing in Distributed Caches", difficulty: "Hard", readTime: "13 min", lastUpdated: "08 Oct, 2026", hasVisualizer: false },
      { id: "rate-limiter", title: "Design a Distributed Rate Limiter", difficulty: "Medium", readTime: "12 min", lastUpdated: "07 Oct, 2026", hasVisualizer: false }
    ]
  },
  {
    category: "Core CS Subjects",
    icon: "Layers",
    subtopics: [
      { id: "os-process-threads", title: "Operating Systems: Process vs Thread & IPC", difficulty: "Medium", readTime: "9 min", lastUpdated: "06 Oct, 2026", hasVisualizer: false },
      { id: "dbms-indexing-acid", title: "DBMS: Indexing (B-Trees) & ACID Transactions", difficulty: "Hard", readTime: "12 min", lastUpdated: "05 Oct, 2026", hasVisualizer: false },
      { id: "cn-tcp-handshake", title: "Computer Networks: TCP 3-Way Handshake & UDP", difficulty: "Medium", readTime: "8 min", lastUpdated: "04 Oct, 2026", hasVisualizer: false }
    ]
  },
  {
    category: "Programming Languages",
    icon: "Terminal",
    subtopics: [
      { id: "python-decorators", title: "Python Advanced: Decorators, Generators & GIL", difficulty: "Medium", readTime: "9 min", lastUpdated: "16 Oct, 2026", hasVisualizer: false },
      { id: "java-hashmap-internal", title: "Internal Working of HashMap in Java 8+", difficulty: "Medium", readTime: "11 min", lastUpdated: "15 Oct, 2026", hasVisualizer: false },
      { id: "cpp-smart-pointers", title: "C++ Smart Pointers (unique_ptr, shared_ptr, weak_ptr)", difficulty: "Medium", readTime: "10 min", lastUpdated: "14 Oct, 2026", hasVisualizer: false }
    ]
  }
];

export const articlesDetail = {
  "binary-search": {
    id: "binary-search",
    title: "Binary Search Algorithm - Iterative & Recursive",
    breadcrumb: ["Tutorials", "Data Structures", "Searching", "Binary Search"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "19 Oct, 2026",
    readingTime: "8 min read",
    likes: 2450,
    tags: ["Searching", "Divide & Conquer", "Algorithms", "Binary Search"],
    relatedProblemId: "binary-search",
    summary: "Binary Search is an interval-halving searching algorithm that operates on a monotonic/sorted search space in logarithmic time O(log N).",
    sections: [
      {
        id: "introduction",
        heading: "What is Binary Search?",
        content: `Binary Search is an efficient algorithm for finding an item from a **sorted list of items**. It works by repeatedly dividing in half the portion of the list that could contain the item, until you've narrowed down the possible locations to just one.
        
Compared to linear search which checks every item sequentially with $O(N)$ worst-case time complexity, Binary Search cuts down the candidates exponentially, leading to an **$O(\\log N)$** performance guarantee.`
      },
      {
        id: "conditions",
        heading: "Conditions to Apply Binary Search",
        content: `Before applying Binary Search, make sure the problem satisfies the following fundamental invariants:
1. **Sorted/Monotonic Order:** The elements or search space must follow a strict non-decreasing or non-increasing order.
2. **Direct Indexing:** Constant time $O(1)$ random access to any element by index (e.g., Arrays, Vectors).
3. **Determinate Search Space:** The boundaries \`low\` and \`high\` can be clearly established.`
      },
      {
        id: "algorithm",
        heading: "Binary Search Working Principle",
        content: `1. Initialize pointers \`low = 0\` and \`high = N - 1\`.
2. Compute the midpoint: \`mid = low + Math.floor((high - low) / 2)\` to prevent integer overflow.
3. Compare \`arr[mid]\` with target \`key\`:
   - If \`arr[mid] === key\`, target is found at index \`mid\`!
   - If \`arr[mid] < key\`, target must reside in right half; adjust \`low = mid + 1\`.
   - If \`arr[mid] > key\`, target must reside in left half; adjust \`high = mid - 1\`.
4. If \`low > high\`, search space is exhausted and the key is not present.`
      }
    ],
    codeSnippets: {
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`,
      java: `public class BinarySearch {
    public static int search(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}`,
      python: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = low + (high - low) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
      javascript: `function binarySearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor(low + (high - low) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`
    },
    complexity: {
      time: "O(log N)",
      space: "O(1) iterative, O(log N) recursive"
    },
    faqs: [
      { q: "Why low + (high - low) / 2?", a: "Prevents 32-bit signed integer overflow in languages like C++ and Java." }
    ],
    quiz: {
      question: "What is the maximum number of comparisons needed to find an element in a sorted array of 1024 elements using Binary Search?",
      options: ["10", "1024", "512", "11"],
      correctIndex: 0,
      explanation: "Since log2(1024) = 10, binary search takes at most 10 iterations to narrow down to a single element."
    }
  },

  "two-pointers": {
    id: "two-pointers",
    title: "Two Pointers Technique - Convergence & Partitions",
    breadcrumb: ["Tutorials", "Data Structures", "Arrays", "Two Pointers"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "18 Oct, 2026",
    readingTime: "10 min read",
    likes: 1820,
    tags: ["Arrays", "Two Pointers", "Optimization"],
    relatedProblemId: "two-sum-sorted",
    summary: "The two pointers approach uses two index markers to iterate across a sequence simultaneously, cutting quadratic nested loops down to linear O(N) time.",
    sections: [
      {
        id: "intro",
        heading: "Overview of Two Pointers Pattern",
        content: `Instead of brute-force checking every pair $(i, j)$ in $O(N^2)$, two pointers utilize sorted properties to converge from opposite ends or slide together in linear $O(N)$ time.`
      },
      {
        id: "types",
        heading: "Core Varieties",
        content: `1. **Opposite Ends (Converging):** Pointers at \`0\` and \`N - 1\`. Used in Two Sum Sorted, Container With Most Water, Trapping Rainwater.
2. **Fast & Slow (Floyd's Tortoise and Hare):** One advances 1 step, other 2 steps. Used for Linked List Cycle Detection and Finding Middle Node.
3. **Partition Pointers:** Used in Dutch National Flag and QuickSort pivot partitioning.`
      }
    ],
    codeSnippets: {
      cpp: `#include <vector>
using namespace std;

bool hasPair(const vector<int>& arr, int target) {
    int l = 0, r = arr.size() - 1;
    while (l < r) {
        int s = arr[l] + arr[r];
        if (s == target) return true;
        if (s < target) l++;
        else r--;
    }
    return false;
}`,
      java: `public class TwoPointers {
    public static boolean hasPair(int[] arr, int target) {
        int l = 0, r = arr.length - 1;
        while (l < r) {
            int sum = arr[l] + arr[r];
            if (sum == target) return true;
            if (sum < target) l++;
            else r--;
        }
        return false;
    }
}`,
      python: `def has_pair(arr, target):
    l, r = 0, len(arr) - 1
    while l < r:
        s = arr[l] + arr[r]
        if s == target: return True
        elif s < target: l += 1
        else: r -= 1
    return False`,
      javascript: `function hasPair(arr, target) {
  let l = 0, r = arr.length - 1;
  while (l < r) {
    const s = arr[l] + arr[r];
    if (s === target) return true;
    if (s < target) l++;
    else r--;
  }
  return false;
}`
    },
    complexity: { time: "O(N)", space: "O(1)" },
    faqs: [{ q: "Can two pointers be used on unsorted arrays?", a: "Yes, for partition problems like Dutch Flag (0s, 1s, 2s) and Move Zeroes." }],
    quiz: {
      question: "In Two Sum on a sorted array, if arr[left] + arr[right] > target, what action should you take?",
      options: ["left++", "right--", "left--", "terminate"],
      correctIndex: 1,
      explanation: "Since the array is sorted, decreasing the right pointer reduces the sum towards the target."
    }
  },

  "sliding-window": {
    id: "sliding-window",
    title: "Sliding Window Pattern - Fixed & Dynamic Windows",
    breadcrumb: ["Tutorials", "Data Structures", "Arrays", "Sliding Window"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "17 Oct, 2026",
    readingTime: "11 min read",
    likes: 1940,
    tags: ["Arrays", "Sliding Window", "Subarrays"],
    relatedProblemId: "binary-search",
    summary: "The sliding window algorithm maintains a subarray bounded by two pointers, avoiding redundant re-computations and turning O(N*K) operations into O(N).",
    sections: [
      {
        id: "concept",
        heading: "What is Sliding Window?",
        content: `When finding properties of contiguous sub-segments of length $K$, instead of recalculating the entire subsegment sum from scratch for every index, we simply subtract the element going out of the window and add the element coming in:
\`windowSum = windowSum - arr[i - K] + arr[i]\`.`
      },
      {
        id: "types",
        heading: "Fixed vs Dynamic Window",
        content: `- **Fixed Window:** Window size $K$ is constant (e.g. Max Sum Subarray of size $K$).
- **Dynamic Window:** Window expands right pointer until condition is met, then contracts left pointer to optimize (e.g. Smallest Subarray with Sum $\\ge S$, Longest Substring Without Repeating Characters).`
      }
    ],
    codeSnippets: {
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

int maxSumSubarray(const vector<int>& arr, int k) {
    int n = arr.size();
    if (n < k) return -1;
    int curr = 0;
    for (int i = 0; i < k; i++) curr += arr[i];
    int maxS = curr;
    for (int i = k; i < n; i++) {
        curr += arr[i] - arr[i - k];
        maxS = max(maxS, curr);
    }
    return maxS;
}`,
      java: `public class SlidingWindow {
    public static int maxSum(int[] arr, int k) {
        int curr = 0;
        for (int i = 0; i < k; i++) curr += arr[i];
        int max = curr;
        for (int i = k; i < arr.length; i++) {
            curr += arr[i] - arr[i - k];
            max = Math.max(max, curr);
        }
        return max;
    }
}`,
      python: `def max_sum_subarray(arr, k):
    if len(arr) < k: return -1
    curr = sum(arr[:k])
    max_sum = curr
    for i in range(k, len(arr)):
        curr += arr[i] - arr[i - k]
        max_sum = max(max_sum, curr)
    return max_sum`,
      javascript: `function maxSumSubarray(arr, k) {
  if (arr.length < k) return -1;
  let curr = 0;
  for (let i = 0; i < k; i++) curr += arr[i];
  let maxS = curr;
  for (let i = k; i < arr.length; i++) {
    curr += arr[i] - arr[i - k];
    maxS = Math.max(maxS, curr);
  }
  return maxS;
}`
    },
    complexity: { time: "O(N)", space: "O(1)" },
    faqs: [{ q: "When does sliding window fail?", a: "When elements can be negative and we are searching for dynamic minimum/maximum lengths without monotonic properties." }],
    quiz: {
      question: "What is the time complexity of finding the maximum sum of any contiguous subarray of size K using sliding window?",
      options: ["O(N)", "O(N * K)", "O(N log K)", "O(K)"],
      correctIndex: 0,
      explanation: "Each element is visited once and arithmetic takes O(1) time, yielding total linear O(N) complexity."
    }
  },

  "linked-list-cycle": {
    id: "linked-list-cycle",
    title: "Detect & Remove Cycle in Linked List (Floyd's Algorithm)",
    breadcrumb: ["Tutorials", "Data Structures", "Linked List", "Cycle Detection"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "16 Oct, 2026",
    readingTime: "9 min read",
    likes: 2150,
    tags: ["Linked List", "Pointers", "Floyd's Algorithm"],
    relatedProblemId: "reverse-linked-list",
    summary: "Detect whether a linked list contains a cycle and find the entry point using Floyd's Tortoise and Hare algorithm in O(N) time and O(1) space.",
    sections: [
      {
        id: "floyds-algo",
        heading: "Floyd's Cycle-Finding Algorithm",
        content: `Floyd's algorithm uses two pointers: a slow pointer \`tortoise\` moving 1 node per step, and a fast pointer \`hare\` moving 2 nodes per step.
If a cycle exists, the fast pointer will eventually lap and meet the slow pointer within the cycle loop.`
      },
      {
        id: "finding-entry",
        heading: "Finding Cycle Starting Node",
        content: `Once \`slow\` and \`fast\` collide at meeting point $M$:
1. Reset \`slow = head\`.
2. Keep \`fast\` at meeting point $M$.
3. Advance both pointers 1 step at a time.
4. The node where they collide again is the **exact entry node of the cycle**!
Mathematical Proof: The distance from head to cycle start equals the distance from $M$ to cycle start modulo loop length.`
      }
    ],
    codeSnippets: {
      cpp: `struct ListNode { int val; ListNode *next; ListNode(int x): val(x), next(nullptr) {} };

ListNode *detectCycle(ListNode *head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            ListNode *entry = head;
            while (entry != slow) {
                entry = entry->next;
                slow = slow->next;
            }
            return entry;
        }
    }
    return nullptr;
}`,
      java: `public class Solution {
    public ListNode detectCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                ListNode entry = head;
                while (entry != slow) {
                    entry = entry.next;
                    slow = slow.next;
                }
                return entry;
            }
        }
        return null;
    }
}`,
      python: `def detectCycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            entry = head
            while entry != slow:
                entry = entry.next
                slow = slow.next
            return entry
    return None`,
      javascript: `function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      let entry = head;
      while (entry !== slow) {
        entry = entry.next;
        slow = slow.next;
      }
      return entry;
    }
  }
  return null;
}`
    },
    complexity: { time: "O(N)", space: "O(1)" },
    faqs: [{ q: "Why move fast pointer by 2 steps instead of 3?", a: "2 steps reduces relative distance by exactly 1 in each step inside the loop, guaranteeing collision without skipping." }],
    quiz: {
      question: "What is the auxiliary space complexity of Floyd's Tortoise and Hare cycle detection?",
      options: ["O(1)", "O(N)", "O(log N)", "O(N^2)"],
      correctIndex: 0,
      explanation: "Floyd's algorithm uses only two pointer references, requiring O(1) auxiliary space without hash sets."
    }
  },

  "tree-traversals": {
    id: "tree-traversals",
    title: "Binary Tree Traversals - Inorder, Preorder, Postorder & Level-Order",
    breadcrumb: ["Tutorials", "Data Structures", "Trees", "Traversals"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "15 Oct, 2026",
    readingTime: "8 min read",
    likes: 1890,
    tags: ["Trees", "Traversals", "Recursion", "BFS"],
    relatedProblemId: "binary-search",
    summary: "Master the 4 fundamental tree traversals: Preorder (Root-L-R), Inorder (L-Root-R), Postorder (L-R-Root), and Level Order (BFS).",
    sections: [
      {
        id: "dfs-orders",
        heading: "Depth-First Search (DFS) Traversals",
        content: `1. **Inorder (Left -> Root -> Right):** In a Binary Search Tree (BST), inorder traversal produces sorted keys in ascending order.
2. **Preorder (Root -> Left -> Right):** Used for creating a copy of the tree and prefix expression trees.
3. **Postorder (Left -> Right -> Root):** Used for tree deletion and bottom-up dependency resolution (e.g. postfix evaluation).`
      },
      {
        id: "bfs-order",
        heading: "Breadth-First Search (BFS) / Level-Order",
        content: `Visits nodes level-by-level from top to bottom, left to right, utilizing a FIFO queue. Essential for calculating tree width, shortest path in unweighted graphs, and top/side views.`
      }
    ],
    codeSnippets: {
      cpp: `#include <vector>
#include <queue>
using namespace std;
struct Node { int val; Node *left, *right; };

vector<int> inorderTraversal(Node* root) {
    vector<int> res;
    if (!root) return res;
    auto l = inorderTraversal(root->left);
    res.insert(res.end(), l.begin(), l.end());
    res.push_back(root->val);
    auto r = inorderTraversal(root->right);
    res.insert(res.end(), r.begin(), r.end());
    return res;
}`,
      java: `public class TreeTraversals {
    public void inorder(TreeNode root, List<Integer> res) {
        if (root == null) return;
        inorder(root.left, res);
        res.add(root.val);
        inorder(root.right, res);
    }
}`,
      python: `def inorder_traversal(root):
    return inorder_traversal(root.left) + [root.val] + inorder_traversal(root.right) if root else []`,
      javascript: `function inorderTraversal(root) {
  const res = [];
  function dfs(node) {
    if (!node) return;
    dfs(node.left);
    res.push(node.val);
    dfs(node.right);
  }
  dfs(root);
  return res;
}`
    },
    complexity: { time: "O(N)", space: "O(H) where H = height of tree" },
    faqs: [{ q: "Which traversal of a BST yields elements in sorted order?", a: "Inorder traversal (Left, Root, Right) always visits BST nodes in monotonically increasing order." }],
    quiz: {
      question: "Which binary tree traversal order visits the root node AFTER visiting both of its subtrees?",
      options: ["Postorder", "Preorder", "Inorder", "Level-order"],
      correctIndex: 0,
      explanation: "Postorder traversal visits Left subtree, Right subtree, and then the Root node."
    }
  },

  "knapsack-01": {
    id: "knapsack-01",
    title: "0/1 Knapsack Problem - Dynamic Programming Mastery",
    breadcrumb: ["Tutorials", "Algorithms & DP", "Dynamic Programming", "0/1 Knapsack"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "14 Oct, 2026",
    readingTime: "12 min read",
    likes: 3100,
    tags: ["Dynamic Programming", "Recursion", "Interview Questions"],
    relatedProblemId: "binary-search",
    summary: "Given weights and values of N items, put these items in a knapsack of capacity W to get the maximum total value without exceeding capacity.",
    sections: [
      {
        id: "statement",
        heading: "Problem Formulation",
        content: `Given items with weights \`wt[]\` and values \`val[]\`, choose items to maximize value such that their total weight $\\le W$. Each item can either be taken once (1) or left (0).`
      },
      {
        id: "recurrence",
        heading: "DP Recurrence Relation",
        content: `\`\`\`
dp[i][w] = max(val[i-1] + dp[i-1][w - wt[i-1]], dp[i-1][w])  // if wt[i-1] <= w
dp[i][w] = dp[i-1][w]                                        // otherwise
\`\`\``
      }
    ],
    codeSnippets: {
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

int knapsack(int W, const vector<int>& wt, const vector<int>& val, int n) {
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            if (wt[i - 1] <= w)
                dp[i][w] = max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w]);
            else
                dp[i][w] = dp[i - 1][w];
        }
    }
    return dp[n][W];
}`,
      java: `public class Knapsack {
    public static int solve(int W, int[] wt, int[] val, int n) {
        int[][] dp = new int[n + 1][W + 1];
        for (int i = 1; i <= n; i++) {
            for (int w = 0; w <= W; w++) {
                if (wt[i - 1] <= w) dp[i][w] = Math.max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w]);
                else dp[i][w] = dp[i - 1][w];
            }
        }
        return dp[n][W];
    }
}`,
      python: `def knapsack(W, wt, val, n):
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            if wt[i - 1] <= w:
                dp[i][w] = max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w])
            else:
                dp[i][w] = dp[i - 1][w]
    return dp[n][W]`,
      javascript: `function knapsack(W, wt, val, n) {
  const dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      if (wt[i - 1] <= w) {
        dp[i][w] = Math.max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w]);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }
  return dp[n][W];
}`
    },
    complexity: { time: "O(N * W)", space: "O(N * W) or O(W) with 1D array" },
    faqs: [{ q: "What is the difference between 0/1 and Fractional Knapsack?", a: "In Fractional Knapsack, items can be broken down, making it solvable greedily in O(N log N). In 0/1, items are atomic." }],
    quiz: {
      question: "Which algorithmic paradigm can solve the Fractional Knapsack problem optimally?",
      options: ["Greedy Approach", "Dynamic Programming", "Backtracking", "Divide and Conquer"],
      correctIndex: 0,
      explanation: "Fractional Knapsack can be solved by sorting items by value/weight ratio and greedily picking the highest ratio items."
    }
  },

  "lcs-dp": {
    id: "lcs-dp",
    title: "Longest Common Subsequence (LCS) - Dynamic Programming",
    breadcrumb: ["Tutorials", "Algorithms & DP", "Dynamic Programming", "LCS"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "13 Oct, 2026",
    readingTime: "10 min read",
    likes: 2750,
    tags: ["Dynamic Programming", "Strings", "Algorithms"],
    relatedProblemId: "binary-search",
    summary: "Find the length of the longest subsequence present in both strings in the same relative order without needing to be contiguous.",
    sections: [
      {
        id: "definition",
        heading: "Subsequence vs Substring",
        content: `A **subsequence** is derived by deleting zero or more characters from a string without changing the relative order of remaining characters. (e.g. \`"ace"\` is a subsequence of \`"abcde"\`, but not a substring).`
      },
      {
        id: "recurrence",
        heading: "Dynamic Programming State",
        content: `Let $dp[i][j]$ be the length of LCS of $S1[0..i-1]$ and $S2[0..j-1]$.
\`\`\`
If S1[i-1] == S2[j-1]:
    dp[i][j] = 1 + dp[i-1][j-1]
Else:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
\`\`\``
      }
    ],
    codeSnippets: {
      cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int longestCommonSubsequence(string text1, string text2) {
    int m = text1.size(), n = text2.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1[i - 1] == text2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}`,
      java: `public class LCS {
    public static int solve(String s1, String s2) {
        int m = s1.length(), n = s2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) dp[i][j] = 1 + dp[i - 1][j - 1];
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][n];
    }
}`,
      python: `def longest_common_subsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = 1 + dp[i - 1][j - 1]
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]`,
      javascript: `function longestCommonSubsequence(text1, text2) {
  const m = text1.length, n = text2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}`
    },
    complexity: { time: "O(M * N)", space: "O(M * N) or O(min(M, N)) space optimized" },
    faqs: [{ q: "How can LCS be printed, not just its length?", a: "Backtrack from dp[m][n]: if characters match, prepend to result and step diagonally (i-1, j-1); otherwise move in the direction of the larger cell." }],
    quiz: {
      question: "What is the LCS of 'AGGTAB' and 'GXTXAYB'?",
      options: ["GTAB", "AGTAB", "GXTAB", "GTABY"],
      correctIndex: 0,
      explanation: "'GTAB' of length 4 is the longest subsequence common to both strings."
    }
  },

  "graph-bfs-dfs": {
    id: "graph-bfs-dfs",
    title: "Graph Traversal Algorithms - BFS & DFS",
    breadcrumb: ["Tutorials", "Algorithms & DP", "Graphs", "BFS & DFS"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "12 Oct, 2026",
    readingTime: "11 min read",
    likes: 2900,
    tags: ["Graphs", "BFS", "DFS", "Traversals"],
    relatedProblemId: "binary-search",
    summary: "Deep dive into Graph Breadth-First Search (queue-based level expansion) and Depth-First Search (stack/recursion-based deep exploration).",
    sections: [
      {
        id: "bfs",
        heading: "Breadth-First Search (BFS)",
        content: `BFS visits all neighbor vertices at the current distance depth before moving deeper.
- Implemented using a **Queue (FIFO)**.
- Guaranteed to find the **shortest path in unweighted graphs**.`
      },
      {
        id: "dfs",
        heading: "Depth-First Search (DFS)",
        content: `DFS explores as far along each branch as possible before backtracking.
- Implemented using a **Stack (LIFO)** or call stack recursion.
- Ideal for connected components, topological sorting, detecting cycles, and pathfinding in mazes.`
      }
    ],
    codeSnippets: {
      cpp: `#include <vector>
#include <queue>
using namespace std;

vector<int> bfs(int V, vector<vector<int>>& adj) {
    vector<int> bfsOrder;
    vector<bool> visited(V, false);
    queue<int> q;
    visited[0] = true;
    q.push(0);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        bfsOrder.push_back(u);
        for (int v : adj[u]) {
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
        }
    }
    return bfsOrder;
}`,
      java: `public class GraphTraversal {
    public List<Integer> bfs(int V, List<List<Integer>> adj) {
        List<Integer> res = new ArrayList<>();
        boolean[] vis = new boolean[V];
        Queue<Integer> q = new LinkedList<>();
        vis[0] = true; q.add(0);
        while (!q.isEmpty()) {
            int u = q.poll(); res.add(u);
            for (int v : adj.get(u)) {
                if (!vis[v]) { vis[v] = true; q.add(v); }
            }
        }
        return res;
    }
}`,
      python: `from collections import deque

def bfs(V, adj):
    visited = [False] * V
    order = []
    q = deque([0])
    visited[0] = True
    while q:
        u = q.popleft()
        order.append(u)
        for v in adj[u]:
            if not visited[v]:
                visited[v] = True
                q.append(v)
    return order`,
      javascript: `function bfs(V, adj) {
  const visited = new Array(V).fill(false);
  const order = [];
  const q = [0];
  visited[0] = true;
  while (q.length) {
    const u = q.shift();
    order.push(u);
    for (const v of adj[u]) {
      if (!visited[v]) {
        visited[v] = true;
        q.push(v);
      }
    }
  }
  return order;
}`
    },
    complexity: { time: "O(V + E)", space: "O(V)" },
    faqs: [{ q: "Why use BFS for shortest path?", a: "In unweighted graphs, BFS explores vertices in strictly increasing order of path length from the source." }],
    quiz: {
      question: "Which data structure is primarily used to implement Breadth-First Search (BFS)?",
      options: ["Queue", "Stack", "Priority Queue", "Hash Map"],
      correctIndex: 0,
      explanation: "BFS processes nodes in FIFO order using a Queue."
    }
  },

  "dijkstra-shortest-path": {
    id: "dijkstra-shortest-path",
    title: "Dijkstra's Shortest Path Algorithm - Priority Queue",
    breadcrumb: ["Tutorials", "Algorithms & DP", "Graphs", "Dijkstra"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "11 Oct, 2026",
    readingTime: "14 min read",
    likes: 3400,
    tags: ["Graphs", "Shortest Path", "Greedy", "Dijkstra"],
    relatedProblemId: "binary-search",
    summary: "Dijkstra's algorithm finds the shortest path from a starting vertex to all other vertices in a weighted graph with non-negative edge weights.",
    sections: [
      {
        id: "principles",
        heading: "Greedy Relaxation",
        content: `Dijkstra's algorithm repeatedly picks the vertex $U$ with the minimum tentative distance, finalizes its shortest path, and **relaxes** all of its outgoing edges $(U, V, W)$:
\`\`\`
if dist[U] + W < dist[V]:
    dist[V] = dist[U] + W
\`\`\``
      }
    ],
    codeSnippets: {
      cpp: `#include <vector>
#include <queue>
using namespace std;

vector<int> dijkstra(int V, vector<vector<pair<int, int>>>& adj, int S) {
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    vector<int> dist(V, 1e9);
    dist[S] = 0;
    pq.push({0, S});
    while (!pq.empty()) {
        int d = pq.top().first, u = pq.top().second;
        pq.pop();
        if (d > dist[u]) continue;
        for (auto& edge : adj[u]) {
            int v = edge.first, w = edge.second;
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}`,
      java: `public class Dijkstra {
    public static int[] shortestPath(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.add(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] curr = pq.poll();
            int d = curr[0], u = curr[1];
            if (d > dist[u]) continue;
            for (int[] edge : adj.get(u)) {
                int v = edge[0], w = edge[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.add(new int[]{dist[v], v});
                }
            }
        }
        return dist;
    }
}`,
      python: `import heapq

def dijkstra(V, adj, src):
    dist = [float('inf')] * V
    dist[src] = 0
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))
    return dist`,
      javascript: `function dijkstra(V, edges, src) {
  const adj = Array.from({ length: V }, () => []);
  for (let [u, v, w] of edges) adj[u].push([v, w]);
  const dist = Array(V).fill(Infinity);
  dist[src] = 0;
  const pq = [[0, src]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (d > dist[u]) continue;
    for (let [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        pq.push([dist[v], v]);
      }
    }
  }
  return dist;
}`
    },
    complexity: { time: "O((V + E) log V)", space: "O(V + E)" },
    faqs: [{ q: "What algorithm should be used if edges have negative weights?", a: "Bellman-Ford algorithm can handle negative weights and detect negative cycles in O(V * E) time." }],
    quiz: {
      question: "What is the time complexity of Dijkstra's algorithm implemented with a Min-Heap / Priority Queue?",
      options: ["O((V + E) log V)", "O(V^2)", "O(V * E)", "O(V!)"],
      correctIndex: 0,
      explanation: "Using a binary min-heap, extracting min takes O(log V) and decreasing keys takes O(log V), yielding O((V + E) log V)."
    }
  },

  "lru-cache-design": {
    id: "lru-cache-design",
    title: "System Design: LRU Cache Implementation",
    breadcrumb: ["Tutorials", "System Design", "Caching", "LRU Cache"],
    author: {
      name: "Codificator Team",
      badge: "Staff Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "10 Oct, 2026",
    readingTime: "14 min read",
    likes: 4120,
    tags: ["System Design", "Caching", "Data Structures", "Hash Map"],
    relatedProblemId: "binary-search",
    summary: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) get and put operations.",
    sections: [
      {
        id: "why",
        heading: "Why Doubly Linked List + Hash Map?",
        content: `A simple array or singly linked list requires $O(N)$ time to shift or locate elements. By pairing a **Hash Map** ($O(1)$ key lookup to node) with a **Doubly Linked List** ($O(1)$ node unlink and insertion at head), both \`get(key)\` and \`put(key, value)\` execute in deterministic constant time $O(1)$.`
      }
    ],
    codeSnippets: {
      cpp: `#include <unordered_map>
using namespace std;

class LRUCache {
    struct Node { int k, v; Node *prev, *next; Node(int _k, int _v): k(_k), v(_v), prev(nullptr), next(nullptr) {} };
    int cap;
    unordered_map<int, Node*> map;
    Node *head, *tail;
    void remove(Node* n) { n->prev->next = n->next; n->next->prev = n->prev; }
    void add(Node* n) { n->next = head->next; n->prev = head; head->next->prev = n; head->next = n; }
public:
    LRUCache(int c): cap(c) { head = new Node(-1,-1); tail = new Node(-1,-1); head->next = tail; tail->prev = head; }
    int get(int k) { if (!map.count(k)) return -1; Node* n = map[k]; remove(n); add(n); return n->v; }
    void put(int k, int v) {
        if (map.count(k)) { Node* n = map[k]; n->v = v; remove(n); add(n); }
        else {
            if (map.size() == cap) { Node* lru = tail->prev; map.erase(lru->k); remove(lru); delete lru; }
            Node* nn = new Node(k, v); map[k] = nn; add(nn);
        }
    }
};`,
      java: `import java.util.*;
public class LRUCache {
    class Node { int k, v; Node p, n; Node(int _k, int _v) { k = _k; v = _v; } }
    private final int cap;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);
    public LRUCache(int capacity) { cap = capacity; head.n = tail; tail.p = head; }
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node node = map.get(key); remove(node); add(node); return node.v;
    }
    public void put(int key, int value) {
        if (map.containsKey(key)) { Node node = map.get(key); node.v = value; remove(node); add(node); }
        else {
            if (map.size() == cap) { Node lru = tail.p; map.remove(lru.k); remove(lru); }
            Node nn = new Node(key, value); map.put(key, nn); add(nn);
        }
    }
    private void remove(Node node) { node.p.n = node.n; node.n.p = node.p; }
    private void add(Node node) { node.n = head.n; node.p = head; head.n.p = node; head.n = node; }
}`,
      python: `class Node:
    def __init__(self, k=0, v=0):
        self.k, self.v = k, v
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = {}
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _add(self, node):
        node.next, node.prev = self.head.next, self.head
        self.head.next.prev = self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache: return -1
        node = self.cache[key]
        self._remove(node)
        self._add(node)
        return node.v

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            node = self.cache[key]
            node.v = value
            self._remove(node)
            self._add(node)
        else:
            if len(self.cache) == self.cap:
                lru = self.tail.prev
                del self.cache[lru.k]
                self._remove(lru)
            node = Node(key, value)
            self.cache[key] = node
            self._add(node)`,
      javascript: `class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.cap) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
}`
    },
    complexity: { time: "O(1) for get() and put()", space: "O(Capacity)" },
    faqs: [{ q: "What is LFU cache?", a: "LFU (Least Frequently Used) evicts based on access frequency counter rather than most recent timestamp." }],
    quiz: {
      question: "Which two data structures are combined to achieve O(1) time complexity in LRU Cache?",
      options: ["Hash Map + Doubly Linked List", "Binary Search Tree + Array", "Queue + Stack", "Heap + Trie"],
      correctIndex: 0,
      explanation: "Hash Map offers O(1) lookup to nodes, while Doubly Linked List offers O(1) pointer updates for head insertion and tail eviction."
    }
  },

  "load-balancer": {
    id: "load-balancer",
    title: "System Design: Load Balancers & Algorithms",
    breadcrumb: ["Tutorials", "System Design", "Scalability", "Load Balancing"],
    author: {
      name: "Codificator Team",
      badge: "Staff Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "09 Oct, 2026",
    readingTime: "10 min read",
    likes: 3100,
    tags: ["System Design", "Networking", "Architecture", "Load Balancers"],
    relatedProblemId: "binary-search",
    summary: "Comprehensive guide to Layer 4 and Layer 7 load balancers, health checks, SSL termination, and routing algorithms (Round Robin, Least Connections, IP Hash).",
    sections: [
      {
        id: "l4-vs-l7",
        heading: "Layer 4 vs Layer 7 Load Balancing",
        content: `- **Layer 4 (L4):** Operates at transport layer (TCP/UDP). Forwards raw packets based on IP address and port without inspecting HTTP payload. Extremely high packet throughput (e.g. AWS Network Load Balancer).
- **Layer 7 (L7):** Operates at application layer (HTTP/HTTPS/gRPC). Can route intelligently based on cookies, path (\`/api/v1/orders\`), and HTTP headers (e.g. NGINX, HAProxy, AWS ALB).`
      },
      {
        id: "algorithms",
        heading: "Core Routing Algorithms",
        content: `1. **Round Robin:** Requests distributed sequentially across healthy servers.
2. **Weighted Round Robin:** Assigns higher request shares to more powerful server specs.
3. **Least Connections:** Routes to the server currently handling the fewest active connections.
4. **IP Hash:** Hashes client IP to ensure sticky session affinity to the same server.`
      }
    ],
    codeSnippets: {
      cpp: `// Simple Round-Robin Load Balancer simulator
#include <vector>
#include <string>
using namespace std;

class RoundRobinLB {
    vector<string> servers;
    int curr = 0;
public:
    RoundRobinLB(vector<string> s) : servers(s) {}
    string getNextServer() {
        if (servers.empty()) return "";
        string s = servers[curr];
        curr = (curr + 1) % servers.size();
        return s;
    }
};`,
      java: `public class RoundRobinLB {
    private final List<String> servers;
    private final AtomicInteger index = new AtomicInteger(0);
    public RoundRobinLB(List<String> servers) { this.servers = servers; }
    public String getNextServer() {
        int i = index.getAndIncrement() % servers.size();
        return servers.get(Math.abs(i));
    }
}`,
      python: `class RoundRobinLB:
    def __init__(self, servers):
        self.servers = servers
        self.idx = 0

    def get_server(self):
        s = self.servers[self.idx]
        self.idx = (self.idx + 1) % len(self.servers)
        return s`,
      javascript: `class RoundRobinLB {
  constructor(servers) {
    this.servers = servers;
    this.idx = 0;
  }
  getNextServer() {
    const server = this.servers[this.idx];
    this.idx = (this.idx + 1) % this.servers.length;
    return server;
  }
}`
    },
    complexity: { time: "O(1) server selection", space: "O(Number of backend servers)" },
    faqs: [{ q: "What is SSL Termination?", a: "The load balancer decrypts incoming HTTPS traffic before forwarding plain HTTP to internal server pools, offloading CPU-intensive crypto from app servers." }],
    quiz: {
      question: "Which load balancing algorithm is best suited for long-lived WebSocket or database connection pools?",
      options: ["Least Connections", "Round Robin", "Random", "Modulo Hash"],
      correctIndex: 0,
      explanation: "Least Connections accounts for persistent session duration, routing new connections to whichever server currently has the lightest load."
    }
  },

  "consistent-hashing": {
    id: "consistent-hashing",
    title: "Consistent Hashing in Distributed Caching Systems",
    breadcrumb: ["Tutorials", "System Design", "Distributed Systems", "Consistent Hashing"],
    author: {
      name: "Codificator Team",
      badge: "Staff Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "08 Oct, 2026",
    readingTime: "13 min read",
    likes: 3850,
    tags: ["System Design", "Distributed Systems", "Hashing"],
    relatedProblemId: "binary-search",
    summary: "Consistent Hashing maps both keys and servers to a circular hash ring, ensuring when a server is added or removed, only K/N keys are remapped.",
    sections: [
      {
        id: "the-problem",
        heading: "The Rehashing Problem",
        content: `In a traditional modulo-based distributed cache \`server = hash(key) % N\`, when a server is added or removed ($N \\rightarrow N+1$), almost all cached keys remap to different servers, creating a **cache stampede** that crashes primary databases.`
      },
      {
        id: "hash-ring",
        heading: "Hash Ring & Virtual Nodes",
        content: `1. **Circular Ring (0 to 2^32 - 1):** Both servers and keys are hashed into the same address space.
2. **Clockwise Lookup:** A key travels clockwise along the ring until it encounters the first server.
3. **Virtual Nodes:** To prevent hotspot skew and uneven distribution, each physical node is replicated as multiple virtual points (e.g. \`node1-1\`, \`node1-2\`) across the ring.`
      }
    ],
    codeSnippets: {
      cpp: `// Consistent Hash Ring Concept (C++)
#include <map>
#include <string>
using namespace std;

class ConsistentHashRing {
    map<int, string> ring;
public:
    void addServer(int hashVal, string serverId) { ring[hashVal] = serverId; }
    string getServer(int keyHash) {
        auto it = ring.lower_bound(keyHash);
        if (it == ring.end()) it = ring.begin();
        return it->second;
    }
};`,
      python: `import bisect

class ConsistentHashRing:
    def __init__(self):
        self.ring = []
        self.node_map = {}

    def add_node(self, node_hash, node_id):
        bisect.insort(self.ring, node_hash)
        self.node_map[node_hash] = node_id

    def get_node(self, key_hash):
        idx = bisect.bisect_right(self.ring, key_hash)
        if idx == len(self.ring):
            idx = 0
        return self.node_map[self.ring[idx]]`,
      java: `import java.util.*;
public class ConsistentHashRing {
    private final TreeMap<Integer, String> ring = new TreeMap<>();
    public void addServer(int hash, String server) { ring.put(hash, server); }
    public String getServer(int keyHash) {
        Integer target = ring.ceilingKey(keyHash);
        if (target == null) target = ring.firstKey();
        return ring.get(target);
    }
}`,
      javascript: `class ConsistentHashRing {
  constructor() {
    this.nodes = [];
    this.map = new Map();
  }
  addNode(hash, id) {
    this.nodes.push(hash);
    this.nodes.sort((a, b) => a - b);
    this.map.set(hash, id);
  }
  getNode(keyHash) {
    const target = this.nodes.find(n => n >= keyHash) || this.nodes[0];
    return this.map.get(target);
  }
}`
    },
    complexity: { time: "O(log S) server lookup via binary search", space: "O(S * V) where V = virtual nodes" },
    faqs: [{ q: "What is the primary benefit?", a: "Only K/N keys need relocation during server scale up/down, avoiding complete cache invalidation." }],
    quiz: {
      question: "Why are 'virtual nodes' utilized in Consistent Hashing?",
      options: ["To ensure balanced key distribution across servers", "To encrypt cache keys", "To reduce RAM consumption", "To eliminate hashing collisions completely"],
      correctIndex: 0,
      explanation: "Virtual nodes spread each server across multiple positions on the ring to prevent non-uniform cluster hotspots."
    }
  },

  "rate-limiter": {
    id: "rate-limiter",
    title: "Design a Distributed Rate Limiter - Token Bucket & Redis",
    breadcrumb: ["Tutorials", "System Design", "Security & Resilience", "Rate Limiting"],
    author: {
      name: "Codificator Team",
      badge: "Staff Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "07 Oct, 2026",
    readingTime: "12 min read",
    likes: 3620,
    tags: ["System Design", "Rate Limiter", "Redis", "Distributed Systems"],
    relatedProblemId: "binary-search",
    summary: "Architecting a high-throughput, low-latency API rate limiter using Token Bucket, Sliding Window Logs, and distributed Redis Lua scripts.",
    sections: [
      {
        id: "algorithms",
        heading: "Rate Limiting Algorithms",
        content: `1. **Token Bucket:** Tokens are added at rate $R$ per second up to capacity $B$. Allows bursts up to $B$.
2. **Leaky Bucket:** Constant processing rate; excess drops or queues.
3. **Sliding Window Counter:** Blends past window and current window to eliminate border burst loopholes.`
      },
      {
        id: "redis-lua",
        heading: "Distributed Concurrency with Redis Lua",
        content: `In a multi-server setup, reading and updating token counters creates race conditions. Wrapping operations in an **atomic Redis Lua script** guarantees transactional isolation without locking overhead.`
      }
    ],
    codeSnippets: {
      cpp: `// Token bucket algorithm in C++
#include <chrono>
#include <algorithm>
using namespace std;
using namespace std::chrono;

class TokenBucket {
    double capacity, tokens, refillRate;
    steady_clock::time_point lastRefill;
public:
    TokenBucket(double cap, double rate): capacity(cap), tokens(cap), refillRate(rate), lastRefill(steady_clock::now()) {}
    bool allow() {
        auto now = steady_clock::now();
        double elapsed = duration_cast<duration<double>>(now - lastRefill).count();
        tokens = min(capacity, tokens + elapsed * refillRate);
        lastRefill = now;
        if (tokens >= 1.0) { tokens -= 1.0; return true; }
        return false;
    }
};`,
      java: `public class TokenBucket {
    private final double capacity, refillRate;
    private double tokens;
    private long lastRefill = System.currentTimeMillis();
    public TokenBucket(double capacity, double refillRate) {
        this.capacity = capacity; this.tokens = capacity; this.refillRate = refillRate;
    }
    public synchronized boolean allowRequest() {
        long now = System.currentTimeMillis();
        tokens = Math.min(capacity, tokens + ((now - lastRefill) / 1000.0) * refillRate);
        lastRefill = now;
        if (tokens >= 1) { tokens--; return true; }
        return false;
    }
}`,
      python: `import time

class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate
        self.last_refill = time.time()

    def allow_request(self):
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False`,
      javascript: `class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }
  allowRequest() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}`
    },
    complexity: { time: "O(1) memory lookup", space: "O(Number of client IDs in cache)" },
    faqs: [{ q: "What HTTP status code is returned when a user exceeds the rate limit?", a: "HTTP 429 Too Many Requests, accompanied by a 'Retry-After' header." }],
    quiz: {
      question: "Which HTTP status code must be returned to client applications when they exceed their API rate quota?",
      options: ["429 Too Many Requests", "403 Forbidden", "503 Service Unavailable", "400 Bad Request"],
      correctIndex: 0,
      explanation: "RFC 6585 specifies HTTP status code 429 for rate-limited requests."
    }
  },

  "os-process-threads": {
    id: "os-process-threads",
    title: "Operating Systems: Process vs Thread & Inter-Process Communication",
    breadcrumb: ["Tutorials", "Core CS Subjects", "Operating Systems", "Processes & Threads"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "06 Oct, 2026",
    readingTime: "9 min read",
    likes: 2890,
    tags: ["Operating Systems", "Threads", "Concurrency", "IPC"],
    relatedProblemId: "binary-search",
    summary: "Detailed comparison of processes and threads, PCB, context switching overhead, and IPC primitives (pipes, message queues, shared memory).",
    sections: [
      {
        id: "comparison",
        heading: "Process vs Thread",
        content: `- **Process:** An executing program with an independent virtual address space, memory (Text, Data, Heap, Stack), file descriptors, and Process Control Block (PCB). Creating and context switching processes involves heavy MMU/TLB invalidation.
- **Thread:** The smallest unit of CPU scheduling inside a process. Multiple threads within the same process share the Text segment, Data segment, Heap, and open files, but maintain private Stack, Registers, and Program Counter (PC).`
      },
      {
        id: "ipc",
        heading: "Inter-Process Communication (IPC)",
        content: `1. **Pipes & Named Pipes (FIFOs):** Unidirectional byte streams.
2. **Shared Memory:** Fastest IPC; processes map identical physical memory pages into their virtual space (requires semaphores to prevent race conditions).
3. **Sockets:** Network-capable bidirectional communication (Unix Domain Sockets or TCP/IP).`
      }
    ],
    codeSnippets: {
      cpp: `// POSIX pthread demonstration in C++
#include <iostream>
#include <thread>
using namespace std;

void worker(int id) {
    cout << "Thread " << id << " executing in shared heap space\\n";
}

int main() {
    thread t1(worker, 1);
    thread t2(worker, 2);
    t1.join();
    t2.join();
    return 0;
}`,
      java: `public class ThreadDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> System.out.println("Thread 1 running"));
        Thread t2 = new Thread(() -> System.out.println("Thread 2 running"));
        t1.start(); t2.start();
        t1.join(); t2.join();
    }
}`,
      python: `import threading

def worker(num):
    print(f"Thread {num} executing")

t1 = threading.Thread(target=worker, args=(1,))
t2 = threading.Thread(target=worker, args=(2,))
t1.start(); t2.start()
t1.join(); t2.join()`,
      javascript: `// In Node.js worker_threads allow thread concurrency
const { Worker, isMainThread, parentPort } = require('worker_threads');
if (isMainThread) {
  const worker = new Worker(__filename);
  worker.on('message', msg => console.log('Message from thread:', msg));
} else {
  parentPort.postMessage('Done');
}`
    },
    complexity: { time: "O(1) thread context switch < O(1) process context switch", space: "Private stack per thread" },
    faqs: [{ q: "What memory components do threads of the same process share?", a: "Code (Text), Global variables (Data/BSS), and dynamic allocations (Heap)." }],
    quiz: {
      question: "Which of the following is NOT shared between threads belonging to the same process?",
      options: ["Stack Memory & Registers", "Heap Memory", "Global Variables", "Open File Descriptors"],
      correctIndex: 0,
      explanation: "Each thread has its own private call stack, stack pointer, and registers to trace its own function execution."
    }
  },

  "dbms-indexing-acid": {
    id: "dbms-indexing-acid",
    title: "DBMS: Indexing (B-Trees) & ACID Transactions",
    breadcrumb: ["Tutorials", "Core CS Subjects", "DBMS", "Indexing & ACID"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "05 Oct, 2026",
    readingTime: "12 min read",
    likes: 3150,
    tags: ["DBMS", "SQL", "Indexing", "ACID", "Transactions"],
    relatedProblemId: "binary-search",
    summary: "In-depth guide to B-Tree & B+ Tree storage internals, clustered vs non-clustered indexes, and ACID transaction semantics (WAL, 2PL, MVCC).",
    sections: [
      {
        id: "b-tree-indexing",
        heading: "Why B+ Trees for Database Indexes?",
        content: `Standard binary search trees have high tree height for millions of rows, requiring too many slow disk I/O seeks.
- **B+ Tree:** A self-balancing multi-way search tree where internal nodes only store navigation keys, and **all records reside in leaf nodes** connected via a doubly linked list.
- **Benefit:** High branching factor (fan-out of 100-500) keeps tree depth to 3-4 levels for billions of records, and sequential leaf links make range scans (\`WHERE age BETWEEN 20 AND 30\`) blazing fast.`
      },
      {
        id: "acid",
        heading: "ACID Properties",
        content: `1. **Atomicity:** All operations in a transaction succeed, or all are rolled back (guaranteed via Write-Ahead Logging / Undo Logs).
2. **Consistency:** Database transitions only between valid states satisfying all constraints.
3. **Isolation:** Concurrent transactions execute without interfering (Isolation Levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable).
4. **Durability:** Committed transactions persist even in the event of power crashes (guaranteed via WAL / Redo Logs).`
      }
    ],
    codeSnippets: {
      cpp: `// SQL transactional query demonstration
/*
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;
*/`,
      java: `// Spring / JDBC Transactional annotation
/*
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void transferMoney(Long fromId, Long toId, BigDecimal amount) {
    accountRepo.debit(fromId, amount);
    accountRepo.credit(toId, amount);
}
*/`,
      python: `def transfer_money(cursor, from_acc, to_acc, amount):
    cursor.execute("BEGIN;")
    cursor.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_acc))
    cursor.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_acc))
    cursor.execute("COMMIT;")`,
      javascript: `async function transfer(client, fromId, toId, amount) {
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}`
    },
    complexity: { time: "O(log_B N) index lookup where B is fan-out", space: "O(N)" },
    faqs: [{ q: "What is the difference between Clustered and Non-Clustered Index?", a: "A Clustered Index dictates the physical ordering of data rows on disk (only 1 per table). Non-clustered indexes create a separate structure pointing back to primary keys." }],
    quiz: {
      question: "Why do relational database engines like MySQL InnoDB use B+ Trees rather than standard Binary Search Trees?",
      options: [
        "High branching factor minimizes disk block reads, and linked leaf nodes accelerate range scans",
        "B+ Trees use less memory than arrays",
        "Binary search trees cannot store integers",
        "B+ Trees eliminate the need for ACID transactions"
      ],
      correctIndex: 0,
      explanation: "B+ Trees have huge fan-out (hundreds of keys per node) reducing tree depth to 3-4 levels, minimizing costly disk page reads."
    }
  },

  "cn-tcp-handshake": {
    id: "cn-tcp-handshake",
    title: "Computer Networks: TCP 3-Way Handshake & UDP",
    breadcrumb: ["Tutorials", "Core CS Subjects", "Networks", "TCP & UDP"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "04 Oct, 2026",
    readingTime: "8 min read",
    likes: 2450,
    tags: ["Networks", "TCP", "UDP", "Handshake", "Protocols"],
    relatedProblemId: "binary-search",
    summary: "Detailed breakdown of connection establishment in TCP (SYN, SYN-ACK, ACK), flow control, congestion window, and why UDP is preferred for real-time streaming.",
    sections: [
      {
        id: "handshake",
        heading: "The TCP 3-Way Handshake",
        content: `1. **Step 1 (SYN):** Client generates random initial sequence number $ISN_C$ and sends \`SYN, Seq = ISN_C\` to server. (Client enters SYN-SENT).
2. **Step 2 (SYN-ACK):** Server receives SYN, allocates buffers, generates $ISN_S$, and responds with \`SYN-ACK, Seq = ISN_S, Ack = ISN_C + 1\`. (Server enters SYN-RECEIVED).
3. **Step 3 (ACK):** Client receives SYN-ACK and sends \`ACK, Seq = ISN_C + 1, Ack = ISN_S + 1\`. (Both enter ESTABLISHED). Data transmission begins.`
      },
      {
        id: "tcp-vs-udp",
        heading: "TCP vs UDP Comparison",
        content: `- **TCP:** Connection-oriented, reliable in-order delivery, retransmissions, flow control (sliding window), and congestion control. Slower due to handshakes and headers. Used in HTTP/HTTPS, SSH, FTP.
- **UDP:** Connectionless, unreliable, unordered, zero handshake delay, minimal 8-byte header overhead. Used in DNS queries, VoIP, live video conferencing, and online multiplayer gaming.`
      }
    ],
    codeSnippets: {
      cpp: `// Concept of TCP Socket Client in C++
#include <iostream>
#include <sys/socket.h>
#include <netinet/in.h>
using namespace std;

int createSocket() {
    int sock = socket(AF_INET, SOCK_STREAM, 0); // SOCK_STREAM = TCP
    return sock;
}`,
      java: `import java.net.*;
import java.io.*;

public class TCPClient {
    public static void main(String[] args) throws IOException {
        Socket socket = new Socket("localhost", 8080); // Initiates 3-way handshake
        PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
        out.println("Hello Server!");
        socket.close();
    }
}`,
      python: `import socket

def send_tcp_msg():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM) # TCP
    s.connect(("127.0.0.1", 8080)) # SYN -> SYN-ACK -> ACK
    s.sendall(b"Hello Codificator!")
    s.close()`,
      javascript: `const net = require('net');

const client = net.createConnection({ port: 8080 }, () => {
  console.log('Connected via TCP 3-way handshake!');
  client.write('Ping');
});`
    },
    complexity: { time: "1 RTT handshake before first data byte", space: "Socket buffer memory" },
    faqs: [{ q: "What is a SYN flood attack?", a: "An attacker sends a deluge of SYN packets with spoofed IP addresses without sending final ACKs, exhausting server connection backlog queues." }],
    quiz: {
      question: "What is the acknowledgment number (ACK) sent by the server in response to a client's SYN packet with sequence number 1000?",
      options: ["1001", "1000", "2000", "0"],
      correctIndex: 0,
      explanation: "The ACK indicates the next sequence number the server expects to receive, which is Seq + 1 = 1001."
    }
  },

  "python-decorators": {
    id: "python-decorators",
    title: "Python Advanced: Decorators, Generators & Global Interpreter Lock (GIL)",
    breadcrumb: ["Tutorials", "Programming Languages", "Python", "Decorators & GIL"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "16 Oct, 2026",
    readingTime: "9 min read",
    likes: 2780,
    tags: ["Python", "Decorators", "Generators", "GIL", "Languages"],
    relatedProblemId: "binary-search",
    summary: "Master Python metaprogramming with higher-order function decorators, memory-efficient generators with yield, and understanding CPython's GIL.",
    sections: [
      {
        id: "decorators",
        heading: "Python Decorators",
        content: `In Python, functions are first-class citizens. A decorator is a callable that takes another function as an argument, extends or modifies its behavior without modifying the original source code, and returns a callable.`
      },
      {
        id: "gil",
        heading: "The Global Interpreter Lock (GIL)",
        content: `CPython uses reference counting for garbage collection. To prevent concurrent threads from corrupting reference counters, the **GIL** ensures only one native thread executes Python bytecode at any given instant.
- **I/O-Bound Workloads:** Python threads release the GIL during network/disk I/O, allowing effective concurrency.
- **CPU-Bound Workloads:** Multi-threading cannot utilize multi-core CPUs; use \`multiprocessing\` or Python 3.13+ free-threaded build instead!`
      }
    ],
    codeSnippets: {
      python: `import time
from functools import wraps

def timeit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {(time.time() - start)*1000:.2f} ms")
        return result
    return wrapper

@timeit
def compute_squares(n):
    return [i ** 2 for i in range(n)]

print("Done:", len(compute_squares(100000)))`,
      cpp: `// Equivalent concept in C++: Functor wrapper
#include <iostream>
#include <chrono>
using namespace std;

template<typename F>
auto benchmark(F func) {
    return [=]() {
        auto t1 = chrono::high_resolution_clock::now();
        func();
        auto t2 = chrono::high_resolution_clock::now();
        cout << "Execution complete\\n";
    };
}`,
      java: `// Equivalent concept in Java: Dynamic Proxy or AspectJ
/*
@Around("@annotation(LogExecutionTime)")
public Object logTime(ProceedingJoinPoint joinPoint) throws Throwable {
    long start = System.currentTimeMillis();
    Object proceed = joinPoint.proceed();
    System.out.println("Executed in " + (System.currentTimeMillis() - start) + "ms");
    return proceed;
}
*/`,
      javascript: `// Equivalent concept in JS: Higher-order functions
function timeit(fn) {
  return function(...args) {
    const t0 = performance.now();
    const res = fn.apply(this, args);
    console.log(fn.name + " took " + (performance.now() - t0).toFixed(2) + " ms");
    return res;
  };
}`
    },
    complexity: { time: "O(1) decorator invocation overhead", space: "O(1)" },
    faqs: [{ q: "What does @functools.wraps do?", a: "It preserves the original function's name (__name__) and docstring (__doc__) on the wrapper." }],
    quiz: {
      question: "Why does standard CPython multithreading fail to achieve parallel speedup on CPU-bound mathematical tasks?",
      options: [
        "The Global Interpreter Lock (GIL) limits execution to one thread at a time in the Python interpreter",
        "CPython does not support multi-core CPUs",
        "Python integers have infinite precision",
        "CPython disables threading by default"
      ],
      correctIndex: 0,
      explanation: "CPython's GIL restricts bytecode execution to a single thread at any given moment to protect thread-unsafe reference counting."
    }
  },

  "java-hashmap-internal": {
    id: "java-hashmap-internal",
    title: "Internal Working of HashMap in Java 8+ (Buckets to Red-Black Trees)",
    breadcrumb: ["Tutorials", "Programming Languages", "Java", "HashMap Internals"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "15 Oct, 2026",
    readingTime: "11 min read",
    likes: 3340,
    tags: ["Java", "Collections", "HashMap", "Data Structures"],
    relatedProblemId: "binary-search",
    summary: "Deep architectural look into Java HashMap: hashing algorithm, bucket index calculation, collision resolution, and treeification to Red-Black trees in Java 8.",
    sections: [
      {
        id: "bucket-math",
        heading: "Bucket Index Calculation",
        content: `1. Call \`key.hashCode()\`.
2. Apply high-order perturbation: \`h = key.hashCode() ^ (h >>> 16)\` to spread bit variance into lower bits.
3. Compute bucket index via bitwise AND: \`index = (table.length - 1) & h\`. Because capacity is always a power of 2, bitwise AND is equivalent to modulo (\`%\`) but executes in a single CPU instruction!`
      },
      {
        id: "treeification",
        heading: "Treeification Threshold in Java 8",
        content: `Before Java 8, collisions were resolved purely with singly linked lists. In worst-case hash collision attacks, lookup degraded to $O(N)$.
In Java 8+:
- When a bucket chain length reaches **TREEIFY_THRESHOLD = 8** AND total capacity $\\ge 64$, the linked list converts into a **Red-Black Tree (TreeNode)**.
- Worst-case lookup time improves from $O(N)$ to **$O(\\log N)$**!
- If elements shrink to **UNTREEIFY_THRESHOLD = 6**, it transforms back to a singly linked list.`
      }
    ],
    codeSnippets: {
      java: `import java.util.HashMap;
import java.util.Map;

public class HashMapDemo {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>();
        map.put("Apple", 100);
        map.put("Banana", 200);
        System.out.println("Lookup: " + map.get("Apple")); // O(1) average
    }
}`,
      cpp: `#include <unordered_map>
#include <string>
#include <iostream>
using namespace std;

int main() {
    unordered_map<string, int> map;
    map["Apple"] = 100;
    cout << "Lookup: " << map["Apple"] << endl;
    return 0;
}`,
      python: `# Python dicts use open addressing with quadratic probing (compact dict since 3.6)
d = {"Apple": 100, "Banana": 200}
print("Lookup:", d["Apple"])`,
      javascript: `// JavaScript Map maintains insertion order with O(1) lookups
const map = new Map();
map.set("Apple", 100);
console.log("Lookup:", map.get("Apple"));`
    },
    complexity: { time: "O(1) average, O(log N) worst case in Java 8+", space: "O(N)" },
    faqs: [{ q: "What is the default load factor of Java HashMap?", a: "0.75. When size exceeds 75% of capacity, the table doubles in size (rehashing)." }],
    quiz: {
      question: "What is the threshold bucket length at which Java 8 converts a collision linked list into a Red-Black Tree?",
      options: ["8", "16", "4", "32"],
      correctIndex: 0,
      explanation: "Java 8 sets TREEIFY_THRESHOLD = 8. If bucket elements reach 8 and capacity >= 64, it treeifies to a Red-Black tree."
    }
  },

  "cpp-smart-pointers": {
    id: "cpp-smart-pointers",
    title: "C++ Smart Pointers: unique_ptr, shared_ptr & weak_ptr",
    breadcrumb: ["Tutorials", "Programming Languages", "C++", "Smart Pointers"],
    author: {
      name: "Codificator Team",
      badge: "Master Author",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
    },
    lastUpdated: "14 Oct, 2026",
    readingTime: "10 min read",
    likes: 2950,
    tags: ["C++", "Memory Management", "RAII", "Pointers"],
    relatedProblemId: "binary-search",
    summary: "Modern C++ memory management: RAII semantics, std::unique_ptr (exclusive ownership), std::shared_ptr (reference counting), and std::weak_ptr (cycle breaker).",
    sections: [
      {
        id: "unique-vs-shared",
        heading: "unique_ptr vs shared_ptr",
        content: `1. **\`std::unique_ptr\`:** Exclusive ownership. Cannot be copied, only moved (\`std::move\`). Zero memory overhead compared to raw pointers (zero-cost abstraction). Automatically calls delete when out of scope.
2. **\`std::shared_ptr\`:** Shared ownership backed by a heap-allocated **control block** holding a reference count and weak count. Thread-safe atomic increment/decrement.`
      },
      {
        id: "weak-ptr",
        heading: "Breaking Circular References with weak_ptr",
        content: `When two \`shared_ptr\` objects point to each other, their reference counts never drop to 0, causing a fatal memory leak.
\`std::weak_ptr\` observes an object managed by \`shared_ptr\` without incrementing reference count. Must call \`.lock()\` to convert to a temporary \`shared_ptr\` before dereferencing.`
      }
    ],
    codeSnippets: {
      cpp: `#include <iostream>
#include <memory>
using namespace std;

class Resource {
public:
    Resource() { cout << "Acquired\\n"; }
    ~Resource() { cout << "Destroyed\\n"; }
};

int main() {
    unique_ptr<Resource> u = make_unique<Resource>();
    // unique_ptr automatically frees memory when scope exits (RAII)
    shared_ptr<Resource> s1 = make_shared<Resource>();
    shared_ptr<Resource> s2 = s1; // Ref count = 2
    cout << "Ref count: " << s1.use_count() << endl;
    return 0;
}`,
      java: `// Java handles memory via GC, but Closeable mirrors RAII
try (var resource = new AutoCloseableResource()) {
    // executes and auto-closes
}`,
      python: `import weakref

class Node:
    pass

n = Node()
w = weakref.ref(n) # Does not prevent garbage collection
print("Alive:", w() is not None)`,
      javascript: `// JavaScript WeakMap & WeakRef hold weak references without preventing GC
let target = { data: 42 };
const ref = new WeakRef(target);
console.log("Dereference:", ref.deref()?.data);`
    },
    complexity: { time: "O(1) allocation and deallocation", space: "Zero overhead for unique_ptr" },
    faqs: [{ q: "Why prefer std::make_shared over new?", a: "make_shared performs a single heap allocation for both the object and control block, improving cache locality and preventing leaks." }],
    quiz: {
      question: "Which C++ smart pointer provides exclusive ownership and zero runtime memory overhead compared to a raw pointer?",
      options: ["std::unique_ptr", "std::shared_ptr", "std::weak_ptr", "std::auto_ptr"],
      correctIndex: 0,
      explanation: "std::unique_ptr has no reference count control block and cannot be copied, guaranteeing zero overhead over a raw pointer."
    }
  }
};
