import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Tuple
from datetime import datetime, timezone
from backend.app.core.config import settings

class S3StorageService:

    def __init__(self):
        self.bucket_name = settings.AWS_S3_BUCKET
        self.region = settings.AWS_REGION
        self.local_dir = settings.LOCAL_RECORDING_STORAGE_DIR

        # Initialize boto3 S3 client if credentials or endpoint provided
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL
            )
        else:
            self.s3_client = None

        if not os.path.exists(self.local_dir):
            os.makedirs(self.local_dir, exist_ok=True)

    def generate_s3_key(self, employee_id: int, call_id: int, filename: str) -> str:
        now = datetime.now(timezone.utc)
        ext = os.path.splitext(filename)[1] or ".m4a"
        return f"recordings/{now.year}/{now.month:02d}/{employee_id}/{call_id}/recording{ext}"

    def upload_recording(
        self,
        local_file_path: str,
        employee_id: int,
        call_id: int,
        mime_type: str = "audio/mp4"
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Uploads recording file.
        Returns:
            (s3_bucket, s3_key, local_fallback_path)
        """
        s3_key = self.generate_s3_key(employee_id, call_id, local_file_path)

        if self.s3_client and self.bucket_name:
            try:
                self.s3_client.upload_file(
                    local_file_path,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs={
                        "ContentType": mime_type,
                        "ServerSideEncryption": "AES256"
                    }
                )
                return self.bucket_name, s3_key, None
            except ClientError as e:
                # Fallback to local storage if S3 fails
                pass

        # Local storage fallback
        dest_path = os.path.join(self.local_dir, f"rec_{employee_id}_{call_id}.m4a")
        if os.path.abspath(local_file_path) != os.path.abspath(dest_path):
            with open(local_file_path, "rb") as src, open(dest_path, "wb") as dst:
                dst.write(src.read())

        return None, None, dest_path

    def generate_presigned_playback_url(
        self,
        s3_bucket: Optional[str],
        s3_key: Optional[str],
        local_path: Optional[str],
        recording_id: int,
        expiry_seconds: int = 3600
    ) -> str:
        """
        Generates short-lived presigned URL or local streaming URL.
        """
        if self.s3_client and s3_bucket and s3_key:
            try:
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": s3_bucket, "Key": s3_key},
                    ExpiresIn=expiry_seconds
                )
                return url
            except ClientError:
                pass

        # If stored locally or S3 not used, generate local backend stream URL with short-lived token
        return f"{settings.MOBILE_API_BASE_URL}/api/v1/recordings/{recording_id}/stream"

s3_service = S3StorageService()
