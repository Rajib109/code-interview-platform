"""
Mock problem database.

Stores test case definitions for coding interview problems.
Inputs are formatted exactly as they will be fed into std::cin.
Expected outputs include the newline character for exact matching.
"""

PROBLEMS_DB = {
    "two-sum": {
        "title": "Two Sum",
        "test_cases": [
            {
                "id": "tc_1",
                "input": "4\n2 7 11 15\n9\n",      # N=4, array=[2,7,11,15], target=9
                "expected_output": "0 1\n",
            },
            {
                "id": "tc_2",
                "input": "3\n3 2 4\n6\n",            # N=3, array=[3,2,4], target=6
                "expected_output": "1 2\n",
            },
            {
                "id": "tc_3",
                "input": "2\n3 3\n6\n",              # N=2, array=[3,3], target=6
                "expected_output": "0 1\n",
            },
        ],
    }
}
