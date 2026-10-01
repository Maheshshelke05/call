from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_team_lead_or_admin
from backend.app.models.entities import Employee
from backend.app.schemas.pydantic_models import EmployeeDashboardResponse, AdminDashboardResponse
from backend.app.services.dashboard_service import get_employee_dashboard_stats, get_admin_dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/employee", response_model=EmployeeDashboardResponse)
def get_employee_dashboard(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stats = get_employee_dashboard_stats(db, current_user.id)
    return EmployeeDashboardResponse(**stats)

@router.get("/admin", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    stats = get_admin_dashboard_stats(db)
    return AdminDashboardResponse(**stats)
