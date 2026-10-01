# Production AWS Infrastructure for Employee Calling & CRM Platform
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "ap-south-1" # Mumbai region for low latency across India
}

variable "environment" {
  default = "production"
}

# 1. Private S3 Bucket for Call Recordings
resource "aws_s3_bucket" "recordings" {
  bucket = "employee-telephony-recordings-prod"

  tags = {
    Name        = "employee-telephony-recordings"
    Environment = var.environment
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "recordings_block" {
  bucket = aws_s3_bucket.recordings.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-Side Encryption (AES256)
resource "aws_s3_bucket_server_side_encryption_configuration" "recordings_crypto" {
  bucket = aws_s3_bucket.recordings.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle Policy: Transition to Glacier after 60 days, expire after 90 days
resource "aws_s3_bucket_lifecycle_configuration" "recordings_lifecycle" {
  bucket = aws_s3_bucket.recordings.id

  rule {
    id     = "auto-purge-old-recordings"
    status = "Enabled"

    transition {
      days          = 60
      storage_class = "GLACIER"
    }

    expiration {
      days = 90
    }
  }
}

# 2. VPC & Subnets
resource "aws_vpc" "telephony_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "telephony-production-vpc"
  }
}

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.telephony_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = true

  tags = { Name = "telephony-public-1a" }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.telephony_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "ap-south-1b"
  map_public_ip_on_launch = true

  tags = { Name = "telephony-public-1b" }
}

resource "aws_subnet" "private_db_1" {
  vpc_id            = aws_vpc.telephony_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "ap-south-1a"

  tags = { Name = "telephony-private-db-1a" }
}

resource "aws_subnet" "private_db_2" {
  vpc_id            = aws_vpc.telephony_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "ap-south-1b"

  tags = { Name = "telephony-private-db-1b" }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.telephony_vpc.id
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.telephony_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "pub_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public_rt.id
}

# 3. Security Groups
resource "aws_security_group" "web_sg" {
  name        = "telephony-web-sg"
  description = "Allow inbound HTTPS and HTTP"
  vpc_id      = aws_vpc.telephony_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db_sg" {
  name        = "telephony-db-sg"
  description = "Allow internal MySQL access only from EC2 Web SG"
  vpc_id      = aws_vpc.telephony_vpc.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. RDS MySQL Database
resource "aws_db_subnet_group" "db_subnets" {
  name       = "telephony-db-subnet-group"
  subnet_ids = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]
}

resource "aws_db_instance" "mysql_prod" {
  identifier             = "telephony-crm-mysql-prod"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t4g.medium"
  allocated_storage      = 50
  max_allocated_storage  = 200
  storage_type           = "gp3"
  db_name                = "calling_crm"
  username               = "crm_master_user"
  password               = "ReplaceWithStrongRandomPasswordViaSecretsManager!"
  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = false
  backup_retention_period = 14
  deletion_protection    = true
}

# 5. EC2 Instance for Docker Backend
resource "aws_instance" "app_server" {
  ami                    = "ami-0dee22c13ea7a9a67" # Ubuntu 24.04 LTS (ap-south-1)
  instance_class         = "t3.medium"
  subnet_id              = aws_subnet.public_1.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  root_block_device {
    volume_size = 40
    volume_type = "gp3"
  }

  tags = {
    Name = "telephony-crm-app-server"
  }
}

resource "aws_eip" "app_eip" {
  instance = aws_instance.app_server.id
}
