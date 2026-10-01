from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from backend.app.core.database import get_db
from backend.app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, get_password_hash
)
from backend.app.core.dependencies import get_current_user
from backend.app.models.entities import Employee, EmployeeDevice, Session as DbSession, UserRole, utc_now
from backend.app.schemas.pydantic_models import (
    LoginRequest, TokenResponse, RefreshTokenRequest, DeviceRegisterRequest, EmployeeResponse
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == data.email).first()
    if not employee or not verify_password(data.password, employee.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not employee.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee account is deactivated")

    access_token = create_access_token(data={"sub": str(employee.id), "role": employee.role.value})
    refresh_token = create_refresh_token(data={"sub": str(employee.id)})

    # Record active session
    client_ip = request.client.host if request.client else "unknown"
    session_rec = DbSession(
        employee_id=employee.id,
        refresh_token=refresh_token,
        device_info=f"{data.device_model or 'Web'} ({data.os_version or 'OS'})",
        ip_address=client_ip,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(session_rec)

    # Register/update employee device if device details provided
    if data.device_model:
        device = db.query(EmployeeDevice).filter(
            EmployeeDevice.employee_id == employee.id,
            EmployeeDevice.device_model == data.device_model
        ).first()
        if not device:
            device = EmployeeDevice(
                employee_id=employee.id,
                device_model=data.device_model,
                os_version=data.os_version,
                app_version=data.app_version,
                last_seen_at=utc_now()
            )
            db.add(device)
        else:
            device.os_version = data.os_version
            device.app_version = data.app_version
            device.last_seen_at = utc_now()

    db.commit()

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        actor_id=employee.id,
        entity_type="EMPLOYEE",
        entity_id=employee.id,
        ip_address=client_ip,
        payload={"email": employee.email, "role": employee.role.value}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=60 * 60 * 8, # 8 hours
        user={
            "id": employee.id,
            "email": employee.email,
            "full_name": employee.full_name,
            "role": employee.role.value,
            "preferred_sim_slot": employee.preferred_sim_slot,
            "daily_call_target": employee.daily_call_target
        }
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    session_rec = db.query(DbSession).filter(
        DbSession.refresh_token == data.refresh_token,
        DbSession.is_revoked == False
    ).first()

    if not session_rec or session_rec.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired or revoked")

    employee = db.query(Employee).filter(Employee.id == int(user_id)).first()
    if not employee or not employee.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")

    # Rotate refresh token
    new_access_token = create_access_token(data={"sub": str(employee.id), "role": employee.role.value})
    new_refresh_token = create_refresh_token(data={"sub": str(employee.id)})

    session_rec.refresh_token = new_refresh_token
    session_rec.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    db.commit()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=60 * 60 * 8,
        user={
            "id": employee.id,
            "email": employee.email,
            "full_name": employee.full_name,
            "role": employee.role.value,
            "preferred_sim_slot": employee.preferred_sim_slot
        }
    )

@router.post("/logout")
def logout(
    current_user: Employee = Depends(get_current_user),
    data: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db)
):
    if data and data.refresh_token:
        session_rec = db.query(DbSession).filter(DbSession.refresh_token == data.refresh_token).first()
        if session_rec:
            session_rec.is_revoked = True
            db.commit()

    log_audit_event(
        db=db,
        action="LOGOUT",
        actor_id=current_user.id,
        entity_type="EMPLOYEE",
        entity_id=current_user.id
    )
    return {"message": "Successfully logged out"}
