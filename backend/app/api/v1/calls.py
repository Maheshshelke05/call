from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_team_lead_or_admin
from backend.app.models.entities import (
    Call, CallEvent, CallDisposition, CallNote, Employee, Contact, Campaign,
    UserRole, Recording, utc_now
)
from backend.app.schemas.pydantic_models import (
    CallSyncRequest, CallEventCreate, CallDispositionRequest, CallResponse
)
from backend.app.services.call_service import sync_or_create_call, apply_disposition_to_call
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/calls", tags=["Calls"])

@router.get("/dispositions")
def list_dispositions(db: Session = Depends(get_db)):
    dispositions = db.query(CallDisposition).filter(CallDisposition.is_active == True).all()
    return [{"id": d.id, "code": d.code, "label": d.label, "is_connected": d.is_connected, "requires_callback": d.requires_callback} for d in dispositions]

@router.get("", response_model=List[CallResponse])
def list_calls(
    employee_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    campaign_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Call)

    # RBAC: Employees can only view their own calls
    if current_user.role == UserRole.EMPLOYEE:
        query = query.filter(Call.employee_id == current_user.id)
    elif current_user.role == UserRole.TEAM_LEAD:
        # Team lead can view calls of team members
        team_members = db.query(Employee.id).filter(Employee.team_id == current_user.team_id).all()
        member_ids = [m[0] for m in team_members]
        query = query.filter(Call.employee_id.in_(member_ids))
    elif employee_id:
        query = query.filter(Call.employee_id == employee_id)

    if contact_id:
        query = query.filter(Call.contact_id == contact_id)
    if campaign_id:
        query = query.filter(Call.campaign_id == campaign_id)

    calls = query.order_by(Call.started_at.desc()).offset(offset).limit(limit).all()
    results = []
    for c in calls:
        disp_label = c.disposition.label if c.disposition else None
        disp_code = c.disposition.code if c.disposition else None
        notes_text = c.notes.content if c.notes else None
        rec_status = c.recording.status.value if c.recording else None

        results.append(CallResponse(
            id=c.id,
            employee_id=c.employee_id,
            employee_name=c.employee.full_name if c.employee else None,
            contact_id=c.contact_id,
            contact_name=f"{c.contact.first_name} {c.contact.last_name or ''}".strip() if c.contact else None,
            campaign_id=c.campaign_id,
            campaign_name=c.campaign.name if c.campaign else None,
            phone_number_snapshot=c.phone_number_snapshot,
            sim_slot=c.sim_slot,
            started_at=c.started_at,
            answered_at=c.answered_at,
            ended_at=c.ended_at,
            duration_seconds=c.duration_seconds,
            status=c.status,
            disposition_label=disp_label,
            disposition_code=disp_code,
            notes=notes_text,
            recording_id=c.recording_id,
            recording_status=rec_status,
            client_event_id=c.client_event_id,
            created_at=c.created_at
        ))
    return results

@router.post("/sync", response_model=CallResponse)
def sync_call(
    data: CallSyncRequest,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Idempotent synchronization from the Android React Native app.
    Uses client_event_id as uniqueness key to guarantee zero duplicates.
    """
    call, is_new = sync_or_create_call(db, current_user.id, data)

    disp_label = call.disposition.label if call.disposition else None
    disp_code = call.disposition.code if call.disposition else None
    notes_text = call.notes.content if call.notes else None

    return CallResponse(
        id=call.id,
        employee_id=call.employee_id,
        employee_name=current_user.full_name,
        contact_id=call.contact_id,
        contact_name=f"{call.contact.first_name} {call.contact.last_name or ''}".strip() if call.contact else None,
        campaign_id=call.campaign_id,
        campaign_name=call.campaign.name if call.campaign else None,
        phone_number_snapshot=call.phone_number_snapshot,
        sim_slot=call.sim_slot,
        started_at=call.started_at,
        answered_at=call.answered_at,
        ended_at=call.ended_at,
        duration_seconds=call.duration_seconds,
        status=call.status,
        disposition_label=disp_label,
        disposition_code=disp_code,
        notes=notes_text,
        recording_id=call.recording_id,
        recording_status=call.recording.status.value if call.recording else None,
        client_event_id=call.client_event_id,
        created_at=call.created_at
    )

@router.post("/{id}/events")
def add_call_event(
    id: int,
    data: CallEventCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    call = db.query(Call).filter(Call.id == id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    event = CallEvent(
        call_id=call.id,
        event_type=data.event_type,
        event_timestamp=data.event_timestamp or utc_now(),
        metadata_json=data.metadata_json
    )
    db.add(event)
    db.commit()
    return {"message": "Event recorded", "event_id": event.id}

@router.post("/{id}/disposition")
def submit_call_disposition(
    id: int,
    data: CallDispositionRequest,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        call = apply_disposition_to_call(db, id, current_user.id, data)
        return {
            "message": "Disposition saved successfully",
            "call_id": call.id,
            "disposition_code": data.disposition_code
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
