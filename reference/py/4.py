from __future__ import annotations

import argparse
import hashlib
import hmac
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from getpass import getpass
from typing import Iterable, Optional

import requests


API_BASE_URL = "http://103.159.68.35:3536/api"
SIGNATURE_KEY = "6ECD762D4776742AFFB192CE8A148"
REQUEST_TIMEOUT = 30
DEFAULT_MAX_ITEMS = 5
DEFAULT_PAGE_SIZE = 100

ENV_ROLL_KEYS = ("TNJR_ROLL_NUMBER", "ROLL_NUMBER")
ENV_EMAIL_KEYS = ("TNJR_EMAIL", "EMAIL")
ENV_PASSWORD_KEYS = ("TNJR_PASSWORD", "PASSWORD")


def _parse_iso(timestamp: Optional[str]) -> Optional[datetime]:
	if not timestamp:
		return None
	if timestamp.endswith("Z"):
		timestamp = timestamp[:-1] + "+00:00"
	try:
		return datetime.fromisoformat(timestamp)
	except ValueError:
		return None


class ApiClient:
	"""HTTP client mirroring the web bundle's behaviour."""

	def __init__(self, base_url: str = API_BASE_URL) -> None:
		self.base_url = base_url.rstrip("/")
		self.session = requests.Session()
		self.token: Optional[str] = None

	def _signature(self) -> str:
		timestamp = str(int(time.time() * 1000))
		digest = hmac.new(
			SIGNATURE_KEY.encode("utf-8"),
			timestamp.encode("utf-8"),
			hashlib.sha256,
		).hexdigest()
		return f"{timestamp}.{digest}"

	def _request(self, method: str, path: str, **kwargs):
		url = f"{self.base_url}{path}"
		headers = kwargs.pop("headers", {})
		headers.setdefault("Accept", "application/json")
		if method.upper() in {"POST", "PUT", "PATCH"}:
			headers.setdefault("Content-Type", "application/json")
		headers["X-App-Signature"] = self._signature()
		if self.token:
			headers["Authorization"] = f"Bearer {self.token}"
		response = self.session.request(
			method=method,
			url=url,
			headers=headers,
			timeout=REQUEST_TIMEOUT,
			**kwargs,
		)
		response.raise_for_status()
		return response

	def login(self, roll_number: str, email: str, password: str) -> dict:
		payload = {
			"rollNumber": roll_number,
			"email": email,
			"password": password,
		}
		data = self._request("POST", "/student/auth/login", json=payload).json()
		token = data.get("token")
		if not token:
			raise RuntimeError("Authentication succeeded but no token was returned by the API.")
		self.token = token
		return data.get("student", {})

	def get_attendance_stats(self) -> dict:
		return self._request("GET", "/student/dashboard/attendance/stats").json()

	def get_attendance_records(self, *, page: int, limit: int) -> dict:
		params = {"page": page, "limit": limit}
		return self._request("GET", "/student/dashboard/attendance/records", params=params).json()


@dataclass
class CoursePerformance:
	name: str
	percentage: float
	attended: int
	total: int
	class_type: str
	course_id: str

	@classmethod
	def from_api(cls, payload: dict) -> "CoursePerformance":
		percentage = float(payload.get("percentage") or 0)
		return cls(
			name=str(payload.get("courseName") or payload.get("courseCode") or "Unknown"),
			percentage=percentage,
			attended=int(payload.get("attendedClasses") or 0),
			total=int(payload.get("totalClasses") or 0),
			class_type=str(payload.get("classType") or "UNKNOWN"),
			course_id=str(payload.get("courseId") or payload.get("courseCode") or ""),
		)

	@property
	def ratio(self) -> str:
		if self.total:
			return f"{self.attended}/{self.total}"
		return "-"


