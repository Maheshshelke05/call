from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.models.entities import (
    Call, CallEvent, CallDisposition, CallNote, Callback,
    ContactAssignment, AssignmentStatus, CallbackStatus, CallStatus, utc_now
)
from backend.app.schemas.pydantic_models import CallSyncRequest, CallDispositionRequest

def sync_or_create_call(
    db: Session,
    employee_id: int,
    data: CallSyncRequest
) -> Tuple[Call, bool]:
    """
    Idempotently synchronizes a call using client_event_id.
    Prevents duplicate call records on mobile network retry.
    """
    existing_call = db.query(Call).filter(Call.client_event_id == data.client_event_id).first()
    if existing_call:
        # Update existing record if needed
        if data.duration_seconds > existing_call.duration_seconds:
            existing_call.duration_seconds = data.duration_seconds
        if data.ended_at and not existing_call.ended_at:
            existing_call.ended_at = data.ended_at
        if data.status:
            existing_call.status = data.status
        db.commit()
        db.refresh(existing_call)
        return existing_call, False

    # Find disposition if provided
    disposition = None
    if data.disposition_code:
        disposition = db.query(CallDisposition).filter(CallDisposition.code == data.disposition_code).first()

    # Create note if provided
    note_id = None
    if data.notes:
        call_note = CallNote(
            employee_id=employee_id,
            contact_id=data.contact_id,
            content=data.notes
        )
        db.add(call_note)
        db.flush()
        note_id = call_note.id

    call = Call(
        employee_id=employee_id,
        contact_id=data.contact_id,
        campaign_id=data.campaign_id,
        external_call_reference=data.external_call_reference,
        phone_number_snapshot=data.phone_number_snapshot,
        sim_slot=data.sim_slot,
        started_at=data.started_at,
        answered_at=data.answered_at,
        ended_at=data.ended_at,
        duration_seconds=data.duration_seconds,
        status=data.status,
        disposition_id=disposition.id if disposition else None,
        notes_id=note_id,
        client_event_id=data.client_event_id
    )
    db.add(call)
    db.flush()

    # Link note with call_id
    if note_id:
        call_note.call_id = call.id

    # Record immutable initial events
    event_init = CallEvent(
        call_id=call.id,
        event_type="CALL_INITIATED",
        event_timestamp=data.started_at
    )
    db.add(event_init)

    if data.answered_at:
        event_conn = CallEvent(
            call_id=call.id,
            event_type="CALL_CONNECTED",
            event_timestamp=data.answered_at
        )
        db.add(event_conn)

    if data.ended_at:
        event_end = CallEvent(
            call_id=call.id,
            event_type="CALL_DISCONNECTED",
            event_timestamp=data.ended_at
        )
        db.add(event_end)

    if disposition:
        event_disp = CallEvent(
            call_id=call.id,
            event_type="DISPOSITION_SAVED",
            event_timestamp=utc_now(),
            metadata_json=f'{{"code": "{disposition.code}", "label": "{disposition.label}"}}'
        )
        db.add(event_disp)

    # If callback requested, create callback record
    if data.callback_at:
        callback = Callback(
            employee_id=employee_id,
            contact_id=data.contact_id,
            call_id=call.id,
            scheduled_at=data.callback_at,
            status=CallbackStatus.SCHEDULED,
            notes=data.notes
        )
        db.add(callback)

    # Update contact assignment status to COMPLETED
    assignment = db.query(ContactAssignment).filter(
        ContactAssignment.employee_id == employee_id,
        ContactAssignment.contact_id == data.contact_id,
        ContactAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS])
    ).first()
    if assignment:
        assignment.status = AssignmentStatus.COMPLETED
        assignment.completed_at = utc_now()

    db.commit()
    db.refresh(call)
    return call, True

def apply_disposition_to_call(
    db: Session,
    call_id: int,
    employee_id: int,
    data: CallDispositionRequest
) -> Call:
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise ValueError(f"Call with id {call_id} not found")

    disposition = db.query(CallDisposition).filter(CallDisposition.code == data.disposition_code).first()
    if not disposition:
        raise ValueError(f"Unknown disposition code: {data.disposition_code}")

    call.disposition_id = disposition.id

    if data.notes:
        call_note = CallNote(
            call_id=call.id,
            employee_id=employee_id,
            contact_id=call.contact_id,
            content=data.notes
        )
        db.add(call_note)
        db.flush()
        call.notes_id = call_note.id

    if data.callback_at:
        callback = Callback(
            employee_id=employee_id,
            contact_id=call.contact_id,
            call_id=call.id,
            scheduled_at=data.callback_at,
            status=CallbackStatus.SCHEDULED,
            notes=data.notes
        )
        db.add(callback)

    event_disp = CallEvent(
        call_id=call.id,
        event_type="DISPOSITION_SAVED",
        event_timestamp=utc_now(),
        metadata_json=f'{{"code": "{disposition.code}", "label": "{disposition.label}"}}'
    )
    db.add(event_disp)

    db.commit()
    db.refresh(call)
    return call
