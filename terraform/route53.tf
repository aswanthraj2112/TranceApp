variable "zone_id" {
  description = "Hosted zone ID for cab432.com"
  type        = string
}

variable "ec2_public_dns" {
  description = "Public DNS of the EC2 instance hosting the app"
  type        = string
}

resource "aws_route53_record" "videoapp" {
  zone_id = var.zone_id
  name    = "n11817143-videoapp.cab432.com"
  type    = "CNAME"
  ttl     = 300
  records = [var.ec2_public_dns]
}
