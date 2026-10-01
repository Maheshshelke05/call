from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.core.dependencies import require_admin
from backend.app.models.entities import AuditLog, Employee
from backend.app.schemas.pydantic_models import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    actor_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)

    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    results = []
    for l in logs:
        actor_name = None
        if l.actor_id:
            actor = db.query(Employee).filter(Employee.id == l.actor_id).first()
            if actor:
                actor_name = actor.full_name

        results.append(AuditLogResponse(
            id=l.id,
            actor_id=l.actor_id,
            actor_name=actor_name,
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            ip_address=l.ip_address,
            payload_json=l.payload_json,
            created_at=l.created_at
        ))
    return results
