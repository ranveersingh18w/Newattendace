import hashlib
import hmac
import time

import requests

BASE_URL = "http://103.159.68.35:3536/api"
LOGIN_ENDPOINT = f"{BASE_URL}/student/auth/login"
SIGNATURE_KEY = "6ECD762D4776742AFFB192CE8A148"


def generate_signature() -> str:
    """Replicates the frontend’s Date.now() signature logic."""
    timestamp = str(int(time.time() * 1000))  # milliseconds
    digest = hmac.new(
        SIGNATURE_KEY.encode("utf-8"),
        timestamp.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{timestamp}.{digest}"


def login():
    payload = {
        "rollNumber": "24etcad011",
        "email": "takkrishna95@gmail.com",
        "password": "",
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-App-Signature": generate_signature(),
    }

    response = requests.post(LOGIN_ENDPOINT, json=payload, headers=headers, timeout=30)

    if response.ok:
        print("Login succeeded:", response.json())
    else:
        print(
            f"Login failed with status {response.status_code}: {response.text}"
        )


if __name__ == "__main__":
    login()