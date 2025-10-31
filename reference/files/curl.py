import hmac
import hashlib
import time

# --- Configuration ---
SIGNATURE_KEY = "6ECD762D4776742AFFB192CE8A148"
API_URL = "http://103.159.68.35:3536/api/student/auth/login"
ROLL_NUMBER = "24etcad024"
EMAIL = "ranveersingh18w@gmail.com"
PASSWORD = "Rsdsingh@9602"
OUTPUT_FILENAME = "run_this_in_powershell.txt"

# 1. Generate the timestamp and signature
timestamp = str(int(time.time() * 1000))
message = timestamp.encode('utf-8')
secret = SIGNATURE_KEY.encode('utf-8')
digest = hmac.new(secret, message, hashlib.sha256).hexdigest()
signature = f"{timestamp}.{digest}"

# 2. Construct the JSON payload
json_payload = f'{{"rollNumber":"{ROLL_NUMBER}","email":"{EMAIL}","password":"{PASSWORD}"}}'

# 3. Assemble the full PowerShell command into a single, clean line.
# This is the only command that will be generated.
powershell_command = f'Invoke-WebRequest -Uri "{API_URL}" -Method POST -Headers @{{"Content-Type"="application/json"; "Accept"="application/json"; "X-App-Signature"="{signature}"}} -Body \'{json_payload}\''

# 4. Write the clean command to the output file
try:
    with open(OUTPUT_FILENAME, "w") as f:
        f.write(powershell_command)
    
    # 5. Print clear, simple instructions to the user
    print(f"\n[SUCCESS] A new file has been created: {OUTPUT_FILENAME}")
    print("\nNext Steps:")
    print(f"  1. Open the '{OUTPUT_FILENAME}' file.")
    print(f"  2. Copy the entire line of text from the file.")
    print(f"  3. Paste it into your PowerShell terminal and press Enter.")

except Exception as e:
    print(f"\n[ERROR] Could not write to file: {e}")

