from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.core.dependencies import require_admin, require_team_lead_or_admin
from backend.app.models.entities import Team, Employee
from backend.app.schemas.pydantic_models import TeamCreate, TeamResponse

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.get("", response_model=List[TeamResponse])
def list_teams(
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    teams = db.query(Team).all()
    results = []
    for t in teams:
        count = db.query(Employee).filter(Employee.team_id == t.id).count()
        results.append(TeamResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            created_at=t.created_at,
            member_count=count
        ))
    return results

@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    data: TeamCreate,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Team).filter(Team.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")

    team = Team(name=data.name, description=data.description)
    db.add(team)
    db.commit()
    db.refresh(team)
    return TeamResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        created_at=team.created_at,
        member_count=0
    )
