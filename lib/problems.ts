/**
 * Problem definitions for the interview platform.
 *
 * Each problem has an ID, display title, description text,
 * and C++ starter code that gets inserted into the editor.
 */

export interface Problem {
  id: string;
  title: string;
  description: string;
  starterCode: string;
}

export const PROBLEMS: Record<string, Problem> = {
  'two-sum': {
    id: 'two-sum',
    title: '1. Two Sum',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    starterCode: `#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        \n    }\n};\n`,
  },
  'reverse-linked-list': {
    id: 'reverse-linked-list',
    title: '2. Reverse Linked List',
    description:
      'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    starterCode: `#include <iostream>\n\nusing namespace std;\n\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode(int x) : val(x), next(NULL) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your code here\n        \n    }\n};\n`,
  },
};
