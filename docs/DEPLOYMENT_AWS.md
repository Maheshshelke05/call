# AWS Production Deployment Guide

## Employee Calling & CRM Platform
**Local Testing → Staging → AWS Production Infrastructure**

---

### 1. Production Architecture Overview

```
                      +---------------------------------------+
                      |         INTERNET / EMPLOYEES          |
                      +-------------------+-------------------+
                                          |
                        +-----------------+-----------------+
                        | HTTPS (Port 443)|                 | HTTPS (Port 443)
                        v                                   v
             +-----------------------+           +-----------------------+
             |  Admin Web Portal     |           |  Employee Mobile App  |
             |  (AWS Amplify / CDN)  |           |  (React Native APK)   |
             +-----------+-----------+           +-----------+-----------+
                         |                                   |
                         | REST API Requests                 | REST API Requests
                         +-----------------+-----------------+
                                           |
                                           v
                             +---------------------------+
                             |    AWS Application VPC    |
                             |   Elastic IP / Route 53   |
                             +-------------+-------------+
                                           |
                                           v
                             +---------------------------+
                             |     NGINX Reverse Proxy   |
                             |   SSL/TLS 1.3 Termination |
                             +-------------+-------------+
                                           |
                                           v
                             +---------------------------+
                             |    FastAPI Docker App     |
                             |  EC2 (t3.medium / large)  |
                             +------+-------------+------+
                                    |             |
                +-------------------+             +--------------------+
                | SQL (Port 3306)                 | Redis (Port 6379)  | S3 API (HTTPS)
                v                                 v                    v
+-------------------------------+ +-------------------+ +-----------------------------+
|    Amazon RDS MySQL 8.0       | |   ElastiCache /   | |    AWS S3 Private Bucket    |
| - Private Subnet (Multi-AZ)   | |   Redis Cluster   | | - Public Access Blocked     |
| - Automated 14-day Backups    | | - Celery Worker   | | - AES-256 SSE Encryption    |
| - Storage Auto-scaling        | | - Rate Limiter    | | - 90-Day Lifecycle Purge    |
+-------------------------------+ +-------------------+ +-----------------------------+
```

---

### 2. Pre-Deployment Validation (Local Machine)

Before deploying to AWS, verify all tests and configurations locally:

1. **Verify Backend Tests (12/12 passing):**
   ```bash
   python -m pytest backend/tests/test_backend_suite.py -v
   ```
2. **Verify Database Seeding:**
   ```bash
   python scripts/seed_data.py
   ```
3. **Verify Local Docker Stack:**
   ```bash
   docker compose up --build -d
   ```
   Check health endpoints:
   - `curl http://localhost:8000/health` (should return `{"status": "healthy"}`)
   - `curl http://localhost:8000/ready` (should return `{"status": "ready"}`)
   - Admin Web: `http://localhost:3000`

---

### 3. Step 1: AWS VPC & Private Subnets

1. Create a VPC in `ap-south-1` (Mumbai) with CIDR `10.0.0.0/16`.
2. Create 2 Public Subnets (`10.0.1.0/24`, `10.0.2.0/24`) across AZ `ap-south-1a` and `ap-south-1b`.
3. Create 2 Private Subnets (`10.0.10.0/24`, `10.0.11.0/24`) for RDS MySQL and ElastiCache.
4. Attach an Internet Gateway to the public subnets.

---

### 4. Step 2: Amazon RDS MySQL Setup

1. **Create DB Subnet Group:** Include the two private subnets.
2. **Create MySQL 8.0 Instance:**
   - DB Identifier: `telephony-crm-mysql-prod`
   - Instance Class: `db.t4g.medium` (or `db.m6g.large` for high volume)
   - Allocated Storage: 50 GB gp3 with storage auto-scaling up to 200 GB.
   - Master Credentials: Store password in **AWS Secrets Manager**.
   - Security Group: Allow inbound TCP on port `3306` **only** from the EC2 Web Security Group.
   - Backup Retention: 14 days with point-in-time recovery enabled.
   - Deletion Protection: **Enabled**.

---

### 5. Step 3: AWS S3 Private Recordings Bucket

1. **Create Bucket:** `employee-telephony-recordings-prod` in `ap-south-1`.
2. **Block Public Access:**
   - Block public ACLs: `True`
   - Ignore public ACLs: `True`
   - Block public policy: `True`
   - Restrict public buckets: `True`
