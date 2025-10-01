resource "aws_dynamodb_table" "video_metadata" {
  name         = "n11817143-VideoApp"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "qut-username"
  range_key    = "id"

  attribute {
    name = "qut-username"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "videoId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "filename"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "OwnerIndex"
    hash_key        = "videoId"
    projection_type = "ALL"
  }

  tags = {
    Project = "TranceVapp"
  }
}
