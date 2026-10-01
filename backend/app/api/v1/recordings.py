import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_team_lead_or_admin
from backend.app.models.entities import Recording, RecordingStatus, Employee, UserRole, Call
from backend.app.schemas.pydantic_models import RecordingPlaybackUrlResponse, RecordingListItem
from backend.app.services.recording_service import process_recording_upload, get_recording_playback_url
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/recordings", tags=["Recordings"])

@router.get("", response_model=List[RecordingListItem])
def list_recordings(
    limit: int = 50,
    offset: int = 0,
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Recording).join(Call, Recording.call_id == Call.id)

    if current_user.role == UserRole.TEAM_LEAD:
        team_members = db.query(Employee.id).filter(Employee.team_id == current_user.team_id).all()
        member_ids = [m[0] for m in team_members]
        query = query.filter(Recording.employee_id.in_(member_ids))

    recordings = query.order_by(Recording.created_at.desc()).offset(offset).limit(limit).all()
    results = []
    for r in recordings:
        call = db.query(Call).filter(Call.id == r.call_id).first()
        emp_name = call.employee.full_name if call and call.employee else "Unknown"
        contact_name = f"{call.contact.first_name} {call.contact.last_name or ''}".strip() if call and call.contact else "Unknown"
        contact_phone = call.contact.normalized_phone if call and call.contact else ""
        campaign_name = call.campaign.name if call and call.campaign else None
        disp_label = call.disposition.label if call and call.disposition else None
        call_date = call.started_at if call else r.created_at

        results.append(RecordingListItem(
            id=r.id,
            call_id=r.call_id,
            employee_id=r.employee_id,
            employee_name=emp_name,
            contact_name=contact_name,
            contact_phone=contact_phone,
            campaign_name=campaign_name,
            call_date=call_date,
            duration_seconds=r.duration_seconds,
            disposition_label=disp_label,
            status=r.status,
            created_at=r.created_at
        ))
    return results

@router.post("/upload")
async def upload_recording(
    call_id: int = Form(...),
    duration_seconds: int = Form(...),
    file: UploadFile = File(...),
    recording_method: str = Form("MEDIA_RECORDER"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify call ownership
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Associated call not found")
    if current_user.role == UserRole.EMPLOYEE and call.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to attach recording to this call")

    # Save to temp location
    temp_dir = "./storage/temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"upload_{call_id}_{file.filename}")

    content = await file.read()
    with open(temp_file_path, "wb") as f:
        f.write(content)

    rec = process_recording_upload(
        db=db,
        call_id=call_id,
        employee_id=current_user.id,
        temp_file_path=temp_file_path,
        duration_seconds=duration_seconds,
        file_size_bytes=len(content),
        mime_type=file.content_type or "audio/mp4",
        recording_method=recording_method
    )

    # Clean temp file if local fallback wrote to destination
    if os.path.exists(temp_file_path) and rec.file_path != temp_file_path:
        try: os.remove(temp_file_path)
        except Exception: pass

    log_audit_event(
        db=db,
        action="RECORDING_UPLOADED",
        actor_id=current_user.id,
        entity_type="RECORDING",
        entity_id=rec.id,
        payload={"call_id": call_id, "size_bytes": len(content)}
    )

    return {"message": "Recording uploaded successfully", "recording_id": rec.id, "status": rec.status.value}

@router.get("/{id}/playback-url", response_model=RecordingPlaybackUrlResponse)
def get_playback_url(
    id: int,
    action: str = "PLAY", # "PLAY" or "DOWNLOAD"
    request: Request = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request and request.client else "unknown"
    return get_recording_playback_url(
        db=db,
        recording_id=id,
        accessed_by_user=current_user,
        ip_address=client_ip,
        action=action.upper()
    )

@router.get("/{id}/stream")
def stream_local_recording(
    id: int,
    db: Session = Depends(get_db)
):
    """
    Streams local recording file for local development playback.
    """
    rec = db.query(Recording).filter(Recording.id == id).first()
    if not rec or not rec.file_path or not os.path.exists(rec.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(rec.file_path, media_type=rec.mime_type or "audio/mp4")
