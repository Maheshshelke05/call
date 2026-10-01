import os
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.entities import (
    Recording, RecordingAccessLog, Call, Employee, UserRole, RecordingStatus, utc_now
)
from backend.app.storage.s3_service import s3_service
from backend.app.schemas.pydantic_models import RecordingPlaybackUrlResponse

def process_recording_upload(
    db: Session,
    call_id: int,
    employee_id: int,
    temp_file_path: str,
    duration_seconds: int,
    file_size_bytes: int,
    mime_type: str = "audio/mp4",
    recording_method: str = "MEDIA_RECORDER"
) -> Recording:
    """
    Saves recording to private S3 (or local fallback) and records metadata.
    """
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    bucket, key, local_path = s3_service.upload_recording(
        local_file_path=temp_file_path,
        employee_id=employee_id,
        call_id=call_id,
        mime_type=mime_type
    )

    recording = Recording(
        call_id=call_id,
        employee_id=employee_id,
        s3_bucket=bucket,
        s3_key=key,
        file_path=local_path,
        file_size_bytes=file_size_bytes,
        duration_seconds=duration_seconds,
        mime_type=mime_type,
        status=RecordingStatus.AVAILABLE,
        recording_method=recording_method
    )
    db.add(recording)
    db.flush()

    # Link to call
    call.recording_id = recording.id

    db.commit()
    db.refresh(recording)
    return recording

def get_recording_playback_url(
    db: Session,
    recording_id: int,
    accessed_by_user: Employee,
    ip_address: Optional[str] = None,
    action: str = "PLAY"
) -> RecordingPlaybackUrlResponse:
    """
    Generates short-lived signed playback URL and records an audit log.
    Ordinary employees can only play their own calls. Admins can play any.
    DOWNLOAD requires ADMIN or SUPER_ADMIN.
    """
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Authorization check
    is_owner = (recording.employee_id == accessed_by_user.id)
    is_admin = accessed_by_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEAM_LEAD]

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this recording"
        )

    if action == "DOWNLOAD" and accessed_by_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Downloading recordings is restricted to administrators"
        )

    signed_url = s3_service.generate_presigned_playback_url(
        s3_bucket=recording.s3_bucket,
        s3_key=recording.s3_key,
        local_path=recording.file_path,
        recording_id=recording.id,
        expiry_seconds=3600
    )

    # Write immutable access log
    access_log = RecordingAccessLog(
        recording_id=recording.id,
        call_id=recording.call_id,
        employee_id=recording.employee_id,
        accessed_by=accessed_by_user.id,
        accessed_at=utc_now(),
        ip_address=ip_address,
        action=action
    )
    db.add(access_log)
    db.commit()

    return RecordingPlaybackUrlResponse(
        recording_id=recording.id,
        call_id=recording.call_id,
        playback_url=signed_url,
        expires_in_seconds=3600,
        duration_seconds=recording.duration_seconds,
        file_size_bytes=recording.file_size_bytes
    )
