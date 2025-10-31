from __future__ import annotations

import argparse
import hashlib
import hmac
import os
import sys
import time
from dataclasses import dataclass
from getpass import getpass
from typing import Iterable, Optional

import requests


API_BASE_URL = "http://103.159.68.35:3536/api"
SIGNATURE_KEY = "6ECD762D4776742AFFB192CE8A148"
REQUEST_TIMEOUT = 30
DEFAULT_MAX_ITEMS = 5

ENV_ROLL_KEYS = ("TNJR_ROLL_NUMBER", "ROLL_NUMBER")
ENV_EMAIL_KEYS = ("TNJR_EMAIL", "EMAIL")
ENV_PASSWORD_KEYS = ("TNJR_PASSWORD", "PASSWORD")


class ApiClient:
	"""Lightweight helper that replicates the frontend's REST client."""

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


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="Display Techno NJR attendance stats using the official API.",
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
		help=f"Maximum items to show per performance section (default: {DEFAULT_MAX_ITEMS}).",
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
	except Exception as exc:  # pragma: no cover - defensive fallback
		print(f"Login failed: {exc}", file=sys.stderr)
		sys.exit(1)

	print(
		f"Authenticated as {student.get('name', 'Unknown Student')} ({student.get('rollNumber', roll.upper())})"
	)

	try:
		stats = client.get_attendance_stats()
	except requests.HTTPError as exc:
		error_message = exc.response.text if exc.response is not None else str(exc)
		print(f"Failed to fetch attendance stats: {error_message}", file=sys.stderr)
		sys.exit(1)
	except Exception as exc:  # pragma: no cover - defensive fallback
		print(f"Failed to fetch attendance stats: {exc}", file=sys.stderr)
		sys.exit(1)

	overall = stats.get("overall", {})
	courses = [CoursePerformance.from_api(item) for item in stats.get("byCourse", [])]
	rtu_courses = [course for course in courses if course.class_type.upper() == "RTU_CLASSES"]
	lab_courses = [course for course in courses if course.class_type.upper() == "LABS"]

	_print_overview(overall, total_courses=len(courses))
	_print_section("RTU Performance", rtu_courses, args.max_items)
	_print_section("Lab Performance", lab_courses, args.max_items)


if __name__ == "__main__":
	display_attendance()
