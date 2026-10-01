import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timezone, timedelta
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.entities import (
    Role, UserRole, Team, Employee, Contact, ContactAssignment,
    Campaign, CallDisposition, Setting, AssignmentStatus, CampaignStatus
)

def seed():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding Roles...")
        roles = [
            UserRole.SUPER_ADMIN.value,
            UserRole.ADMIN.value,
            UserRole.TEAM_LEAD.value,
            UserRole.EMPLOYEE.value
        ]
        for r_name in roles:
            if not db.query(Role).filter(Role.name == r_name).first():
                db.add(Role(name=r_name, description=f"{r_name} role"))

        print("Seeding Standard Call Dispositions...")
        dispositions_data = [
            ("CONNECTED", "Connected - Spoke to Customer", True, False),
            ("NO_ANSWER", "No Answer / Ringing", False, True),
            ("BUSY", "Busy / Call Waiting", False, True),
            ("SWITCHED_OFF", "Switched Off / Unreachable", False, True),
            ("INVALID_NUMBER", "Invalid / Wrong Number", False, False),
            ("INTERESTED", "Interested - Proposal Sent", True, False),
            ("NOT_INTERESTED", "Not Interested", True, False),
            ("CALLBACK", "Callback Requested", True, True),
            ("FOLLOW_UP", "Follow Up Required", True, True),
            ("COMPLETED", "Deal Closed / Completed", True, False),
            ("DO_NOT_CONTACT", "Do Not Contact (DNC)", False, False)
        ]
        for code, label, connected, callback_req in dispositions_data:
            existing = db.query(CallDisposition).filter(CallDisposition.code == code).first()
            if not existing:
                db.add(CallDisposition(
                    code=code,
                    label=label,
                    is_connected=connected,
                    requires_callback=callback_req,
                    is_active=True
                ))

        print("Seeding Teams...")
        team1 = db.query(Team).filter(Team.name == "North Region Sales").first()
        if not team1:
            team1 = Team(name="North Region Sales", description="Outbound telecalling team for North region")
            db.add(team1)
            db.flush()

        team2 = db.query(Team).filter(Team.name == "Priority Enterprise").first()
        if not team2:
            team2 = Team(name="Priority Enterprise", description="Key accounts calling team")
            db.add(team2)
            db.flush()

        print("Seeding Users...")
        # 1. Super Admin
        admin = db.query(Employee).filter(Employee.email == "admin@callingplatform.local").first()
        if not admin:
            admin = Employee(
                email="admin@callingplatform.local",
                full_name="System Super Administrator",
                hashed_password=get_password_hash("Admin@123456"),
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                daily_call_target=100,
                preferred_sim_slot=0,
                phone_number="+919999900000"
            )
            db.add(admin)

        # 2. Team Lead
        lead = db.query(Employee).filter(Employee.email == "teamlead@callingplatform.local").first()
        if not lead:
            lead = Employee(
                email="teamlead@callingplatform.local",
                full_name="Rajesh Sharma (Lead)",
                hashed_password=get_password_hash("Lead@123456"),
                role=UserRole.TEAM_LEAD,
                team_id=team1.id,
                is_active=True,
                daily_call_target=50,
                preferred_sim_slot=0,
                phone_number="+919888800001"
            )
            db.add(lead)

        # 3. Employee 1
        emp1 = db.query(Employee).filter(Employee.email == "employee1@callingplatform.local").first()
        if not emp1:
            emp1 = Employee(
                email="employee1@callingplatform.local",
                full_name="Amit Kumar",
                hashed_password=get_password_hash("Employee@123456"),
                role=UserRole.EMPLOYEE,
                team_id=team1.id,
                is_active=True,
                daily_call_target=50,
                preferred_sim_slot=0, # Work SIM 1
                phone_number="+919777700002"
            )
            db.add(emp1)
            db.flush()

        # 4. Employee 2
        emp2 = db.query(Employee).filter(Employee.email == "employee2@callingplatform.local").first()
        if not emp2:
            emp2 = Employee(
                email="employee2@callingplatform.local",
                full_name="Pooja Verma",
                hashed_password=get_password_hash("Employee@123456"),
                role=UserRole.EMPLOYEE,
                team_id=team1.id,
                is_active=True,
                daily_call_target=60,
                preferred_sim_slot=1, # SIM 2
                phone_number="+919777700003"
            )
            db.add(emp2)
            db.flush()

        print("Seeding Campaign...")
        camp = db.query(Campaign).filter(Campaign.name == "Q4 Customer Re-engagement").first()
        if not camp:
            camp = Campaign(
                name="Q4 Customer Re-engagement",
                description="Re-engaging high priority enterprise leads across Delhi NCR & Mumbai",
                status=CampaignStatus.ACTIVE,
                start_date=datetime.now(timezone.utc),
                end_date=datetime.now(timezone.utc) + timedelta(days=60),
                target_calls=500,
                priority=2,
                assigned_team_id=team1.id
            )
            db.add(camp)
            db.flush()

        print("Seeding Sample Contacts and Assignments...")
        sample_contacts = [
            ("Vikram", "Malhotra", "9810012345", "+919810012345", "Apex Logistics Ltd", "New Delhi", 3),
            ("Sunita", "Rao", "9820054321", "+919820054321", "TechNova Systems", "Mumbai", 2),
            ("Arjun", "Patel", "9879011223", "+919879011223", "Shree Ram Textiles", "Ahmedabad", 1),
            ("Neha", "Kapoor", "9845099887", "+919845099887", "Indus Cloud Solutions", "Bengaluru", 3),
            ("Rohan", "Deshmukh", "9823077665", "+919823077665", "Pune Auto Component", "Pune", 2),
            ("Kavita", "Menon", "9847033445", "+919847033445", "Malabar Agro Products", "Kochi", 1),
            ("Suresh", "Singhania", "9830022334", "+919830022334", "Kolkata Trading Co", "Kolkata", 2),
            ("Deepak", "Choudhury", "9849012398", "+919849012398", "Cyberabad BioTech", "Hyderabad", 3),
        ]

        for fname, lname, raw, norm, comp, loc, prio in sample_contacts:
            contact = db.query(Contact).filter(Contact.normalized_phone == norm).first()
            if not contact:
                contact = Contact(
                    first_name=fname,
                    last_name=lname,
                    raw_phone=raw,
                    normalized_phone=norm,
                    company=comp,
                    location=loc,
                    priority=prio,
                    tags="Lead, Enterprise"
                )
                db.add(contact)
                db.flush()

                # Assign first 4 to emp1, remaining to emp2
                target_emp = emp1 if prio >= 2 else emp2
                assignment = ContactAssignment(
                    employee_id=target_emp.id,
                    contact_id=contact.id,
                    campaign_id=camp.id,
                    status=AssignmentStatus.PENDING,
                    assigned_by_id=admin.id
                )
                db.add(assignment)

        print("Seeding System Settings...")
        settings_data = [
            ("recording_enabled", "true", "Global call recording policy toggle"),
            ("recording_retention_days", "90", "Retention period in days for S3 audio recordings"),
            ("recording_access_role", "TEAM_LEAD", "Minimum role permitted to access audio recordings"),
            ("recording_download_allowed", "false", "Whether regular managers are allowed to download recordings"),
            ("daily_default_target", "50", "Default daily call target for new employees")
        ]
        for k, v, d in settings_data:
            if not db.query(Setting).filter(Setting.key == k).first():
                db.add(Setting(key=k, value=v, description=d))

        db.commit()
        print("\nSeed completed successfully!")
        print("--------------------------------------------------")
        print("Super Admin Login: admin@callingplatform.local / Admin@123456")
        print("Team Lead Login:   teamlead@callingplatform.local / Lead@123456")
        print("Employee 1 Login:  employee1@callingplatform.local / Employee@123456")
        print("Employee 2 Login:  employee2@callingplatform.local / Employee@123456")
        print("--------------------------------------------------")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
