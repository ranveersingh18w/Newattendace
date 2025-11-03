"""
FETCH AND PRINT RECENT RECORDS & ALL RECORDS
Auto-login to get fresh token
"""

import requests
import json
from datetime import datetime
from typing import List, Dict, Any

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

BASE_URL = "http://103.159.68.35:3536"

LOGIN_CREDENTIALS = {
    "rollNumber": "24ETCAD024",
    "email": "ranveersingh18w@gmail.com",
    "password": "Rsdsingh@9602"
}

# ═══════════════════════════════════════════════════════════════════════════════
# LOGIN AND GET TOKEN
# ═══════════════════════════════════════════════════════════════════════════════

def login() -> str:
    """Login to get fresh JWT token"""
    try:
        url = f"{BASE_URL}/api/student/auth/login"
        print(f"\n🔐 Logging in...")
        
        response = requests.post(url, json=LOGIN_CREDENTIALS, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        token = data.get("token")
        student = data.get("student", {})
        
        print(f"✅ Login successful!")
        print(f"   Student: {student.get('name', 'Unknown')}")
        print(f"   Roll: {student.get('rollNumber', 'Unknown')}\n")
        
        return token
    
    except Exception as e:
        print(f"❌ Login error: {e}\n")
        return None

def fetch_recent_records(token: str) -> List[Dict[str, Any]]:
    """Fetch recent 10 attendance records from stats API"""
    try:
        url = f"{BASE_URL}/api/student/dashboard/stats"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        print(f"🔄 Fetching Recent Records from: {url}")
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        recent_activity = data.get("recentActivity", [])
        
        print(f"✅ Successfully fetched {len(recent_activity)} recent records\n")
        return recent_activity
    
    except Exception as e:
        print(f"❌ Error fetching recent records: {e}\n")
        return []


def fetch_all_records(token: str) -> List[Dict[str, Any]]:
    """Fetch all attendance records with pagination"""
    try:
        print(f"🔄 Fetching All Records (with pagination)...")
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        page = 1
        all_records = []
        
        while True:
            url = f"{BASE_URL}/api/student/dashboard/attendance/records"
            params = {"page": page, "limit": 100}
            
            print(f"  Fetching page {page}...", end=" ")
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            records = data.get("records", [])
            all_records.extend(records)
            
            pagination = data.get("pagination", {})
            total_count = pagination.get("totalCount", 0)
            has_next = pagination.get("hasNextPage", False)
            
            print(f"✓ {len(records)} records (Total: {total_count})")
            
            if not has_next:
                break
            
            page += 1
        
        print(f"\n✅ Successfully fetched {len(all_records)} total records\n")
        return all_records
    
    except Exception as e:
        print(f"❌ Error fetching all records: {e}\n")
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# PRINT RECENT RECORDS
# ═══════════════════════════════════════════════════════════════════════════════

def print_recent_records(records: List[Dict[str, Any]]) -> None:
    """Print recent records in formatted table"""
    
    print("\n" + "="*120)
    print("RECENT RECORDS (Last 10 Activities)".center(120))
    print("="*120)
    
    if not records:
        print("No recent records found.")
        print("="*120 + "\n")
        return
    
    print(f"\n{'#':<3} {'Date':<15} {'Course':<45} {'Status':<12} {'Semester':<10} {'Section':<15}")
    print("-"*120)
    
    for idx, record in enumerate(records, 1):
        date = record.get("date", "N/A")[:10] if record.get("date") else "N/A"
        course = record.get("course", "Unknown")[:42]
        status = record.get("status", "N/A")
        semester = record.get("semester", "-")[:8]
        section = record.get("section", "-")[:13]
        
        status_icon = "✓" if status == "PRESENT" else ("✗" if status == "ABSENT" else "?")
        
        print(f"{idx:<3} {date:<15} {course:<45} {status_icon} {status:<10} {semester:<10} {section:<15}")
    
    print("="*120 + "\n")


# ═══════════════════════════════════════════════════════════════════════════════
# PRINT ALL RECORDS
# ═══════════════════════════════════════════════════════════════════════════════

def print_all_records(records: List[Dict[str, Any]]) -> None:
    """Print all records in formatted table"""
    
    print("\n" + "="*140)
    print("ALL ATTENDANCE RECORDS (Complete History)".center(140))
    print("="*140)
    
    if not records:
        print("No records found.")
        print("="*140 + "\n")
        return
    
    print(f"\n{'#':<4} {'Date':<12} {'Time':<10} {'Status':<10} {'Course':<40} {'Code':<8} {'Teacher':<20} {'Semester':<10}")
    print("-"*140)
    
    for idx, record in enumerate(records, 1):
        # Extract date
        date = record.get("date", "N/A")
        if date and date != "N/A":
            date = date[:10]
        
        # Extract time
        marked_at = record.get("markedAt", "N/A")
        if marked_at and marked_at != "N/A":
            try:
                time = datetime.fromisoformat(marked_at.replace('Z', '+00:00')).strftime("%H:%M")
            except:
                time = marked_at[:5]
        else:
            time = "N/A"
        
        # Extract status
        status = record.get("status", "N/A")
        status_icon = "✓" if status == "PRESENT" else ("✗" if status == "ABSENT" else "?")
        
        # Extract course info
        course_obj = record.get("course", {})
        course_name = course_obj.get("name", record.get("courseName", "Unknown"))[:37]
        course_code = course_obj.get("code", record.get("courseCode", "-"))[:6]
        
        # Extract teacher
        teacher_obj = record.get("teacher", {})
        teacher_name = teacher_obj.get("name", "-")[:18]
        
        # Extract semester
        semester = record.get("semester", "-")[:8]
        
        print(f"{idx:<4} {date:<12} {time:<10} {status_icon} {status:<8} {course_name:<40} {course_code:<8} {teacher_name:<20} {semester:<10}")
    
    print("="*140 + "\n")
    print(f"Total Records: {len(records)}\n")


# ═══════════════════════════════════════════════════════════════════════════════
# PRINT STATISTICS
# ═══════════════════════════════════════════════════════════════════════════════

def print_statistics(all_records: List[Dict[str, Any]]) -> None:
    """Print statistics about records"""
    
    print("\n" + "="*60)
    print("RECORDS STATISTICS".center(60))
    print("="*60)
    
    total = len(all_records)
    present = sum(1 for r in all_records if r.get("status") == "PRESENT")
    absent = sum(1 for r in all_records if r.get("status") == "ABSENT")
    other = total - present - absent
    
    attendance_percentage = (present / total * 100) if total > 0 else 0
    
    print(f"\nTotal Records:        {total}")
    print(f"Present:              {present} ({present/total*100:.1f}%)" if total > 0 else f"Present:              {present}")
    print(f"Absent:               {absent} ({absent/total*100:.1f}%)" if total > 0 else f"Absent:               {absent}")
    print(f"Other Status:         {other}")
    print(f"\nOverall Attendance:   {attendance_percentage:.1f}%")
    
    # Get unique courses
    courses = set()
    for record in all_records:
        course_obj = record.get("course", {})
        course_name = course_obj.get("name", record.get("courseName", "Unknown"))
        courses.add(course_name)
    
    print(f"Total Courses:        {len(courses)}")
    
    print("="*60 + "\n")


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT TO JSON (Optional)
# ═══════════════════════════════════════════════════════════════════════════════

def export_to_json(recent_records: List, all_records: List) -> None:
    """Export records to JSON file"""
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "recent_records": recent_records,
        "all_records": all_records,
        "summary": {
            "recent_count": len(recent_records),
            "all_records_count": len(all_records),
            "present": sum(1 for r in all_records if r.get("status") == "PRESENT"),
            "absent": sum(1 for r in all_records if r.get("status") == "ABSENT")
        }
    }
    
    try:
        with open("records_data.json", "w") as f:
            json.dump(data, f, indent=2)
        print("✅ Data exported to records_data.json\n")
    except Exception as e:
        print(f"⚠️  Could not export to JSON: {e}\n")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("\n" + "╔" + "═"*118 + "╗")
    print("║" + "ATTENDANCE RECORDS FETCHER - Recent & All Records".center(118) + "║")
    print("╚" + "═"*118 + "╝")
    
    # Login
    token = login()
    if not token:
        print("❌ Cannot proceed without valid token.\n")
        return
    
    # Fetch data
    print("📊 FETCHING DATA...")
    recent_records = fetch_recent_records(token)
    all_records = fetch_all_records(token)
    
    # Print results
    print("\n" + "█"*140)
    print_recent_records(recent_records)
    
    print("█"*140)
    print_all_records(all_records)
    
    print("█"*140)
    print_statistics(all_records)
    
    # Export option
    export_to_json(recent_records, all_records)
    
    print("\n" + "╔" + "═"*118 + "╗")
    print("║" + "✅ FETCHING COMPLETE".center(118) + "║")
    print("╚" + "═"*118 + "╝\n")


if __name__ == "__main__":
    main()
