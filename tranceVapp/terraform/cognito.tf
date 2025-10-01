resource "aws_cognito_user_pool" "video_app" {
  name                 = "n11817143-a2"
  mfa_configuration    = "ON"
  auto_verified_attributes = ["email"]

  schema {
    attribute_data_type      = "String"
    name                     = "email"
    required                 = true
    mutable                  = false
    developer_only_attribute = false
  }

  schema {
    attribute_data_type      = "String"
    name                     = "name"
    required                 = false
    mutable                  = true
    developer_only_attribute = false
  }

  tags = {
    Project = "TranceVapp"
  }
}

resource "aws_cognito_user_pool_client" "webapp" {
  name         = "webapp-client"
  user_pool_id = aws_cognito_user_pool.video_app.id

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  generate_secret = true
}

resource "aws_cognito_user_group" "standard" {
  name         = "standard-users"
  user_pool_id = aws_cognito_user_pool.video_app.id
}

resource "aws_cognito_user_group" "premium" {
  name         = "premium-users"
  user_pool_id = aws_cognito_user_pool.video_app.id
}