@dataclass
class AttendanceRecord:
	course_name: str
	course_code: str
	status: str
	teacher: str
	section: str
	semester: str
	date: Optional[datetime]
	marked_at: Optional[datetime]

	@classmethod
	def from_api(cls, payload: dict) -> "AttendanceRecord":
		course = payload.get("course") or {}
		teacher = payload.get("teacher") or {}
		return cls(
			course_name=str(course.get("name") or payload.get("courseName") or "Unknown"),
			course_code=str(course.get("code") or payload.get("courseCode") or "Unknown"),
			status=str(payload.get("status") or "UNKNOWN").upper(),
			teacher=str(teacher.get("name") or "-"),
			section=str(payload.get("section") or course.get("section") or "-"),
			semester=str(payload.get("semester") or "-"),
			date=_parse_iso(payload.get("date")),
			marked_at=_parse_iso(payload.get("markedAt")),
		)

	@property
	def display_date(self) -> str:
		dt = self.date or self.marked_at
		if not dt:
			return "-"
		return dt.astimezone().strftime("%b %d, %Y")

	@property
	def display_time(self) -> str:
		if not self.marked_at:
			return "-"
		return self.marked_at.astimezone().strftime("%I:%M %p")

	@property
	def status_badge(self) -> str:
		label = self.status.capitalize()
		if self.status == "PRESENT":
			return f"✅ {label}"
		if self.status == "ABSENT":
			return f"❌ {label}"
		return f"⚠️ {label}"


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="Display attendance overview, performance, and full history via API.",
	)
	parser.add_argument("--roll", help="Student roll number (env: TNJR_ROLL_NUMBER / ROLL_NUMBER)")
	parser.add_argument("--email", help="Student login email (env: TNJR_EMAIL / EMAIL)")
	parser.add_argument(
		"--password",
		help="Student password (env: TNJR_PASSWORD / PASSWORD). If omitted, you'll be prompted securely.",
	)
	parser.add_argument(
		"--max-items",
		type=int,
		default=DEFAULT_MAX_ITEMS,
		help=f"Maximum items to show for performance sections (default: {DEFAULT_MAX_ITEMS}).",
	)
	parser.add_argument(
		"--records-limit",
		type=int,
		default=0,
		help="Limit the number of attendance records printed (0 means show all).",
	)
	parser.add_argument(
		"--page-size",
		type=int,
		default=DEFAULT_PAGE_SIZE,
		help=f"Number of records to request per page when fetching history (default: {DEFAULT_PAGE_SIZE}).",
	)
	parser.add_argument(
		"--base-url",
		default=API_BASE_URL,
		help=f"Override the API base URL (default: {API_BASE_URL}).",
	)
	return parser.parse_args()


def _resolve_from_env(keys: Iterable[str]) -> Optional[str]:
	for key in keys:
		value = os.environ.get(key)
		if value:
			return value
	return None


def resolve_credentials(args: argparse.Namespace) -> tuple[str, str, str]:
	roll = (args.roll or _resolve_from_env(ENV_ROLL_KEYS) or input("Roll number: ")).strip()
	email = (args.email or _resolve_from_env(ENV_EMAIL_KEYS) or input("Email: ")).strip()
	password = args.password or _resolve_from_env(ENV_PASSWORD_KEYS)
	if not password:
		password = getpass("Password: ")
	return roll, email, password


def _format_percentage(value: float) -> str:
	return f"{value:.1f}%"


def _format_progress_bar(value: float, width: int = 25) -> str:
	value = max(0.0, min(100.0, value))
	filled = int(round((value / 100) * width))
	bar = "█" * filled + "░" * (width - filled)
	return f"[{bar}]"


def _print_overview(overall: dict, total_courses: int) -> None:
	percentage = float(overall.get("percentage") or 0)
	attended = int(overall.get("attendedClasses") or 0)
	total = int(overall.get("totalClasses") or 0)
	print("\n=== Overview ===")
	print(f"Overall Attendance : {_format_percentage(percentage)}")
	print(f"Classes Attended   : {attended}")
	print(f"Total Classes      : {total}")
	print(f"Active Courses     : {total_courses}")


def _print_section(title: str, courses: list[CoursePerformance], max_items: int) -> None:
	print(f"\n=== {title} ===")
	if not courses:
		print("No data available.")
		return

	courses = sorted(courses, key=lambda c: (c.percentage, c.attended), reverse=True)
	visible = courses[: max(1, max_items)]
	for course in visible:
		progress = _format_progress_bar(course.percentage)
		print(f"- {course.name}")
		print(f"  Percentage : {_format_percentage(course.percentage)} {progress}")
		print(f"  Attendance : {course.ratio}")

	if len(courses) > len(visible):
		print(
			f"Showing top {len(visible)} of {len(courses)} courses. Check the 'By subject' table for the full list."
		)


