resource "aws_s3_bucket" "video_storage" {
  bucket = "n11817143-a2"

  tags = {
    Project = "TranceVapp"
  }
}

resource "aws_s3_bucket_acl" "video_storage_acl" {
  bucket = aws_s3_bucket.video_storage.id
  acl    = "private"
}

resource "aws_s3_bucket_public_access_block" "video_storage_block" {
  bucket                  = aws_s3_bucket.video_storage.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
