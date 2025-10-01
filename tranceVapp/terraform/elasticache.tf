resource "aws_elasticache_subnet_group" "video_cache" {
  name       = "n11817143-a2-subnet-group"
  subnet_ids = var.cache_subnet_ids

  tags = {
    Project = "TranceVapp"
  }
}

resource "aws_security_group" "elasticache" {
  name        = "n11817143-a2-cache-sg"
  description = "Security group for the video application cache"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow Memcached traffic from application EC2 security group"
    from_port       = 11211
    to_port         = 11211
    protocol        = "tcp"
    security_groups = [var.ec2_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Project = "TranceVapp"
  }
}

resource "aws_elasticache_cluster" "video_cache" {
  cluster_id           = "n11817143-a2-cache"
  engine               = "memcached"
  node_type            = "cache.t2.micro"
  num_cache_nodes      = 1
  port                 = 11211
  security_group_ids   = [aws_security_group.elasticache.id]
  subnet_group_name    = aws_elasticache_subnet_group.video_cache.name
  parameter_group_name = "default.memcached1.6"

  tags = {
    Project = "TranceVapp"
  }
}
