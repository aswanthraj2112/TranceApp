data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "elasticache_access" {
  name        = "n11817143-a2-cache-sg"
  description = "Allow Memcached access from EC2"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 11211
    to_port     = 11211
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Project = "Cloud Video Transcoder"
  }
}

resource "aws_elasticache_subnet_group" "default" {
  name       = "n11817143-a2-cache-subnets"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_elasticache_cluster" "cache" {
  cluster_id           = "n11817143-a2-cache"
  engine               = "memcached"
  node_type            = "cache.t2.micro"
  num_cache_nodes      = 1
  port                 = 11211
  subnet_group_name    = aws_elasticache_subnet_group.default.name
  security_group_ids   = [aws_security_group.elasticache_access.id]

  tags = {
    Project = "Cloud Video Transcoder"
  }
}
