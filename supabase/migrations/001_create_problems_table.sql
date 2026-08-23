-- Migration: Create problems table

CREATE TABLE IF NOT EXISTS public.problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    starter_code TEXT NOT NULL,
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Optional but good practice)
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone
CREATE POLICY "Allow public read access on problems"
    ON public.problems
    FOR SELECT
    USING (true);

-- Allow insert/update access to anyone for now (since we don't have an admin role set up yet)
CREATE POLICY "Allow public insert on problems"
    ON public.problems
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on problems"
    ON public.problems
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Insert initial data
INSERT INTO public.problems (id, title, description, starter_code, test_cases)
VALUES
(
    'two-sum',
    '1. Two Sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    '#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        \n    }\n};\n',
    '[
        {
            "id": "tc_1",
            "input": "4\n2 7 11 15\n9\n",
            "expected_output": "0 1\n"
        },
        {
            "id": "tc_2",
            "input": "3\n3 2 4\n6\n",
            "expected_output": "1 2\n"
        },
        {
            "id": "tc_3",
            "input": "2\n3 3\n6\n",
            "expected_output": "0 1\n"
        }
    ]'::jsonb
),
(
    'reverse-linked-list',
    '2. Reverse Linked List',
    'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    '#include <iostream>\n\nusing namespace std;\n\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode(int x) : val(x), next(NULL) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your code here\n        \n    }\n};\n',
    '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
