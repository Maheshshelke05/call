from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.core.security import decode_token
from backend.app.models.entities import Employee, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Employee:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    employee = db.query(Employee).filter(Employee.id == int(user_id)).first()
    if employee is None:
        raise credentials_exception
    if not employee.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee account is deactivated")

    return employee

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: Employee = Depends(get_current_user)) -> Employee:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {[r.value for r in self.allowed_roles]}"
            )
        return current_user

require_super_admin = RoleChecker([UserRole.SUPER_ADMIN])
require_admin = RoleChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN])
require_team_lead_or_admin = RoleChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEAM_LEAD])
require_employee = RoleChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.EMPLOYEE])
