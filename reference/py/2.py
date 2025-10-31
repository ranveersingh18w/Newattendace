import requests
import hmac
import hashlib
import time
import binascii

# Generate timestamp in milliseconds
timestamp = int(time.time() * 1000)

# Create signature using HMAC-SHA256 (binary digest converted to hex)
secret_key = "6ECD762D4776742AFFB192CE8A148"
digest = hmac.new(
    secret_key.encode(),
    str(timestamp).encode(),
    hashlib.sha256
).digest()
digest_hex = binascii.hexlify(digest).decode()

# Prepare headers
headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-App-Signature": f"{timestamp}.{digest_hex}"
}

# Prepare request data
data = {
    "email": "aaditya@technonjr.org",
    "password": "Rsd"
}

# Make the POST request
url = "http://103.159.68.35:3536/api/auth/login"
response = requests.post(url, json=data, headers=headers)

# Print response
print(response.text)
