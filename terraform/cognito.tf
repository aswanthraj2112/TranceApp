resource "aws_cognito_user_pool" "app" {
  name              = "n11817143-a2"
  mfa_configuration = "ON"

  alias_attributes = ["preferred_username", "email"]

  auto_verified_attributes = ["email"]

  software_token_mfa_configuration {
    enabled = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  schema {
    name                     = "email"
    required                 = true
    mutable                  = true
    attribute_data_type      = "String"
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 5
      max_length = 2048
    }
  }

  tags = {
    Project = "Cloud Video Transcoder"
  }
}

resource "aws_cognito_user_pool_client" "webapp" {
  name                          = "webapp-client"
  user_pool_id                  = aws_cognito_user_pool.app.id
  generate_secret               = true
  explicit_auth_flows           = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH"
  ]
  prevent_user_existence_errors = "ENABLED"
  supported_identity_providers  = ["COGNITO"]
  callback_urls                 = ["https://n11817143-videoapp.cab432.com/callback"]
  logout_urls                   = ["https://n11817143-videoapp.cab432.com/signout"]
}

resource "aws_cognito_user_group" "standard_users" {
  name         = "standard-users"
  user_pool_id = aws_cognito_user_pool.app.id
  description  = "Standard tier users"
}

resource "aws_cognito_user_group" "premium_users" {
  name         = "premium-users"
  user_pool_id = aws_cognito_user_pool.app.id
  description  = "Premium tier users"
}

resource "aws_cognito_user_group" "admin_users" {
  name         = "admin-users"
  user_pool_id = aws_cognito_user_pool.app.id
  description  = "Administrators"
}
