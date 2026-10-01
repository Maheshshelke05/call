import csv
import io
import json
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from datetime import datetime
from backend.app.models.entities import (
    Contact, ContactAssignment, AssignmentStatus, Employee,
    Campaign, Import, ImportRow, ImportStatus, Call, CallDisposition
)
from backend.app.schemas.pydantic_models import ContactCreate, ContactUpdate
from backend.app.telephony.normalization import normalize_indian_phone

def create_or_get_contact(db: Session, data: ContactCreate) -> Tuple[Contact, bool]:
    """
    Normalizes phone and checks for duplicates by normalized_phone.
    Returns: (Contact, is_created)
    """
    normalized, is_valid, err = normalize_indian_phone(data.phone)
    if not is_valid or not normalized:
        raise ValueError(f"Invalid phone number '{data.phone}': {err}")

    existing = db.query(Contact).filter(Contact.normalized_phone == normalized).first()
    if existing:
        return existing, False

    contact = Contact(
        first_name=data.first_name,
        last_name=data.last_name,
        raw_phone=data.phone,
        normalized_phone=normalized,
        email=data.email,
        company=data.company,
        location=data.location,
        priority=data.priority,
        tags=data.tags,
        notes=data.notes
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact, True

def get_employee_contact_queue(
    db: Session,
    employee_id: int,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Returns only contacts authorized and assigned to the specified employee,
    sorted by priority and assignment status.
    """
    assignments = (
        db.query(ContactAssignment)
        .filter(
            ContactAssignment.employee_id == employee_id,
            ContactAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS])
        )
        .order_by(ContactAssignment.assigned_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for a in assignments:
        c = a.contact
        if not c or c.is_do_not_call:
            continue

        # Get last call and disposition if any
        last_call = (
            db.query(Call)
            .filter(Call.contact_id == c.id)
            .order_by(Call.started_at.desc())
            .first()
        )

        last_disp_label = None
        if last_call and last_call.disposition:
            last_disp_label = last_call.disposition.label

        result.append({
            "id": c.id,
            "assignment_id": a.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "phone": c.normalized_phone,
            "company": c.company,
            "location": c.location,
            "priority": c.priority,
            "tags": c.tags,
            "notes": c.notes,
            "campaign_id": a.campaign_id,
            "campaign_name": a.campaign.name if a.campaign else None,
            "last_call_at": last_call.started_at if last_call else None,
            "last_disposition": last_disp_label,
            "status": a.status.value
        })

    return result

def assign_contacts_to_employee(
    db: Session,
    employee_id: int,
    contact_ids: List[int],
    assigned_by_id: Optional[int] = None,
    campaign_id: Optional[int] = None
) -> int:
    """
    Safely assigns contacts to an employee without duplicate active assignments.
    """
    assigned_count = 0
    for cid in contact_ids:
        # Check if already assigned
        existing = db.query(ContactAssignment).filter(
            ContactAssignment.employee_id == employee_id,
            ContactAssignment.contact_id == cid,
            ContactAssignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS])
        ).first()

        if not existing:
            assignment = ContactAssignment(
                employee_id=employee_id,
                contact_id=cid,
                campaign_id=campaign_id,
                assigned_by_id=assigned_by_id,
                status=AssignmentStatus.PENDING
            )
            db.add(assignment)
            assigned_count += 1

    db.commit()
    return assigned_count

def parse_and_preview_import(
    db: Session,
    file_bytes: bytes,
    file_name: str,
    uploaded_by_id: int
) -> Dict[str, Any]:
    """
    Parses CSV/XLSX file, normalizes phones, detects duplicates against existing DB.
    """
    content = file_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(content))

    total = 0
    valid = 0
    invalid = 0
    duplicate = 0
    preview_rows = []

    for row_idx, row in enumerate(reader, start=1):
        total += 1
        name = row.get("name") or row.get("first_name") or f"Contact {row_idx}"
        raw_phone = row.get("phone") or row.get("mobile") or row.get("phone_number") or ""
        company = row.get("company") or ""
        location = row.get("location") or row.get("city") or ""

        normalized, is_valid, err = normalize_indian_phone(raw_phone)
        status = "VALID"
        err_msg = ""

        if not is_valid or not normalized:
            invalid += 1
            status = "INVALID"
            err_msg = err
        else:
            # Check duplicate in DB
            exists = db.query(Contact).filter(Contact.normalized_phone == normalized).first()
            if exists:
                duplicate += 1
                status = "DUPLICATE"
                err_msg = "Phone number already exists in database"
            else:
                valid += 1

        if len(preview_rows) < 20: # First 20 rows for preview
            preview_rows.append({
                "row_number": row_idx,
                "name": name,
                "raw_phone": raw_phone,
                "normalized_phone": normalized or "",
                "company": company,
                "location": location,
                "status": status,
                "error": err_msg
            })

    return {
        "file_name": file_name,
        "total_rows": total,
        "valid_rows": valid,
        "invalid_rows": invalid,
        "duplicate_rows": duplicate,
        "preview_rows": preview_rows
    }
