from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_admin, require_team_lead_or_admin
from backend.app.models.entities import (
    Contact, ContactAssignment, AssignmentStatus, Employee, UserRole,
    Import, ImportStatus, ImportRow, utc_now
)
from backend.app.schemas.pydantic_models import (
    ContactCreate, ContactUpdate, ContactResponse, ContactAssignmentCreate
)
from backend.app.services.contact_service import (
    create_or_get_contact, get_employee_contact_queue, assign_contacts_to_employee,
    parse_and_preview_import
)
from backend.app.services.audit_service import log_audit_event
from backend.app.telephony.normalization import normalize_indian_phone

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.get("/queue", response_model=List[Dict[str, Any]])
def get_my_contact_queue(
    limit: int = 50,
    offset: int = 0,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns only the contacts assigned to and authorized for the current logged-in employee.
    """
    return get_employee_contact_queue(db, current_user.id, limit=limit, offset=offset)

@router.get("", response_model=List[ContactResponse])
def list_contacts(
    search: Optional[str] = None,
    priority: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Contact)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Contact.first_name.ilike(search_fmt)) |
            (Contact.last_name.ilike(search_fmt)) |
            (Contact.normalized_phone.ilike(search_fmt)) |
            (Contact.company.ilike(search_fmt))
        )
    if priority:
        query = query.filter(Contact.priority == priority)

    return query.order_by(Contact.id.desc()).offset(offset).limit(limit).all()

@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    data: ContactCreate,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        contact, is_created = create_or_get_contact(db, data)
        if not is_created:
            raise HTTPException(
                status_code=409,
                detail=f"Contact with normalized phone '{contact.normalized_phone}' already exists"
            )
        log_audit_event(
            db=db,
            action="CONTACT_CREATED",
            actor_id=current_user.id,
            entity_type="CONTACT",
            entity_id=contact.id,
            payload={"phone": contact.normalized_phone}
        )
        return contact
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}", response_model=ContactResponse)
def get_contact(
    id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact = db.query(Contact).filter(Contact.id == id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # If employee, verify assignment
    if current_user.role == UserRole.EMPLOYEE:
        assigned = db.query(ContactAssignment).filter(
            ContactAssignment.employee_id == current_user.id,
            ContactAssignment.contact_id == id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="Contact not assigned to you")

    return contact

@router.put("/{id}", response_model=ContactResponse)
def update_contact(
    id: int,
    data: ContactUpdate,
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    contact = db.query(Contact).filter(Contact.id == id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if data.first_name is not None:
        contact.first_name = data.first_name
    if data.last_name is not None:
        contact.last_name = data.last_name
    if data.phone is not None:
        norm, valid, err = normalize_indian_phone(data.phone)
        if not valid or not norm:
            raise HTTPException(status_code=400, detail=f"Invalid phone: {err}")
        contact.raw_phone = data.phone
        contact.normalized_phone = norm
    if data.email is not None:
        contact.email = data.email
    if data.company is not None:
        contact.company = data.company
    if data.location is not None:
        contact.location = data.location
    if data.priority is not None:
        contact.priority = data.priority
    if data.tags is not None:
        contact.tags = data.tags
    if data.notes is not None:
        contact.notes = data.notes
    if data.is_do_not_call is not None:
        contact.is_do_not_call = data.is_do_not_call

    db.commit()
    db.refresh(contact)
    return contact

@router.post("/assign")
def assign_contacts(
    data: ContactAssignmentCreate,
    current_user: Employee = Depends(require_team_lead_or_admin),
    db: Session = Depends(get_db)
):
    assigned_count = assign_contacts_to_employee(
        db=db,
        employee_id=data.employee_id,
        contact_ids=data.contact_ids,
        assigned_by_id=current_user.id,
        campaign_id=data.campaign_id
    )

    log_audit_event(
        db=db,
        action="CONTACTS_ASSIGNED",
        actor_id=current_user.id,
        entity_type="EMPLOYEE",
        entity_id=data.employee_id,
        payload={"assigned_count": assigned_count, "contact_ids": data.contact_ids}
    )

    return {
        "message": f"Successfully assigned {assigned_count} contacts",
        "assigned_count": assigned_count
    }

@router.post("/import-preview")
async def import_contacts_preview(
    file: UploadFile = File(...),
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV or text files supported for preview")

    content = await file.read()
    preview = parse_and_preview_import(
        db=db,
        file_bytes=content,
        file_name=file.filename,
        uploaded_by_id=current_user.id
    )
    return preview

@router.post("/import-confirm")
async def import_contacts_confirm(
    file: UploadFile = File(...),
    current_user: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    content = await file.read()
    import_rec = Import(
        uploaded_by_id=current_user.id,
        file_name=file.filename,
        status=ImportStatus.PROCESSING
    )
    db.add(import_rec)
    db.commit()
    db.refresh(import_rec)

    # Process rows
    import csv, io
    text_content = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text_content))

    inserted = 0
    duplicate = 0
    invalid = 0

    for idx, row in enumerate(reader, start=1):
        name = row.get("name") or row.get("first_name") or f"Contact {idx}"
        phone = row.get("phone") or row.get("mobile") or ""
        company = row.get("company")
        location = row.get("location") or row.get("city")

        norm, valid, err = normalize_indian_phone(phone)
        if not valid or not norm:
            invalid += 1
            continue

        exists = db.query(Contact).filter(Contact.normalized_phone == norm).first()
        if exists:
            duplicate += 1
            continue

        c = Contact(
            first_name=name,
            raw_phone=phone,
            normalized_phone=norm,
            company=company,
            location=location,
            priority=1
        )
        db.add(c)
        inserted += 1

    import_rec.total_rows = inserted + duplicate + invalid
    import_rec.valid_rows = inserted
    import_rec.inserted_rows = inserted
    import_rec.duplicate_rows = duplicate
    import_rec.invalid_rows = invalid
    import_rec.status = ImportStatus.COMPLETED
    import_rec.completed_at = utc_now()
    db.commit()

    log_audit_event(
        db=db,
        action="IMPORT_COMPLETED",
        actor_id=current_user.id,
        entity_type="IMPORT",
        entity_id=import_rec.id,
        payload={"inserted": inserted, "duplicate": duplicate, "invalid": invalid}
    )

    return {
        "import_id": import_rec.id,
        "total_rows": import_rec.total_rows,
        "inserted": inserted,
        "duplicate": duplicate,
        "invalid": invalid
    }