3. **Apply Server-Side Encryption:** Default encryption AES-256 (`aws:kms` or `AES256`).
4. **Attach Bucket Policy:** Apply [`infra/aws/s3_bucket_policy.json`](file:///c:/Users/Mahesh/Desktop/test%20calling/infra/aws/s3_bucket_policy.json) to deny unencrypted HTTP transfers.
5. **Configure Lifecycle Rules:**
   - Transition to Amazon S3 Glacier Flexible Retrieval after 60 days.
   - Expire and permanently delete after 90 days.

---

### 6. Step 4: EC2 Instance Provisioning & IAM Role

1. **Launch Instance:** Ubuntu 24.04 LTS (`t3.medium`) in Public Subnet `1a`.
2. **Assign Elastic IP:** Associate a static Elastic IP for consistent DNS routing.
3. **Attach IAM Instance Profile:**
   - Attach [`infra/aws/iam_policy_s3_recordings.json`](file:///c:/Users/Mahesh/Desktop/test%20calling/infra/aws/iam_policy_s3_recordings.json) directly to the EC2 instance role.
   - **Never store AWS Access Keys on the EC2 disk or in Docker images.** The AWS SDK automatically retrieves temporary IAM credentials from the EC2 instance metadata service (IMDSv2).
4. **Security Group Rules:**
   - Inbound: Port 80 (HTTP), Port 443 (HTTPS), Port 22 (SSH - restricted to company VPN IP).
   - Outbound: All traffic (0.0.0.0/0).

---

### 7. Step 5: Server Configuration & Docker Deployment

SSH into your EC2 instance and run the following commands:

```bash
# 1. Update system packages and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git nginx certbot python3-certbot-nginx

# 2. Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
newgrp docker

# 3. Clone application repository
git clone https://github.com/your-org/employee-calling-platform.git /opt/telephony-crm
cd /opt/telephony-crm

# 4. Create production environment file (.env.production)
cat << 'EOF' > .env.production
APP_ENV=production
APP_NAME="Employee Calling & CRM Platform"
DEBUG=false

DATABASE_URL=mysql+pymysql://crm_master_user:<RDS_PASSWORD>@<RDS_ENDPOINT>:3306/calling_crm
REDIS_URL=redis://localhost:6379/0

JWT_SECRET=<STRONG_GENERATED_64_CHAR_HEX_SECRET>
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

AWS_REGION=ap-south-1
AWS_S3_BUCKET=employee-telephony-recordings-prod

RECORDING_PRESIGNED_URL_EXPIRE_SECONDS=300
RECORDING_RETENTION_DAYS=90

ADMIN_WEB_ORIGIN=https://crm.yourcompany.com
MOBILE_API_BASE_URL=https://api-crm.yourcompany.com/api/v1
EOF

# 5. Launch containers using production compose
docker compose -f docker-compose.prod.yml up -d --build

# 6. Apply database migrations
docker compose -f docker-compose.prod.yml run --rm api python -m alembic upgrade head
```

---

### 8. Step 6: SSL/TLS with Let's Encrypt & Certbot

```bash
# Obtain automated SSL certificates for API and Admin domains
sudo certbot --nginx -d api-crm.yourcompany.com -d crm.yourcompany.com

# Enable automatic certificate renewal
sudo systemctl enable certbot.timer
```

---

### 9. Step 7: Admin Web Portal on AWS Amplify (Alternative)

If preferred over self-hosting the Next.js container on EC2:
1. Connect your GitHub repository to **AWS Amplify**.
2. Select the `admin-web` subfolder.
3. Configure build settings:
   ```yaml
   frontend:
     phases:
       preBuild:
         commands:
           - cd admin-web
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: admin-web/.next
       files:
         - '**/*'
   ```
4. Set environment variable: `NEXT_PUBLIC_API_URL=https://api-crm.yourcompany.com/api/v1`.
5. Connect your custom domain: `https://crm.yourcompany.com`.

---

### 10. Step 8: Android Mobile App Production Build

1. Configure production endpoint in `mobile/react-native-app/src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'https://api-crm.yourcompany.com/api/v1';
   ```
2. Generate production release keystore:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias telephony-crm -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Assemble release APK:
   ```bash
   cd mobile/react-native-app/android
   ./gradlew assembleRelease
   ```
4. Distribute APK via Private Enterprise MDM (Microsoft Intune, Google Workspace Private Play Store, or direct APK download from Admin portal).
