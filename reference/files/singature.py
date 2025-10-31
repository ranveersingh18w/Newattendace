import hmac, hashlib, time

SIGNATURE_KEY = "6ECD762D4776742AFFB192CE8A148"

timestamp = str(int(time.time() * 1000))
digest = hmac.new(SIGNATURE_KEY.encode(), timestamp.encode(), hashlib.sha256).hexdigest()
print(f"{timestamp}.{digest}")
