/**
 * Codificators Structured Coding Exercises Catalog
 * Synchronizes coding exercises and test cases into SQLite.
 */

import { runQuery, queryOne, queryAll, transaction } from '../db/db.js';

export const codingExercisesData = [
  // --- JAVASCRIPT EXERCISES ---
  {
    id: 'ex-js-1',
    course_id: 'course-fullstack-web',
    lesson_id: 'les-m4-1',
    title: 'Two Sum Target Indices',
    slug: 'two-sum-indices',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.
Return the answer sorted in ascending order of indices.

### Constraints:
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\``,
    difficulty: 'Easy',
    points: 5,
    language: 'javascript',
    function_name: 'twoSum',
    starter_code: `function twoSum(nums, target) {
  // Your code here
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`,
    sample_input: 'nums = [2, 7, 11, 15], target = 9',
    sample_output: '[0, 1]',
    hints: JSON.stringify([
      'A brute force solution takes O(N^2). Can you do it in O(N) using a Map?',
      'As you iterate through the array, calculate complement = target - nums[i].',
      'Check if complement is already in your Map. If so, return [map.get(complement), i].'
    ]),
    explanation: 'Using a JavaScript Map provides O(1) average lookup time, enabling a single O(N) pass over the array.',
    order_index: 1,
    test_cases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1], is_private: 0 },
      { input: [[3, 2, 4], 6], expected: [1, 2], is_private: 0 },
      { input: [[3, 3], 6], expected: [0, 1], is_private: 0 },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], is_private: 1 },
      { input: [[100, 200, 300, 400], 700], expected: [2, 3], is_private: 1 }
    ]
  },
  {
    id: 'ex-js-2',
    course_id: 'course-fullstack-web',
    lesson_id: 'les-m4-2',
    title: 'Valid Parentheses Checker',
    slug: 'valid-parentheses-checker',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Constraints:
- \`0 <= s.length <= 10^4\``,
    difficulty: 'Easy',
    points: 5,
    language: 'javascript',
    function_name: 'isValid',
    starter_code: `function isValid(s) {
  // Your code here
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (map[ch]) {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}
`,
    sample_input: 's = "()[]{}"',
    sample_output: 'true',
    hints: JSON.stringify([
      'Use a Stack (LIFO) data structure.',
      'Push opening brackets onto the stack.',
      'When encountering a closing bracket, pop from the stack and verify that it matches.'
    ]),
    explanation: 'A stack is ideal for nested bracket validation because the most recently opened bracket must be the first one closed.',
    order_index: 2,
    test_cases: [
      { input: ["()[]{}"], expected: true, is_private: 0 },
      { input: ["(]"], expected: false, is_private: 0 },
      { input: [""], expected: true, is_private: 0 },
      { input: ["([)]"], expected: false, is_private: 1 },
      { input: ["{[]}"], expected: true, is_private: 1 },
      { input: ["[((()))]"], expected: true, is_private: 1 },
      { input: [")("], expected: false, is_private: 1 }
    ]
  },
  {
    id: 'ex-js-3',
    course_id: 'course-fullstack-web',
    lesson_id: 'les-m4-3',
    title: 'Deep Array Flattener',
    slug: 'deep-array-flattener',
    description: `Write a function \`flattenArray(arr)\` that takes an arbitrarily nested array of items and returns a single, flat one-dimensional array.

Do not use the built-in \`Array.prototype.flat()\` method. Implement your solution recursively.

### Constraints:
- The input array can contain arbitrary levels of nesting.`,
    difficulty: 'Medium',
    points: 10,
    language: 'javascript',
    function_name: 'flattenArray',
    starter_code: `function flattenArray(arr) {
  // Your code here (implement recursively)
  const result = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flattenArray(item));
    } else {
      result.push(item);
    }
  }
  return result;
}
`,
    sample_input: 'arr = [1, [2, [3, [4]], 5]]',
    sample_output: '[1, 2, 3, 4, 5]',
    hints: JSON.stringify([
      'Check if an item is an array using Array.isArray(item).',
      'If it is an array, call flattenArray(item) recursively and spread the result.',
      'Otherwise, push the item directly to your accumulator.'
    ]),
    explanation: 'Recursive traversal processes each element; nested sub-arrays are unpacked until only primitive elements remain.',
    order_index: 3,
    test_cases: [
      { input: [[1, [2, [3, [4]], 5]]], expected: [1, 2, 3, 4, 5], is_private: 0 },
      { input: [[[1]]], expected: [1], is_private: 0 },
      { input: [[]], expected: [], is_private: 0 },
      { input: [[1, 2, 3]], expected: [1, 2, 3], is_private: 1 },
      { input: [[[[[10]], 20], 30]], expected: [10, 20, 30], is_private: 1 }
    ]
  }
];

/**
 * Synchronizes the coding exercises catalog into the SQLite database.
 */
export function syncCodingExercises() {
  transaction(() => {
    for (const ex of codingExercisesData) {
      const courseExists = queryOne('SELECT id FROM courses WHERE id = ?', [ex.course_id]);
      if (!courseExists) {
        continue;
      }

      // Upsert exercise
      const existing = queryOne('SELECT id FROM coding_exercises WHERE id = ?', [ex.id]);
      if (existing) {
        runQuery(
          `UPDATE coding_exercises SET
            course_id = ?, lesson_id = ?, title = ?, slug = ?, description = ?,
            difficulty = ?, points = ?, language = ?, function_name = ?,
            starter_code = ?, sample_input = ?, sample_output = ?, hints = ?,
            explanation = ?, order_index = ?
           WHERE id = ?`,
          [
            ex.course_id, ex.lesson_id, ex.title, ex.slug, ex.description,
            ex.difficulty, ex.points, ex.language, ex.function_name,
            ex.starter_code, ex.sample_input, ex.sample_output, ex.hints,
            ex.explanation, ex.order_index, ex.id
          ]
        );
      } else {
        runQuery(
          `INSERT INTO coding_exercises (
            id, course_id, lesson_id, title, slug, description,
            difficulty, points, language, function_name, starter_code,
            sample_input, sample_output, hints, explanation, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ex.id, ex.course_id, ex.lesson_id, ex.title, ex.slug, ex.description,
            ex.difficulty, ex.points, ex.language, ex.function_name, ex.starter_code,
            ex.sample_input, ex.sample_output, ex.hints, ex.explanation, ex.order_index
          ]
        );
      }

      // Sync test cases
      runQuery('DELETE FROM exercise_test_cases WHERE exercise_id = ?', [ex.id]);
      for (let i = 0; i < ex.test_cases.length; i++) {
        const tc = ex.test_cases[i];
        const tcId = `tc-${ex.id}-${i + 1}`;
        runQuery(
          `INSERT INTO exercise_test_cases (
            id, exercise_id, input_json, expected_output_json, is_private, order_index
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            tcId,
            ex.id,
            JSON.stringify(tc.input),
            JSON.stringify(tc.expected),
            tc.is_private ? 1 : 0,
            i + 1
          ]
        );
      }
    }
  });

  const totalExercises = queryOne('SELECT COUNT(*) as count FROM coding_exercises').count;
  const totalTestCases = queryOne('SELECT COUNT(*) as count FROM exercise_test_cases').count;
  console.log(`Synced ${totalExercises} coding exercises with ${totalTestCases} test cases.`);
}
