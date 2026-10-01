from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.core.database import get_db
from backend.app.core.dependencies import require_admin
from backend.app.models.entities import Setting, CallDisposition, Employee
from backend.app.schemas.pydantic_models import (
    SettingResponse, SettingUpdateRequest,
    DispositionResponse, DispositionCreateRequest, DispositionUpdateRequest
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/settings", tags=["Settings & Dispositions"])


DEFAULT_SETTINGS = {
    "recording_enabled": ("true", "Master switch for cellular call recording pipeline"),
    "recording_notice_enabled": ("false", "Require playback of consent audio notice where configured"),
    "recording_retention_days": ("90", "Retention period for call recordings in days before auto-purge"),
    "recording_access_role": ("ADMIN", "Minimum role permitted to play recordings"),
    "recording_download_allowed": ("false", "Whether recordings can be downloaded locally by non-superadmins"),
    "daily_call_target_default": ("50", "Default target calls per employee per day"),
    "offline_sync_max_retry": ("5", "Maximum retry attempts before marking sync event CONFLICT"),
    "sim_preference_enforcement": ("STRICT", "Enforce work SIM slot without falling back silently"),
}

@router.get("", response_model=Dict[str, Any])
def get_all_settings(
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Ensure defaults exist
    db_settings = {s.key: s for s in db.query(Setting).all()}
    created_any = False
    for k, (default_val, desc) in DEFAULT_SETTINGS.items():
        if k not in db_settings:
            new_s = Setting(key=k, value=default_val, description=desc)
            db.add(new_s)
            created_any = True
    if created_any:
        db.commit()
        db_settings = {s.key: s for s in db.query(Setting).all()}

    settings_dict = {k: s.value for k, s in db_settings.items()}
    dispositions = db.query(CallDisposition).order_by(CallDisposition.id.asc()).all()

    return {
        "settings": settings_dict,
        "dispositions": [
            {
                "id": d.id,
                "code": d.code,
                "label": d.label,
                "is_connected": d.is_connected,
                "requires_callback": d.requires_callback,
                "is_active": d.is_active
            }
            for d in dispositions
        ]
    }

@router.put("")
def update_settings(
    payload: SettingUpdateRequest,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    for key, val in payload.settings.items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = str(val)
        else:
            setting = Setting(key=key, value=str(val), description="Custom configured setting")
            db.add(setting)

    db.commit()

    log_audit_event(
        db,
        actor_id=current_user.id,
        action="UPDATE_SYSTEM_SETTINGS",
        entity_type="SYSTEM_SETTING",
        payload={"updated_keys": list(payload.settings.keys())}
    )

    return {"message": "Settings updated successfully"}

@router.get("/dispositions", response_model=List[DispositionResponse])
def get_dispositions(
    db: Session = Depends(get_db)
):
    return db.query(CallDisposition).filter(CallDisposition.is_active == True).order_by(CallDisposition.id.asc()).all()

@router.post("/dispositions", response_model=DispositionResponse)
def create_disposition(
    payload: DispositionCreateRequest,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(CallDisposition).filter(CallDisposition.code == payload.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Disposition code already exists")

    disp = CallDisposition(
        code=payload.code.upper().strip(),
        label=payload.label.strip(),
        is_connected=payload.is_connected,
        requires_callback=payload.requires_callback,
        is_active=payload.is_active
    )
    db.add(disp)
    db.commit()
    db.refresh(disp)

    log_audit_event(
        db,
        actor_id=current_user.id,
        action="CREATE_DISPOSITION",
        entity_type="CALL_DISPOSITION",
        entity_id=str(disp.id),
        payload={"code": disp.code, "label": disp.label}
    )


    return disp

@router.put("/dispositions/{disp_id}", response_model=DispositionResponse)
def update_disposition(
    disp_id: int,
    payload: DispositionUpdateRequest,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    disp = db.query(CallDisposition).filter(CallDisposition.id == disp_id).first()
    if not disp:
        raise HTTPException(status_code=404, detail="Disposition not found")

    if payload.label is not None:
        disp.label = payload.label.strip()
    if payload.is_connected is not None:
        disp.is_connected = payload.is_connected
    if payload.requires_callback is not None:
        disp.requires_callback = payload.requires_callback
    if payload.is_active is not None:
        disp.is_active = payload.is_active

    db.commit()
    db.refresh(disp)
    return disp
