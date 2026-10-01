import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from backend.app.models.entities import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    actor_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    payload: Optional[Any] = None
) -> AuditLog:
    payload_str = None
    if payload is not None:
        try:
            payload_str = json.dumps(payload, default=str)
        except Exception:
            payload_str = str(payload)

    log_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        ip_address=ip_address,
        payload_json=payload_str
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
