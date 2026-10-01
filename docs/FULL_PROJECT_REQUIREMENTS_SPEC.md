EMPLOYEE CALLING & CRM PLATFORM
Complete Product, Architecture, Development & Deployment Documentation
React Native • FastAPI • MySQL • Redis • Docker • AWS EC2 • RDS • S3 • Amplify
Version 1.0 • Local-first development • Production-ready architecture
1. Executive Summary
This project is a centralized employee calling and CRM platform designed for approximately 300 employees and an initial contact database of 10,000+ records. Employees use an Android application to authenticate, view assigned contacts, initiate calls, capture call outcomes, schedule callbacks, maintain notes, and—where technically supported and legally permitted—associate call recordings with call records. Administrators use a web application to upload contacts, assign work, monitor calling activity, review recordings, analyze employee/team performance, and export reports.
Development is intentionally local-first. The employee mobile app and backend are built and validated locally before the Admin Web App is completed. After functional and device-level testing, the system is deployed to AWS using EC2 for the FastAPI service, RDS MySQL for the database, S3 for private recording storage, Redis for caching/queues, and Amplify for the Admin Web App.
2. Product Goals
Provide every employee with a unique authenticated account and controlled access to assigned contacts.
Provide a simple phone-like calling workflow without requiring employees to manually maintain spreadsheets.
Centralize contact assignment, call outcomes, notes, callbacks, and recordings.
Give administrators real-time operational visibility across 300 employees.
Support 10,000+ contacts initially with a design that can scale further.
Keep recordings private and access-controlled.
Maintain a complete audit trail for important administrative and recording actions.
Build locally first, validate on real Android devices, then deploy to AWS.
3. Scope
Area
Included in V1
Employee Android App
Login, dashboard, contacts, queue, dialer workflow, call history, status/disposition, notes, callbacks, recordings UI, profile
Admin Web App
Dashboard, employees, teams, contacts, imports, assignments, campaigns, calls, recordings, reports, audit logs
Backend
FastAPI REST APIs, authentication, RBAC, validation, business logic, background jobs, analytics endpoints
Data
MySQL relational data, Redis cache/queue, S3 private recording objects
Infrastructure
Docker, EC2, RDS MySQL, S3, Redis, Amplify, HTTPS, backups, monitoring
Testing
Unit, API, integration, mobile device, permission, load and deployment smoke tests
4. Important Telephony Feasibility Note
The system requirement is for employees to make ordinary mobile/SIM calls from Android devices through the custom application. Android telephony behavior varies by Android version, device manufacturer, carrier and default-dialer/Telecom APIs. Automatic recording of cellular calls is particularly restricted on some devices and configurations. Therefore the first milestone must be a Telephony Proof of Concept (POC) on the exact phone models intended for deployment.
Validate making an outgoing cellular call from the intended app/dialer flow.
Validate call-state callbacks: dialing, ringing, connected, ended, failed.
Validate speaker and mute controls supported by the chosen architecture.
Validate whether automatic two-way recording is technically available on the exact devices.
Validate storage, upload and playback of a recording.
Validate user consent and applicable telecom/privacy requirements before production rollout.
Do not assume that a single recording implementation will work identically on every Android OEM.
If cellular recording is not reliably supported, an alternative architecture is a compliant VoIP/telephony provider where recording is controlled by the provider and the platform.
5. High-Level Architecture
LOCAL DEVELOPMENT
React Native Android App
        |
        | HTTP/HTTPS
        v
FastAPI Backend ---- Redis
        |
        v
MySQL (Docker)
PRODUCTION
React Native Android App
        |
        v
FastAPI on AWS EC2
        |                     v              v
AWS RDS MySQL       Redis
        |
        v
Private AWS S3 <--- Call Recording Uploads
Admin Web (Next.js/React recommended)
        |
        v
AWS Amplify
        |
        v
