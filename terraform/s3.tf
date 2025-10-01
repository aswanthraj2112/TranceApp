resource "aws_s3_bucket" "video_bucket" {
  bucket = "n11817143-a2"
  acl    = "private"

  tags = {
    Project = "Cloud Video Transcoder"
  }
}
