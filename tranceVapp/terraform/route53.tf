resource "aws_route53_record" "video_app" {
  zone_id = "Z02680423BHWEVRU2JZDQ"
  name    = "n11817143-trancevapp.cab432.com"
  type    = "CNAME"
  ttl     = 60
  records = ["ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com"]
}
