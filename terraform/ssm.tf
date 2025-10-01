locals {
  parameter_prefix = "/n11817143/app"
}

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name  = "${local.parameter_prefix}/cognitoUserPoolId"
  type  = "String"
  value = aws_cognito_user_pool.app.id
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "${local.parameter_prefix}/cognitoClientId"
  type  = "String"
  value = aws_cognito_user_pool_client.webapp.id
}

resource "aws_ssm_parameter" "s3_bucket" {
  name  = "${local.parameter_prefix}/s3Bucket"
  type  = "String"
  value = aws_s3_bucket.video_bucket.id
}

resource "aws_ssm_parameter" "dynamo_table" {
  name  = "${local.parameter_prefix}/dynamoTable"
  type  = "String"
  value = aws_dynamodb_table.video_metadata.name
}

resource "aws_ssm_parameter" "elasticache_endpoint" {
  name  = "${local.parameter_prefix}/elasticacheEndpoint"
  type  = "String"
  value = aws_elasticache_cluster.cache.configuration_endpoint
}
