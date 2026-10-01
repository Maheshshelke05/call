from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.entities import Callback, CallbackStatus, Employee, Contact, UserRole, utc_now
from backend.app.schemas.pydantic_models import CallbackCreate, CallbackUpdate, CallbackResponse

router = APIRouter(prefix="/callbacks", tags=["Callbacks"])

@router.get("", response_model=List[CallbackResponse])
def list_callbacks(
    filter_type: Optional[str] = "today", # "today", "overdue", "upcoming", "all"
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Callback)
    if current_user.role == UserRole.EMPLOYEE:
        query = query.filter(Callback.employee_id == current_user.id)

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)


    if filter_type == "today":
        query = query.filter(
            Callback.scheduled_at >= today_start,
            Callback.scheduled_at < today_end,
            Callback.status == CallbackStatus.SCHEDULED
        )
    elif filter_type == "overdue":
        query = query.filter(
            Callback.scheduled_at < today_start,
            Callback.status == CallbackStatus.SCHEDULED
        )
    elif filter_type == "upcoming":
        query = query.filter(
            Callback.scheduled_at >= today_end,
            Callback.status == CallbackStatus.SCHEDULED
        )

    callbacks = query.order_by(Callback.scheduled_at.asc()).all()
    results = []
    for cb in callbacks:
        contact_name = f"{cb.contact.first_name} {cb.contact.last_name or ''}".strip() if cb.contact else "Unknown"
        contact_phone = cb.contact.normalized_phone if cb.contact else ""
        results.append(CallbackResponse(
            id=cb.id,
            employee_id=cb.employee_id,
            contact_id=cb.contact_id,
            contact_name=contact_name,
            contact_phone=contact_phone,
            scheduled_at=cb.scheduled_at,
            status=cb.status,
            notes=cb.notes,
            created_at=cb.created_at
        ))
    return results

@router.post("", response_model=CallbackResponse, status_code=status.HTTP_201_CREATED)
def create_callback(
    data: CallbackCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact = db.query(Contact).filter(Contact.id == data.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    cb = Callback(
        employee_id=current_user.id,
        contact_id=data.contact_id,
        call_id=data.call_id,
        scheduled_at=data.scheduled_at,
        notes=data.notes,
        status=CallbackStatus.SCHEDULED
    )
    db.add(cb)
    db.commit()
    db.refresh(cb)

    return CallbackResponse(
        id=cb.id,
        employee_id=cb.employee_id,
        contact_id=cb.contact_id,
        contact_name=f"{contact.first_name} {contact.last_name or ''}".strip(),
        contact_phone=contact.normalized_phone,
        scheduled_at=cb.scheduled_at,
        status=cb.status,
        notes=cb.notes,
        created_at=cb.created_at
    )

@router.put("/{id}", response_model=CallbackResponse)
def update_callback(
    id: int,
    data: CallbackUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cb = db.query(Callback).filter(Callback.id == id).first()
    if not cb:
        raise HTTPException(status_code=404, detail="Callback not found")

    if current_user.role == UserRole.EMPLOYEE and cb.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this callback")

    if data.scheduled_at is not None:
        cb.scheduled_at = data.scheduled_at
    if data.status is not None:
        cb.status = data.status
        if data.status == CallbackStatus.COMPLETED:
            cb.completed_at = utc_now()
    if data.notes is not None:
        cb.notes = data.notes

    db.commit()
    db.refresh(cb)

    contact_name = f"{cb.contact.first_name} {cb.contact.last_name or ''}".strip() if cb.contact else "Unknown"
    contact_phone = cb.contact.normalized_phone if cb.contact else ""

    return CallbackResponse(
        id=cb.id,
        employee_id=cb.employee_id,
        contact_id=cb.contact_id,
        contact_name=contact_name,
        contact_phone=contact_phone,
        scheduled_at=cb.scheduled_at,
        status=cb.status,
        notes=cb.notes,
        created_at=cb.created_at
    )
