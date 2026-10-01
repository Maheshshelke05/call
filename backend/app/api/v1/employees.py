from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_admin, require_team_lead_or_admin
from backend.app.core.security import get_password_hash
from backend.app.models.entities import Employee, UserRole, Team
from backend.app.schemas.pydantic_models import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter(tags=["Employees"])

@router.get("/me", response_model=EmployeeResponse)
def get_my_profile(current_user: Employee = Depends(get_current_user)):
    return current_user

@router.put("/me/sim-preference")
def update_my_sim_preference(
    preferred_sim_slot: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if preferred_sim_slot not in [0, 1]:
        raise HTTPException(status_code=400, detail="preferred_sim_slot must be 0 (SIM 1) or 1 (SIM 2)")
    current_user.preferred_sim_slot = preferred_sim_slot
    db.commit()
    return {"message": "Preferred SIM updated", "preferred_sim_slot": preferred_sim_slot}

@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    team_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Employee)
    # Team Lead only sees members of their team
    if current_user.role == UserRole.TEAM_LEAD:
        query = query.filter(Employee.team_id == current_user.team_id)
    elif team_id:
        query = query.filter(Employee.team_id == team_id)

    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)

    return query.order_by(Employee.id.desc()).all()

@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: EmployeeCreate,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Employee).filter(Employee.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this email already exists")

    if data.team_id:
        team = db.query(Team).filter(Team.id == data.team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Assigned team not found")

    employee = Employee(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=data.role,
        team_id=data.team_id,
        daily_call_target=data.daily_call_target,
        preferred_sim_slot=data.preferred_sim_slot,
        phone_number=data.phone_number
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    log_audit_event(
        db=db,
        action="EMPLOYEE_CREATED",
        actor_id=current_user.id,
        entity_type="EMPLOYEE",
        entity_id=employee.id,
        payload={"email": employee.email, "role": employee.role.value}
    )

    return employee

@router.get("/employees/{id}", response_model=EmployeeResponse)
def get_employee(
    id: int,
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if current_user.role == UserRole.TEAM_LEAD and employee.team_id != current_user.team_id:
        raise HTTPException(status_code=403, detail="Not authorized to view members outside your team")

    return employee

@router.put("/employees/{id}", response_model=EmployeeResponse)
def update_employee(
    id: int,
    data: EmployeeUpdate,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if data.full_name is not None:
        employee.full_name = data.full_name
    if data.role is not None:
        employee.role = data.role
    if data.team_id is not None:
        employee.team_id = data.team_id
    if data.is_active is not None:
        employee.is_active = data.is_active
    if data.daily_call_target is not None:
        employee.daily_call_target = data.daily_call_target
    if data.preferred_sim_slot is not None:
        employee.preferred_sim_slot = data.preferred_sim_slot
    if data.phone_number is not None:
        employee.phone_number = data.phone_number
    if data.password:
        employee.hashed_password = get_password_hash(data.password)

    db.commit()
    db.refresh(employee)

    log_audit_event(
        db=db,
        action="EMPLOYEE_UPDATED",
        actor_id=current_user.id,
        entity_type="EMPLOYEE",
        entity_id=employee.id
    )

    return employee
