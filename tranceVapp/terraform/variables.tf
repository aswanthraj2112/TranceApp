variable "vpc_id" {
  description = "ID of the VPC where resources will be created"
  type        = string
}

variable "cache_subnet_ids" {
  description = "List of subnet IDs for the ElastiCache subnet group"
  type        = list(string)
}

variable "ec2_security_group_id" {
  description = "Security group ID of the EC2 instance running the application"
  type        = string
}
