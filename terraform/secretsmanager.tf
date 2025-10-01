resource "aws_secretsmanager_secret" "app" {
  name = "n11817143-a2-secret"

  tags = {
    Project = "Cloud Video Transcoder"
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id     = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    COGNITO_CLIENT_SECRET = aws_cognito_user_pool_client.webapp.client_secret
  })
}
