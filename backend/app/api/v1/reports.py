from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.app.core.database import get_db
from backend.app.core.dependencies import require_team_lead_or_admin
from backend.app.models.entities import Employee, Call, CallDisposition

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("")
def get_reports(
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    # Disposition distribution breakdown
    dispositions = db.query(CallDisposition).all()
    disp_breakdown = []
    for d in dispositions:
        count = db.query(Call).filter(Call.disposition_id == d.id).count()
        disp_breakdown.append({
            "code": d.code,
            "label": d.label,
            "count": count
        })

    # Employee performance ranking
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    emp_rankings = []
    for emp in employees:
        total_calls = db.query(Call).filter(Call.employee_id == emp.id).count()
        connected = db.query(Call).filter(Call.employee_id == emp.id, Call.duration_seconds > 0).count()
        emp_rankings.append({
            "employee_id": emp.id,
            "name": emp.full_name,
            "role": emp.role.value,
            "total_calls": total_calls,
            "connected_calls": connected,
            "connection_rate": round((connected / max(1, total_calls)) * 100, 1)
        })

    return {
        "disposition_distribution": disp_breakdown,
        "employee_performance": sorted(emp_rankings, key=lambda x: x["total_calls"], reverse=True)
    }
