resource "aws_secretsmanager_secret" "cognito_client_secret" {
  name = "n11817143-a2-secret"
}

resource "aws_secretsmanager_secret_version" "cognito_client_secret" {
  secret_id     = aws_secretsmanager_secret.cognito_client_secret.id
  secret_string = jsonencode({
    COGNITO_CLIENT_SECRET = aws_cognito_user_pool_client.webapp.client_secret
  })
}