FastAPI API
The employee app is mobile-first. The Admin Web App is an operational control center rather than a second employee client.
6. Recommended Technology Stack
Layer
Technology
Purpose
Mobile
React Native
Android employee application
Backend
Python + FastAPI
REST APIs and business logic
Database
MySQL
Transactional relational data
Cache/Queue
Redis
Caching, rate limits and background job coordination
Containerization
Docker + Docker Compose
Local development and reproducible services
Cloud API
AWS EC2
FastAPI production runtime
Production DB
AWS RDS MySQL
Managed MySQL
Object Storage
AWS S3
Private call recordings
Admin Web
React/Next.js
Admin control panel
Web Hosting
AWS Amplify
Admin frontend deployment
CI/CD
GitHub Actions
Build, test and deployment automation
Monitoring
CloudWatch + application logs
Infrastructure and application observability
7. Employee Android Application
7.1 Authentication
Email/Employee ID + password login.
Short-lived access token and refresh token/session strategy.
Device registration and optional device binding.
Logout and remote session revocation.
Password reset handled securely by backend/admin workflow.
Employee role enforced server-side; mobile UI is not a security boundary.
7.2 Home Dashboard
Today's assigned calls.
Pending contacts.
Completed calls.
Connected calls.
No-answer calls.
Callbacks due.
Daily target and progress.
Sync status and last successful sync.
7.3 Calling Queue
Show today's assigned contacts in priority order.
Open contact details and initiate call.
After call completion, require a disposition.
Move to next contact.
Support retry rules for no-answer/busy outcomes.
Respect campaign and assignment constraints.
7.4 Dialer
Phone-like numeric keypad.
Manual number entry.
Call button.
Delete/clear.
In-call keypad where supported.
Speaker and mute controls where supported by the telephony implementation.
Call duration display.
End call.
7.5 Contact Detail
Name, mobile number and configured custom fields.
Assigned employee and campaign.
Last call details.
Current status.
Notes.
Callback date/time.
Call history.
Recording links when available and authorized.
7.6 Dispositions
Connected
No Answer
Busy
Switched Off
Invalid Number
Interested
Not Interested
Callback
Follow-up
Completed
Do Not Contact
7.7 Call Recording
Create a recording metadata record only when recording is actually available.
Use a unique recording ID and call ID.
Store audio as a private object, never as a public S3 URL.
Upload asynchronously after the call where possible.
Show upload state: Pending / Uploading / Available / Failed.
Use short-lived signed URLs for playback.
Keep access logs for sensitive recording actions.
8. Admin Web Application
8.1 Dashboard
Total employees, active employees and inactive employees.
Today's total calls.
Connected, no-answer, busy and callback counts.
Total talk time.
Average call duration.
Calls by hour/day/week/month.
Employee and team activity.
Campaign progress.
8.2 Employee Management
Create, edit, deactivate employees.
Assign role and team.
Reset/revoke sessions.
View employee activity.
View employee call history and authorized recordings.
Set daily target.
Bind/unbind managed devices where supported.
8.3 Contact Management
Create/edit/delete contacts subject to retention policy.
Search by name, mobile, location, category and custom fields.
Bulk CSV/XLSX import.
Duplicate detection by normalized mobile number.
Bulk assignment/reassignment.
Tags and priority.
Import history and error report.
8.4 Campaign Management
Create campaign.
Set campaign status.
Attach contacts.
Assign employees/teams.
Set calling target and priority.
Track completion percentage.
View campaign outcomes.
8.5 Call & Recording Management
Filter by employee, contact, campaign, date and status.
View call metadata and duration.
Play authorized recordings.
Generate signed playback URLs.
Record who accessed a recording.
Download only for roles with explicit permission.
9. End-to-End Calling Workflow
Employee logs into the mobile application.
Backend authenticates the user and returns an authorized session.
Employee opens Today's Calls.
The app loads the assigned queue.
Employee opens a contact and taps Call.
The app/telephony layer initiates the supported outgoing call.
Backend/mobile captures supported call-state events.
If recording is technically available and authorized, recording begins according to the validated implementation.
Call ends.
Call metadata is synchronized to the backend.
Recording is uploaded to private storage if available.
Employee selects a disposition and optionally enters notes.
If Callback is selected, a callback time is saved.
Queue moves to the next eligible contact.
Admin analytics are updated.
10. Database Design
Core relational entities should be separated so call history remains immutable/auditable while contact and assignment information can change.
Table
Purpose
employees
Employee identity, role, team and status
employee_devices
Managed device registration and security metadata
roles
RBAC roles
teams
Employee grouping
contacts
Customer/contact master records
contact_assignments
Which employee owns which contact
campaigns
Calling campaigns
campaign_contacts
Campaign membership
calls
One row per call attempt
call_events
Call lifecycle events
call_dispositions
Outcome selected after a call
call_notes
Employee/admin notes
callbacks
Scheduled follow-up calls
recordings
Private object metadata and upload state
recording_access_logs
Who accessed which recording
imports
Import batch metadata
import_rows
Row-level import validation/errors
notifications
In-app notifications
audit_logs
Security and administrative audit trail
settings
System configuration
10.1 Suggested calls fields
calls
- id (BIGINT/UUID)
- employee_id
- contact_id
- campaign_id
- external_call_reference
- phone_number_snapshot
- started_at
- answered_at
- ended_at
- duration_seconds
- status
- disposition_id
- notes_id
- recording_id
- created_at
- updated_at
10.2 Important indexes
contacts(normalized_phone)
contact_assignments(employee_id, status)
calls(employee_id, started_at)
calls(contact_id, started_at)
calls(campaign_id, started_at)
calls(status, started_at)
callbacks(employee_id, scheduled_at, status)
recordings(call_id)
audit_logs(actor_id, created_at)
11. Backend API Structure
/api/v1/auth/login
/api/v1/auth/refresh
/api/v1/auth/logout
/api/v1/me
/api/v1/employees
/api/v1/teams
/api/v1/contacts
/api/v1/contacts/{id}
/api/v1/contacts/import
/api/v1/contacts/assign
/api/v1/campaigns
/api/v1/campaigns/{id}
/api/v1/calls
/api/v1/calls/{id}
/api/v1/calls/{id}/events
/api/v1/calls/{id}/disposition
/api/v1/callbacks
/api/v1/recordings/{id}
/api/v1/recordings/{id}/playback-url
/api/v1/dashboard
/api/v1/reports
/api/v1/audit-logs
All API endpoints must enforce authentication, authorization, validation, pagination and rate limits where appropriate.
12. Redis Responsibilities
Short-lived cache for dashboard summaries and frequently read configuration.
Rate limiting for login and sensitive endpoints.
Background job queue coordination.
Recording processing/upload job state.
Import processing job state.
Temporary locks to prevent duplicate assignment or duplicate job execution.
Do not treat Redis as the source of truth for permanent business data.
13. Local Development Plan
The first development stage should not depend on AWS. All core workflows must be reproducible on a developer machine.
project-root/
├── mobile/
├── backend/
├── admin-web/
├── infra/
│   └── docker/
├── docs/
├── scripts/
├── .env.example
├── docker-compose.yml
└── README.md
13.1 Local services
Service
Local implementation
FastAPI
Docker container or local Python virtual environment
MySQL
Docker container with persistent volume
Redis
Docker container with persistent/configured volume as required
Employee App
React Native Metro + Android emulator/real device
Admin Web
Local React/Next.js dev server
Object storage
Local S3-compatible mock or local filesystem during early development; production S3 later
API documentation
FastAPI OpenAPI/Swagger locally
13.2 Example Docker Compose services
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [mysql, redis]
  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: calling_app
      MYSQL_USER: app
      MYSQL_PASSWORD: <dev-secret>
      MYSQL_ROOT_PASSWORD: <dev-root-secret>
    ports: ["3306:3306"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
Development secrets must remain local. Never commit .env files, production credentials, AWS keys or database passwords to Git.
14. Development Roadmap
Phase
Deliverables
Exit Criteria
Phase 0 – Telephony POC
React Native test app, permissions, outgoing call, call state, recording feasibility
Exact target devices pass telephony tests or an approved alternative is selected
Phase 1 – Backend Foundation
FastAPI, MySQL schema, Redis, auth, Docker
API runs locally and tests pass
Phase 2 – Employee App Core
Login, dashboard, contacts, queue, profile
Employee can authenticate and work through assigned contacts
Phase 3 – Calling Workflow
Call lifecycle, disposition, notes, callbacks
End-to-end call record is reliable
Phase 4 – Recording
Upload, metadata, private access, playback
Supported devices produce accessible authorized recordings
Phase 5 – Admin Web
Dashboard, employees, contacts, imports, calls
Admin can manage operations locally
Phase 6 – Analytics & Reports
Charts, filters, exports, campaign reports
Metrics reconcile with raw call data
Phase 7 – Security & QA
RBAC, audit, rate limiting, backups, test suite
Security and regression checklist passes
Phase 8 – AWS Deployment
EC2, RDS, S3, Redis, Amplify, HTTPS
Production smoke test passes
15. Contact Import Specification
The import process must be transactional and preview-first.
Admin uploads CSV/XLSX.
Backend creates an import batch.
File is parsed and validated.
Phone numbers are normalized.
Required fields are checked.
Duplicates are detected.
Invalid rows are reported separately.
Admin previews counts.
Admin confirms import.
Valid rows are inserted/upserted according to selected mode.
Assignment rules are applied.
Import summary is stored.
Recommended import result: Total Rows, Valid, Invalid, Duplicate, Inserted, Updated, Skipped.
16. Security Architecture
Passwords stored only as strong salted hashes.
Access tokens should be short-lived; refresh/session tokens should be revocable.
RBAC enforced at API level.
Employee endpoints must scope data by employee/team authorization.
S3 bucket must remain private.
Use signed URLs for temporary recording access.
Use TLS/HTTPS in production.
Validate all uploaded files and enforce file-size/type limits.
Protect against SQL injection through parameterized ORM/query methods.
Apply API rate limiting to authentication and sensitive operations.
Maintain audit logs for employee administration, data imports and recording access.
Use least-privilege AWS IAM roles.
Keep secrets in environment/secret-management systems rather than source code.
Define retention and deletion policies for contact data and recordings.
17. Production AWS Deployment
Target production topology:
Internet
   |
   +--> Amplify (Admin Web)
   |
   +--> EC2 / Reverse Proxy / FastAPI
             |
             +--> RDS MySQL
             +--> Redis
             +--> S3 Private Bucket
Mobile App --> HTTPS --> FastAPI --> RDS / Redis / S3
17.1 EC2
Run FastAPI containers using Docker.
Use a reverse proxy such as Nginx if required by the chosen deployment model.
Expose only required ports.
Use a process/restart policy so the API recovers after failure.
Send application/system logs to CloudWatch or another controlled logging system.
Use security groups with least privilege.
17.2 RDS MySQL
Keep RDS private where architecture permits.
Allow database access only from the backend security group.
Enable automated backups.
Set backup retention according to business requirements.
Monitor CPU, connections, storage and slow queries.
Use migrations; do not manually modify production schema without a migration record.
17.3 S3
Private bucket only.
Block public access.
Use server-side encryption.
Use unique object keys such as recordings/{yyyy}/{mm}/{employee_id}/{call_id}.ext.
Use lifecycle rules according to retention requirements.
Never expose permanent public URLs.
17.4 Amplify
Connect Admin Web repository.
Configure build settings.
Set production API base URL through environment configuration.
Enable HTTPS/custom domain if required.
Separate development/staging/production environments.
18. CI/CD Strategy
Git push
   |
GitHub Actions
   |
   +-- lint
   +-- unit tests
   +-- API tests
   +-- build
   +-- Docker image
   +-- security checks
   |
Deploy staging
   |
Smoke tests
   |
Manual approval
   |
Production deploy
Keep separate development/staging/production configurations.
Use protected branches for production.
Do not store production secrets in the repository.
Tag releases.
Keep database migrations version-controlled.
Have a rollback procedure before every production deployment.
19. Testing Strategy
Test Type
Examples
Unit
Disposition rules, assignment rules, validators, analytics calculations
API
Auth, contacts, calls, imports, callbacks, recordings permissions
Integration
FastAPI + MySQL + Redis, background jobs
Mobile
Login, queue, contact details, call workflow, offline/online sync
Device
Exact Android models, permissions, call states, recording feasibility
Security
RBAC, IDOR prevention, rate limiting, signed URL access
Load
Concurrent employees, dashboard queries, import processing
Deployment
Health checks, migrations, storage access, smoke tests
19.1 Minimum acceptance tests
Employee A cannot access Employee B's assigned contacts unless explicitly authorized.
Admin can upload a 10,000-row dataset and receive an import summary.
Duplicate phone numbers are detected according to the configured policy.
A completed call creates exactly one primary call record.
Retry attempts remain distinguishable as separate call attempts.
Callback scheduling appears in the employee's queue.
Recording playback requires authorization and uses a temporary signed URL.
Dashboard totals reconcile with raw call records for the selected period.
Deactivated employees cannot create new calls through the API.
Production secrets are absent from source control.
20. Offline & Synchronization Strategy
Mobile connectivity can be unreliable. The app should remain usable for non-sensitive local workflow data and synchronize safely when connectivity returns.
Use a local SQLite store for assigned queue and recent call metadata where appropriate.
Maintain a sync queue with idempotency keys.
Server is the source of truth.
Do not silently overwrite server changes.
Show sync state to the employee.
Retry failed uploads with exponential backoff.
Recording files should use resumable/robust upload logic where feasible.
21. Analytics Definitions
Metric
Definition
Total Calls
Count of call attempts in selected period
Connected Calls
Attempts with answered/connected state
No Answer
Attempts ending without answer
Total Talk Time
Sum of duration for connected calls
Average Call Duration
Total talk time / connected calls
Callback Rate
Callbacks / connected or configured denominator
Completion Rate
Completed contacts / assigned contacts
Employee Activity
Calls attributable to a specific employee
Campaign Progress
Completed eligible contacts / campaign contacts
22. Monitoring & Operations
API health endpoint: /health.
Readiness endpoint: /ready.
Track error rate, latency and request volume.
Monitor EC2 CPU/memory/disk.
Monitor RDS CPU/storage/connections.
Monitor Redis memory and availability.
Monitor S3 upload failures.
Alert on repeated application crashes and backup failures.
Keep structured logs with request/correlation IDs.
23. Backup & Disaster Recovery
RDS automated backups enabled.
Periodic restore tests, not just backup creation.
Application code stored in Git.
Infrastructure configuration version-controlled.
S3 versioning/lifecycle strategy as appropriate.
Document recovery order: infrastructure → database → storage → backend → admin frontend → mobile configuration.
Define RPO/RTO before production.
24. Privacy, Consent & Data Governance
The platform processes phone numbers, customer information, employee information and potentially voice recordings. Before production, define the lawful basis, consent/notice requirements, retention periods, access controls, deletion process, grievance/contact process and any applicable telecom/privacy obligations. Recording should not be enabled merely because the app can technically capture audio; the organization must establish the required compliance process.
25. UI/UX Principles
Employee app should feel like a focused professional dialer/CRM, not a complicated enterprise dashboard.
Primary action on contact screen should be Call.
Use large touch targets for phone controls.
Show call status clearly.
Keep disposition selection fast after each call.
Use clear empty/loading/error states.
Admin dashboard should prioritize actionable KPIs and filters.
Use responsive tables and charts.
Keep destructive actions behind confirmation and permission checks.
26. Recommended Repository Structure
employee-calling-platform/
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── services/
│   │   ├── store/
│   │   ├── database/
│   │   └── utils/
│   └── android/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── workers/
│   │   └── main.py
│   ├── migrations/
│   └── tests/
├── admin-web/
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── aws/
├── docs/
└── .github/workflows/
27. Environment Variables
APP_ENV=local
APP_DEBUG=true
DATABASE_URL=mysql+pymysql://app:password@mysql:3306/calling_app
REDIS_URL=redis://redis:6379/0
JWT_SECRET=<local-secret>
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=30
AWS_REGION=ap-south-1
AWS_S3_BUCKET=<production-bucket>
AWS_ACCESS_KEY_ID=<only if required>
AWS_SECRET_ACCESS_KEY=<only if required>
ADMIN_WEB_ORIGIN=http://localhost:3000
MOBILE_API_BASE_URL=http://<developer-machine-ip>:8000
For production, prefer IAM roles/secret management over long-lived AWS access keys wherever possible.
28. Production Release Checklist
Telephony POC passed on target Android devices.
Recording behavior verified and compliance approval completed.
All environment variables configured.
Database migrations tested.
RDS backup and restore procedure tested.
S3 bucket private and encrypted.
RBAC tested.
Recording signed URLs tested.
Import of representative 10,000-contact dataset tested.
Dashboard totals reconciled.
Load test completed.
Monitoring and alerts configured.
HTTPS/custom domain verified.
Rollback procedure documented.
Production smoke test completed.
29. Future Enhancements
Team leader dashboards.
AI call summarization, subject to privacy/compliance approval.
Automatic call outcome suggestions.
WhatsApp/SMS follow-up integrations.
Predictive callback prioritization.
Advanced campaign segmentation.
VoIP/provider integration if cellular recording is insufficient.
Advanced quality monitoring.
Multi-tenant architecture if the product is commercialized.
Kubernetes/ECS migration only when scale justifies operational complexity.
30. Recommended MVP Build Order
Create Git repository and project skeleton.
Set up FastAPI + Docker + MySQL + Redis locally.
Create migrations and core schema.
Implement authentication/RBAC.
Build React Native login.
Build employee dashboard and assigned contact queue.
Build contact details.
Run the telephony POC on the actual target Android phones.
Implement call lifecycle synchronization.
Implement disposition, notes and callbacks.
Implement recording feasibility/upload path if supported.
Build Admin Web login and dashboard.
Build employee/contact management.
Build CSV/XLSX import and assignment.
Build calls/recordings pages.
Build analytics and reports.
Complete security/testing.
Deploy backend to EC2 and DB to RDS.
Move recordings to private S3.
Deploy Admin Web to Amplify.
Perform production pilot with a small controlled employee group before all 300 devices.
31. Definition of Done
The project is considered production-ready only when:
300 employee accounts can be managed with role-based permissions.
10,000+ contacts can be imported and assigned reliably.
Employee call workflow is validated on the target Android fleet.
Call records are consistent and auditable.
Recording functionality works only where technically and legally supported.
Admin can inspect employee activity and authorized recordings.
Reports and dashboard metrics reconcile with the database.
Database, storage and application backups are operational.
Security tests and access-control tests pass.
AWS deployment is reproducible and documented.
Monitoring, alerting and rollback procedures are ready.
32. Final Recommended Architecture Decision
Build the system as a modular monolith initially: one FastAPI backend, one MySQL database, one Redis service, one Admin Web App and one React Native Android App. Keep clear service/repository boundaries inside the backend, but do not split into microservices at the beginning. This keeps development, deployment and debugging manageable for the initial 300-employee / 10,000-contact scale. Introduce separate workers or services only when measured workload requires them.
The highest-risk item is not the CRM/database/dashboard portion; it is reliable cellular call control and automatic recording across the actual Android devices. Validate that first. Once the telephony POC passes, the remaining platform can be developed against stable call lifecycle interfaces.
33. Document Change Log
Version
Date
Change
1.0
01-Oct-2026
Initial complete project architecture, requirements, local development, AWS deployment and QA documentation.