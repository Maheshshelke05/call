from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_admin, require_team_lead_or_admin
from backend.app.models.entities import Campaign, CampaignContact, ContactAssignment, Employee
from backend.app.schemas.pydantic_models import CampaignCreate, CampaignResponse

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaigns = db.query(Campaign).order_by(Campaign.id.desc()).all()
    results = []
    for c in campaigns:
        total = db.query(ContactAssignment).filter(ContactAssignment.campaign_id == c.id).count()
        completed = db.query(ContactAssignment).filter(
            ContactAssignment.campaign_id == c.id,
            ContactAssignment.status == "COMPLETED"
        ).count()
        results.append(CampaignResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            status=c.status,
            start_date=c.start_date,
            end_date=c.end_date,
            target_calls=c.target_calls,
            priority=c.priority,
            assigned_team_id=c.assigned_team_id,
            total_contacts=total,
            completed_calls=completed,
            created_at=c.created_at
        ))
    return results

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    data: CampaignCreate,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    camp = Campaign(
        name=data.name,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        target_calls=data.target_calls,
        priority=data.priority,
        assigned_team_id=data.assigned_team_id
    )
    db.add(camp)
    db.commit()
    db.refresh(camp)
    return CampaignResponse(
        id=camp.id,
        name=camp.name,
        description=camp.description,
        status=camp.status,
        start_date=camp.start_date,
        end_date=camp.end_date,
        target_calls=camp.target_calls,
        priority=camp.priority,
        assigned_team_id=camp.assigned_team_id,
        total_contacts=0,
        completed_calls=0,
        created_at=camp.created_at
    )

@router.get("/{id}", response_model=CampaignResponse)
def get_campaign(
    id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    c = db.query(Campaign).filter(Campaign.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    total = db.query(ContactAssignment).filter(ContactAssignment.campaign_id == c.id).count()
    completed = db.query(ContactAssignment).filter(
        ContactAssignment.campaign_id == c.id,
        ContactAssignment.status == "COMPLETED"
    ).count()

    return CampaignResponse(
        id=c.id,
        name=c.name,
        description=c.description,
        status=c.status,
        start_date=c.start_date,
        end_date=c.end_date,
        target_calls=c.target_calls,
        priority=c.priority,
        assigned_team_id=c.assigned_team_id,
        total_contacts=total,
        completed_calls=completed,
        created_at=c.created_at
    )
