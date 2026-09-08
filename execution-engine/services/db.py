import os
import requests
from fastapi import HTTPException

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")


def get_problem_from_db(problem_id: str) -> dict | None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=500, detail="Supabase credentials not configured."
        )

    url = f"{SUPABASE_URL}/rest/v1/problems?id=eq.{problem_id}&select=*"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        if not data or len(data) == 0:
            return None

        return data[0]
    except Exception as e:
        print(f"Error fetching problem from DB: {e}")
        return None
