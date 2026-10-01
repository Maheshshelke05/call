from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.app.models.entities import (
    UserRole, CallStatus, RecordingStatus, CampaignStatus,
    AssignmentStatus, CallbackStatus, ImportStatus
)

# ----------------- Auth Schemas -----------------

class LoginRequest(BaseModel):
    email: str
    password: str
    device_model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class DeviceRegisterRequest(BaseModel):
    device_model: str
    os_version: str
    app_version: str
    fcm_token: Optional[str] = None

# ----------------- Employee Schemas -----------------

class EmployeeCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: UserRole = UserRole.EMPLOYEE
    team_id: Optional[int] = None
    daily_call_target: int = 50
    preferred_sim_slot: int = 0
    phone_number: Optional[str] = None

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    team_id: Optional[int] = None
    is_active: Optional[bool] = None
    daily_call_target: Optional[int] = None
    preferred_sim_slot: Optional[int] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    team_id: Optional[int] = None
    is_active: bool
    daily_call_target: int
    preferred_sim_slot: int
    phone_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Team Schemas -----------------

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TeamResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    member_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ----------------- Contact Schemas -----------------

class ContactCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    priority: int = 1
    tags: Optional[str] = None
    notes: Optional[str] = None

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    priority: Optional[int] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    is_do_not_call: Optional[bool] = None

class ContactResponse(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    raw_phone: str
    normalized_phone: str
    email: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    priority: int
    tags: Optional[str] = None
    notes: Optional[str] = None
    is_do_not_call: bool
    created_at: datetime
    last_called_at: Optional[datetime] = None
    last_disposition: Optional[str] = None
    campaign_name: Optional[str] = None

    class Config:
        from_attributes = True

class ContactAssignmentCreate(BaseModel):
    employee_id: int
    contact_ids: List[int]
    campaign_id: Optional[int] = None

# ----------------- Campaign Schemas -----------------

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_calls: int = 0
    priority: int = 1
    assigned_team_id: Optional[int] = None

class CampaignResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: CampaignStatus
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_calls: int
    priority: int
    assigned_team_id: Optional[int] = None
    total_contacts: Optional[int] = 0
    completed_calls: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Call Schemas -----------------

class CallSyncRequest(BaseModel):
    client_event_id: str = Field(..., description="Client idempotency key UUID")
    contact_id: int
    campaign_id: Optional[int] = None
    phone_number_snapshot: str
    sim_slot: int = 0
    started_at: datetime
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    status: CallStatus = CallStatus.COMPLETED
    disposition_code: Optional[str] = None
    notes: Optional[str] = None
    callback_at: Optional[datetime] = None
    external_call_reference: Optional[str] = None

class CallEventCreate(BaseModel):
    event_type: str
    event_timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata_json: Optional[str] = None

class CallDispositionRequest(BaseModel):
    disposition_code: str
    notes: Optional[str] = None
    callback_at: Optional[datetime] = None

class CallResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    contact_id: int
    contact_name: Optional[str] = None
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    phone_number_snapshot: str
    sim_slot: int
    started_at: datetime
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: int
    status: CallStatus
    disposition_label: Optional[str] = None
    disposition_code: Optional[str] = None
    notes: Optional[str] = None
    recording_id: Optional[int] = None
    recording_status: Optional[str] = None
    client_event_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Callback Schemas -----------------

class CallbackCreate(BaseModel):
    contact_id: int
    scheduled_at: datetime
    notes: Optional[str] = None
    call_id: Optional[int] = None

class CallbackUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    status: Optional[CallbackStatus] = None
    notes: Optional[str] = None

class CallbackResponse(BaseModel):
    id: int
    employee_id: int
    contact_id: int
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    scheduled_at: datetime
    status: CallbackStatus
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Recording Schemas -----------------

class RecordingPlaybackUrlResponse(BaseModel):
    recording_id: int
    call_id: int
    playback_url: str
    expires_in_seconds: int
    duration_seconds: int
    file_size_bytes: int

class RecordingListItem(BaseModel):
    id: int
    call_id: int
    employee_id: int
    employee_name: str
    contact_name: str
    contact_phone: str
    campaign_name: Optional[str] = None
    call_date: datetime
    duration_seconds: int
    disposition_label: Optional[str] = None
    status: RecordingStatus
    created_at: datetime

# ----------------- Dashboard Schemas -----------------

class EmployeeDashboardResponse(BaseModel):
    daily_target: int
    completed_calls: int
    connected_calls: int
    no_answer_calls: int
    busy_calls: int
    callbacks_due_today: int
    remaining_calls: int
    assigned_contacts_count: int
    sync_status: str = "SYNCED"

class AdminDashboardResponse(BaseModel):
    total_employees: int
    active_employees: int
    total_contacts: int
    today_calls: int
    connected_calls: int
    no_answer_calls: int
    busy_calls: int
    callbacks_count: int
    total_talk_time_seconds: int
    average_call_duration_seconds: float
    campaign_progress: List[Dict[str, Any]]
    calls_by_hour: List[Dict[str, Any]]
    calls_by_day: List[Dict[str, Any]]
    recording_availability_stats: Dict[str, int]


# ----------------- Audit Schemas -----------------

class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    payload_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Settings & Dispositions Schemas -----------------

class SettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

class SettingUpdateRequest(BaseModel):
    settings: Dict[str, str]

class DispositionResponse(BaseModel):
    id: int
    code: str
    label: str
    is_connected: bool
    requires_callback: bool
    is_active: bool

    class Config:
        from_attributes = True

class DispositionCreateRequest(BaseModel):
    code: str
    label: str
    is_connected: bool = False
    requires_callback: bool = False
    is_active: bool = True

class DispositionUpdateRequest(BaseModel):
    label: Optional[str] = None
    is_connected: Optional[bool] = None
    requires_callback: Optional[bool] = None
    is_active: Optional[bool] = None

