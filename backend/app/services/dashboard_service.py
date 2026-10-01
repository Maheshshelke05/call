from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from backend.app.models.entities import (
    Call, CallStatus, Callback, CallbackStatus, Contact,
    ContactAssignment, AssignmentStatus, Employee, Campaign,
    Recording, RecordingStatus
)

def to_naive(dt):
    return dt.replace(tzinfo=None) if dt and getattr(dt, 'tzinfo', None) else dt

def get_employee_dashboard_stats(db: Session, employee_id: int) -> Dict[str, Any]:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    daily_target = employee.daily_call_target if employee else 50

    # Start of today in UTC (naive for database consistency)
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    calls_today = db.query(Call).filter(
        Call.employee_id == employee_id,
        Call.started_at >= today_start
    ).all()

    completed = len(calls_today)
    connected = 0
    no_answer = 0
    busy = 0

    for c in calls_today:
        if c.duration_seconds > 0 or c.status == CallStatus.CONNECTED:
            connected += 1
        elif c.disposition and c.disposition.code == "NO_ANSWER":
            no_answer += 1
        elif c.disposition and c.disposition.code == "BUSY":
            busy += 1

    # Callbacks due today
    today_end = today_start + timedelta(days=1)
    callbacks_due = db.query(Callback).filter(
        Callback.employee_id == employee_id,
        Callback.scheduled_at >= today_start,
        Callback.scheduled_at < today_end,
        Callback.status == CallbackStatus.SCHEDULED
    ).count()

    assigned_count = db.query(ContactAssignment).filter(
        ContactAssignment.employee_id == employee_id,
        ContactAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS])
    ).count()

    remaining = max(0, daily_target - completed)

    return {
        "daily_target": daily_target,
        "completed_calls": completed,
        "connected_calls": connected,
        "no_answer_calls": no_answer,
        "busy_calls": busy,
        "callbacks_due_today": callbacks_due,
        "remaining_calls": remaining,
        "assigned_contacts_count": assigned_count,
        "sync_status": "SYNCED"
    }

def get_admin_dashboard_stats(db: Session) -> Dict[str, Any]:
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.is_active == True).count()
    total_contacts = db.query(Contact).count()

    calls_today = db.query(Call).filter(Call.started_at >= today_start).all()
    today_calls_count = len(calls_today)

    connected_count = 0
    no_answer_count = 0
    busy_count = 0
    total_talk_time = 0

    for c in calls_today:
        total_talk_time += (c.duration_seconds or 0)
        if (c.duration_seconds or 0) > 0 or c.status == CallStatus.CONNECTED:
            connected_count += 1
        elif c.disposition and c.disposition.code == "NO_ANSWER":
            no_answer_count += 1
        elif c.disposition and c.disposition.code == "BUSY":
            busy_count += 1

    avg_duration = round(total_talk_time / max(1, connected_count), 1)

    callbacks_count = db.query(Callback).filter(Callback.status == CallbackStatus.SCHEDULED).count()

    # Campaign progress
    campaigns = db.query(Campaign).limit(5).all()
    campaign_progress = []
    for camp in campaigns:
        total_in_camp = db.query(ContactAssignment).filter(ContactAssignment.campaign_id == camp.id).count()
        completed_in_camp = db.query(ContactAssignment).filter(
            ContactAssignment.campaign_id == camp.id,
            ContactAssignment.status == AssignmentStatus.COMPLETED
        ).count()
        campaign_progress.append({
            "id": camp.id,
            "name": camp.name,
            "status": camp.status.value,
            "total_contacts": total_in_camp,
            "completed_calls": completed_in_camp,
            "percentage": round((completed_in_camp / max(1, total_in_camp)) * 100, 1)
        })

    # Hourly distribution for today (0-23 hours)
    calls_by_hour = []
    for h in range(9, 21): # Work hours 9 AM to 8 PM
        h_start = today_start + timedelta(hours=h)
        h_end = h_start + timedelta(hours=1)
        h_calls = [c for c in calls_today if h_start <= to_naive(c.started_at) < h_end]
        calls_by_hour.append({
            "hour": f"{h:02d}:00",
            "calls": len(h_calls),
            "connected": sum(1 for c in h_calls if (c.duration_seconds or 0) > 0)
        })

    # Last 7 days distribution
    calls_by_day = []
    for d in range(6, -1, -1):
        day_date = today_start - timedelta(days=d)
        day_next = day_date + timedelta(days=1)
        day_calls_count = db.query(Call).filter(Call.started_at >= day_date, Call.started_at < day_next).count()
        calls_by_day.append({
            "date": day_date.strftime("%b %d"),
            "calls": day_calls_count
        })

    # Recording availability
    total_recordings = db.query(Recording).count()
    available_recordings = db.query(Recording).filter(Recording.status == RecordingStatus.AVAILABLE).count()

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "total_contacts": total_contacts,
        "today_calls": today_calls_count,
        "connected_calls": connected_count,
        "no_answer_calls": no_answer_count,
        "busy_calls": busy_count,
        "callbacks_count": callbacks_count,
        "total_talk_time_seconds": total_talk_time,
        "average_call_duration_seconds": avg_duration,
        "campaign_progress": campaign_progress,
        "calls_by_hour": calls_by_hour,
        "calls_by_day": calls_by_day,
        "recording_availability_stats": {
            "total": total_recordings,
            "available": available_recordings,
            "failed_or_unavailable": max(0, total_recordings - available_recordings)
        }
    }