def _print_attendance_history(records: list[AttendanceRecord], total_available: int, limit: int) -> None:
	print("\n=== Attendance History (Records tab) ===")
	if not records:
		print("No attendance records found.")
		return

	headers = ["Date", "Time", "Status", "Course", "Teacher"]
	widths = [14, 9, 12, 40, 25]
	row_format = "{0:<14} {1:<9} {2:<12} {3:<40} {4:<25}"
	print(row_format.format(*headers))
	print("-" * sum(widths))

	for record in records:
		course_label = f"{record.course_name} ({record.course_code})"
		teacher_label = f"{record.teacher}"
		print(
			row_format.format(
				record.display_date,
				record.display_time,
				record.status_badge,
				course_label[:widths[3] - 1] if len(course_label) > widths[3] else course_label,
				teacher_label[:widths[4] - 1] if len(teacher_label) > widths[4] else teacher_label,
			)
		)
		print(
			f"      Section: {record.section} | Semester: {record.semester}"
		)

	if limit and total_available > limit:
		print(f"Showing {limit} of {total_available} records. Adjust --records-limit to view more.")
	else:
		print(f"Total records displayed: {len(records)} (of {total_available}).")


def fetch_attendance_records(
	client: ApiClient,
	page_size: int,
	record_limit: int,
) -> tuple[list[AttendanceRecord], int]:
	page = 1
	records: list[AttendanceRecord] = []
	remaining = record_limit if record_limit > 0 else None
	total_available = 0

	while True:
		data = client.get_attendance_records(page=page, limit=page_size)
		payload_records = data.get("records", [])
		pagination = data.get("pagination") or {}
		total_available = pagination.get("totalCount", total_available)

		for raw_record in payload_records:
			records.append(AttendanceRecord.from_api(raw_record))
			if remaining is not None:
				remaining -= 1
				if remaining <= 0:
					return records, total_available or len(records)

		if not pagination.get("hasNextPage"):
			break
		page += 1

	return records, total_available or len(records)


def display_attendance():
	args = parse_args()
	roll, email, password = resolve_credentials(args)

	client = ApiClient(base_url=args.base_url)
	try:
		student = client.login(roll, email, password)
	except requests.HTTPError as exc:
		error_message = exc.response.text if exc.response is not None else str(exc)
		print(f"Login failed: {error_message}", file=sys.stderr)
		sys.exit(1)
	except Exception as exc:  # pragma: no cover - defensive
		print(f"Login failed: {exc}", file=sys.stderr)
		sys.exit(1)

	print(
		f"Authenticated as {student.get('name', 'Unknown Student')} ({student.get('rollNumber', roll.upper())})"
	)

	try:
		stats = client.get_attendance_stats()
		records, total_available = fetch_attendance_records(
			client,
			page_size=max(1, args.page_size),
			record_limit=max(0, args.records_limit),
		)
	except requests.HTTPError as exc:
		error_message = exc.response.text if exc.response is not None else str(exc)
		print(f"Failed to fetch attendance data: {error_message}", file=sys.stderr)
		sys.exit(1)
	except Exception as exc:  # pragma: no cover - defensive
		print(f"Failed to fetch attendance data: {exc}", file=sys.stderr)
		sys.exit(1)

	overall = stats.get("overall", {})
	courses = [CoursePerformance.from_api(item) for item in stats.get("byCourse", [])]
	rtu_courses = [course for course in courses if course.class_type.upper() == "RTU_CLASSES"]
	lab_courses = [course for course in courses if course.class_type.upper() == "LABS"]

	_print_overview(overall, total_courses=len(courses))
	_print_section("RTU Performance", rtu_courses, args.max_items)
	_print_section("Lab Performance", lab_courses, args.max_items)

	# Sort records newest first
	records.sort(key=lambda r: (r.marked_at or datetime.min), reverse=True)
	_print_attendance_history(records, total_available, args.records_limit)


if __name__ == "__main__":
	display_attendance()
