export const problemsList = [
  {
    id: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    points: 2,
    accuracy: "68.4%",
    submissions: "1.2M",
    tags: ["Searching", "Arrays", "Algorithms"],
    companies: ["Amazon", "Google", "Microsoft", "Infosys", "TCS"],
    description: `Given a sorted array of integers \`arr\` of size \`N\` and a target integer \`k\`, write a program to return the index of the element if present, else return \`-1\`.`,
    constraints: `1 <= N <= 10^5\n-10^9 <= arr[i], k <= 10^9\nArray elements are sorted in strictly ascending order.`,
    examples: [
      {
        input: "arr = [2, 5, 8, 12, 16, 23, 38, 56], k = 23",
        output: "5",
        explanation: "Element 23 appears at index 5."
      },
      {
        input: "arr = [1, 3, 5, 7, 9], k = 4",
        output: "-1",
        explanation: "Element 4 is not present in the array."
      }
    ],
    starterCode: {
      python: `def binary_search(arr, k):
    # Your code here
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == k:
            return mid
        elif arr[mid] < k:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
      javascript: `function binarySearch(arr, k) {
  // Your code here
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    let mid = Math.floor((low + high) / 2);
    if (arr[mid] === k) return mid;
    else if (arr[mid] < k) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
      cpp: `int binarySearch(vector<int>& arr, int k) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == k) return mid;
        else if (arr[mid] < k) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`,
      java: `class Solution {
    public int binarySearch(int[] arr, int k) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == k) return mid;
            else if (arr[mid] < k) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}`
    },
    testCases: [
      { input: { arr: [2, 5, 8, 12, 16, 23, 38, 56], k: 23 }, expected: 5 },
      { input: { arr: [1, 3, 5, 7, 9], k: 4 }, expected: -1 },
      { input: { arr: [10], k: 10 }, expected: 0 },
      { input: { arr: [-50, -20, 0, 30, 99], k: -20 }, expected: 1 },
      { input: { arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], k: 10 }, expected: 9 }
    ]
  },
  {
    id: "two-sum-sorted",
    title: "Pair with Given Sum in Sorted Array",
    difficulty: "Easy",
    points: 2,
    accuracy: "72.1%",
    submissions: "940k",
    tags: ["Arrays", "Two Pointers"],
    companies: ["Amazon", "Adobe", "Flipkart", "Paytm"],
    description: `You are given an array of integers \`arr\` sorted in non-decreasing order and a target value \`target\`. Determine if there exists two distinct indices such that their sum equals \`target\`. Return true or false.`,
    constraints: `2 <= arr.length <= 10^5\n-10^5 <= arr[i], target <= 10^5`,
    examples: [
      {
        input: "arr = [1, 2, 3, 4, 6], target = 6",
        output: "true",
        explanation: "arr[1] + arr[3] = 2 + 4 = 6."
      },
      {
        input: "arr = [2, 5, 9, 11], target = 10",
        output: "false",
        explanation: "No pair sums to 10."
      }
    ],
    starterCode: {
      python: `def has_pair(arr, target):
    l, r = 0, len(arr) - 1
    while l < r:
        s = arr[l] + arr[r]
        if s == target:
            return True
        elif s < target:
            l += 1
        else:
            r -= 1
    return False`,
      javascript: `function hasPair(arr, target) {
  let l = 0, r = arr.length - 1;
  while (l < r) {
    const s = arr[l] + arr[r];
    if (s === target) return true;
    else if (s < target) l++;
    else r--;
  }
  return false;
}`,
      cpp: `bool hasPair(vector<int>& arr, int target) {
    int l = 0, r = arr.size() - 1;
    while (l < r) {
        int s = arr[l] + arr[r];
        if (s == target) return true;
        if (s < target) l++;
        else r--;
    }
    return false;
}`,
      java: `class Solution {
    public boolean hasPair(int[] arr, int target) {
        int l = 0, r = arr.length - 1;
        while (l < r) {
            int s = arr[l] + arr[r];
            if (s == target) return true;
            if (s < target) l++;
            else r--;
        }
        return false;
    }
}`
    },
    testCases: [
      { input: { arr: [1, 2, 3, 4, 6], target: 6 }, expected: true },
      { input: { arr: [2, 5, 9, 11], target: 10 }, expected: false },
      { input: { arr: [-10, -5, 0, 5, 10], target: 0 }, expected: true }
    ]
  },
  {
    id: "reverse-linked-list",
    title: "Reverse a Linked List",
    difficulty: "Easy",
    points: 2,
    accuracy: "79.2%",
    submissions: "1.5M",
    tags: ["Linked List"],
    companies: ["Microsoft", "Google", "Amazon", "Cisco", "Meta"],
    description: `Given the pointer to the head of a singly linked list, reverse the list and return the values of the reversed linked list.`,
    constraints: `0 <= Number of nodes <= 10^5\n-10^5 <= Node.val <= 10^5`,
    examples: [
      {
        input: "head = [1, 2, 3, 4, 5]",
        output: "[5, 4, 3, 2, 1]",
        explanation: "The direction of all node pointers is inverted."
      }
    ],
    starterCode: {
      python: `def reverse_list(arr):
    # Simulated on list values
    return arr[::-1]`,
      javascript: `function reverseList(arr) {
  // Simulated on list values
  return arr.slice().reverse();
}`,
      cpp: `vector<int> reverseList(vector<int>& arr) {
    reverse(arr.begin(), arr.end());
    return arr;
}`,
      java: `class Solution {
    public int[] reverseList(int[] arr) {
        int l = 0, r = arr.length - 1;
        while (l < r) {
            int t = arr[l]; arr[l] = arr[r]; arr[r] = t;
            l++; r--;
        }
        return arr;
    }
}`
    },
    testCases: [
      { input: { arr: [1, 2, 3, 4, 5] }, expected: [5, 4, 3, 2, 1] },
      { input: { arr: [1, 2] }, expected: [2, 1] },
      { input: { arr: [100] }, expected: [100] }
    ]
  },
  {
    id: "merge-intervals",
    title: "Merge Overlapping Intervals",
    difficulty: "Medium",
    points: 4,
    accuracy: "52.3%",
    submissions: "820k",
    tags: ["Arrays", "Sorting", "Intervals"],
    companies: ["Google", "Amazon", "Microsoft", "Meta", "Uber"],
    description: `Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    constraints: `1 <= intervals.length <= 10^5\n0 <= start_i <= end_i <= 10^5`,
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation: "Intervals [1,3] and [2,6] overlap, merging them into [1,6]."
      }
    ],
    starterCode: {
      python: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = []
    for interval in intervals:
        if not merged or merged[-1][1] < interval[0]:
            merged.append(interval)
        else:
            merged[-1][1] = max(merged[-1][1], interval[1])
    return merged`,
      javascript: `function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (let interval of intervals) {
    if (!merged.length || merged[merged.length - 1][1] < interval[0]) {
      merged.push(interval);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], interval[1]);
    }
  }
  return merged;
}`,
      cpp: `vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> merged;
    for (auto& interval : intervals) {
        if (merged.empty() || merged.back()[1] < interval[0]) {
            merged.push_back(interval);
        } else {
            merged.back()[1] = max(merged.back()[1], interval[1]);
        }
    }
    return merged;
}`,
      java: `class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] interval : intervals) {
            if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < interval[0]) {
                merged.add(interval);
            } else {
                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], interval[1]);
            }
        }
        return merged.toArray(new int[merged.size()][]);
    }
}`
    },
    testCases: [
      {
        input: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] },
        expected: [[1, 6], [8, 10], [15, 18]]
      },
      {
        input: { intervals: [[1, 4], [4, 5]] },
        expected: [[1, 5]]
      }
    ]
  },
  {
    id: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    points: 8,
    accuracy: "46.8%",
    submissions: "710k",
    tags: ["Arrays", "Two Pointers", "Dynamic Programming"],
    companies: ["Amazon", "Google", "Microsoft", "Goldman Sachs"],
    description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    constraints: `n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5`,
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "The elevation map traps 6 total units of rain water."
      }
    ],
    starterCode: {
      python: `def trap(height):
    l, r = 0, len(height) - 1
    left_max = right_max = water = 0
    while l <= r:
        if height[l] <= height[r]:
            if height[l] >= left_max:
                left_max = height[l]
            else:
                water += left_max - height[l]
            l += 1
        else:
            if height[r] >= right_max:
                right_max = height[r]
            else:
                water += right_max - height[r]
            r -= 1
    return water`,
      javascript: `function trap(height) {
  let l = 0, r = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;
  while (l <= r) {
    if (height[l] <= height[r]) {
      if (height[l] >= leftMax) leftMax = height[l];
      else water += leftMax - height[l];
      l++;
    } else {
      if (height[r] >= rightMax) rightMax = height[r];
      else water += rightMax - height[r];
      r--;
    }
  }
  return water;
}`,
      cpp: `int trap(vector<int>& height) {
    int l = 0, r = height.size() - 1, leftMax = 0, rightMax = 0, water = 0;
    while (l <= r) {
        if (height[l] <= height[r]) {
            if (height[l] >= leftMax) leftMax = height[l];
            else water += leftMax - height[l];
            l++;
        } else {
            if (height[r] >= rightMax) rightMax = height[r];
            else water += rightMax - height[r];
            r--;
        }
    }
    return water;
}`,
      java: `class Solution {
    public int trap(int[] height) {
        int l = 0, r = height.length - 1, leftMax = 0, rightMax = 0, water = 0;
        while (l <= r) {
            if (height[l] <= height[r]) {
                if (height[l] >= leftMax) leftMax = height[l];
                else water += leftMax - height[l];
                l++;
            } else {
                if (height[r] >= rightMax) rightMax = height[r];
                else water += rightMax - height[r];
                r--;
            }
        }
        return water;
    }
}`
    },
    testCases: [
      { input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] }, expected: 6 },
      { input: { height: [4, 2, 0, 3, 2, 5] }, expected: 9 }
    ]
  },
  {
    id: "coin-change",
    title: "Coin Change (Minimum Coins)",
    difficulty: "Medium",
    points: 4,
    accuracy: "42.5%",
    submissions: "650k",
    tags: ["Dynamic Programming", "Recursion"],
    companies: ["Amazon", "Morgan Stanley", "Samsung", "Adobe"],
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.`,
    constraints: `1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4`,
    examples: [
      {
        input: "coins = [1, 2, 5], amount = 11",
        output: "3",
        explanation: "11 = 5 + 5 + 1 (3 coins)."
      },
      {
        input: "coins = [2], amount = 3",
        output: "-1",
        explanation: "Amount 3 cannot be formed using only coin 2."
      }
    ],
    starterCode: {
      python: `def coinChange(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
      javascript: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let coin of coins) {
    for (let x = coin; x <= amount; x++) {
      dp[x] = Math.min(dp[x], dp[x - coin] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
      cpp: `int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, 1e9);
    dp[0] = 0;
    for (int coin : coins) {
        for (int x = coin; x <= amount; x++) {
            dp[x] = min(dp[x], dp[x - coin] + 1);
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}`,
      java: `class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int coin : coins) {
            for (int x = coin; x <= amount; x++) {
                dp[x] = Math.min(dp[x], dp[x - coin] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}`
    },
    testCases: [
      { input: { coins: [1, 2, 5], amount: 11 }, expected: 3 },
      { input: { coins: [2], amount: 3 }, expected: -1 },
      { input: { coins: [1], amount: 0 }, expected: 0 }
    ]
  }
];
