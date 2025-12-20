# ACM with ALB Deployment Guide

## Prerequisites

1. **AWS Account** with permissions for EC2, VPC, ALB, ACM, and Route53
2. **Route53 Hosted Zone** for your domain
3. **SSH Key Pair** created in AWS EC2
4. **Domain Name** that you own (e.g., `chat.example.com`)

## Architecture

```
User (HTTPS:443) → ALB (SSL Termination) → EC2 Instance (HTTP:80) → Nginx Proxy → Services
```

- **ALB**: Handles SSL/TLS with ACM certificate, listens on port 443
- **EC2**: Runs Docker containers, accepts HTTP traffic from ALB only
- **Nginx Proxy**: Routes requests to appropriate services (frontend, backend, etc.)
- **ACM Certificate**: Free, auto-renewing SSL certificate managed by AWS

## Deployment Steps

### 1. Prepare Configuration

Copy the example variables file:
```bash
cd terraform-ec2
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
```hcl
aws_region      = "us-east-1"
key_name        = "your-ssh-key-name"
my_ip           = "YOUR.IP.ADDRESS/32"
domain_name     = "chat.example.com"
route53_zone_id = "Z1234567890ABC"
```

**To find your Route53 Zone ID:**
```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='example.com.'].Id" --output text
```

### 2. Update .env.production

Edit `.env.production` in the project root:
```bash
ENVIRONMENT=production
DOMAIN=chat.example.com  # Your actual domain
API_URL=https://chat.example.com/api
FRONTEND_URL=https://chat.example.com
JWT_SECRET=CHANGE_THIS_TO_STRONG_RANDOM_VALUE
```

**Generate a strong JWT secret:**
```bash
openssl rand -base64 32
```

### 3. Deploy Infrastructure

Initialize Terraform:
```bash
cd terraform-ec2
terraform init
```

Review the plan:
```bash
terraform plan
```

Apply the configuration:
```bash
terraform apply
```

Type `yes` when prompted.

### 4. Wait for Deployment

The deployment process takes approximately **10-15 minutes**:

1. **ACM Certificate Validation** (5-10 min): AWS validates domain ownership via DNS
2. **EC2 Instance Launch** (2-3 min): Instance boots and runs user_data script
3. **Docker Build** (3-5 min): Containers build and start
4. **DNS Propagation** (0-5 min): Route53 record propagates

**Monitor progress:**
```bash
# Check Terraform outputs
terraform output

# SSH into EC2 instance
ssh -i your-key.pem ec2-user@<EC2_PUBLIC_IP>

# Check deployment logs
sudo tail -f /var/log/cloud-init-output.log

# Check container status
docker compose ps
```

### 5. Verify Deployment

Once complete, access your application:
```
https://chat.example.com
```

**Expected behavior:**
- ✅ HTTPS with valid certificate (no browser warnings)
- ✅ HTTP automatically redirects to HTTPS
- ✅ Login with `admin@example.com` / `admin`

### 6. Post-Deployment

**Initialize Database** (if not done automatically):
```bash
ssh -i your-key.pem ec2-user@<EC2_PUBLIC_IP>
cd app
./init-dynamodb.sh
```

**Check service health:**
```bash
# Backend health check
curl https://chat.example.com/api/health

# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx-proxy
```

## Troubleshooting

### Certificate Validation Stuck

**Symptom**: Terraform hangs at "Creating aws_acm_certificate_validation"

**Solution**: Verify DNS records were created:
```bash
aws route53 list-resource-record-sets --hosted-zone-id <YOUR_ZONE_ID> | grep _acm
```

If missing, check that `route53_zone_id` is correct in `terraform.tfvars`.

### 502 Bad Gateway

**Symptom**: ALB returns 502 error

**Possible causes:**
1. **Containers not running**: SSH to EC2 and run `docker compose ps`
2. **Health check failing**: Check target group health in AWS Console
3. **Security group misconfigured**: Verify EC2 accepts traffic from ALB security group

**Debug:**
```bash
# Check ALB target health
aws elbv2 describe-target-health --target-group-arn <TG_ARN>

# Check nginx logs
docker compose logs nginx-proxy
```

### Cannot SSH to EC2

**Symptom**: Connection timeout when trying to SSH

**Solution**: Update `my_ip` in `terraform.tfvars` with your current IP:
```bash
curl ifconfig.me  # Get your current IP
```

Then run `terraform apply` again.

### Application Not Accessible

**Symptom**: Domain doesn't resolve or shows "site can't be reached"

**Checks:**
1. **DNS Propagation**: Wait 5-10 minutes, then check:
   ```bash
   nslookup chat.example.com
   ```
2. **Route53 Record**: Verify A record points to ALB:
   ```bash
   aws route53 list-resource-record-sets --hosted-zone-id <ZONE_ID> | grep -A 5 chat.example.com
   ```

## Updating the Application

To deploy code changes:

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@<EC2_PUBLIC_IP>
cd app

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose --env-file .env.production up -d --build

# Verify
docker compose ps
```

## Cleanup

To destroy all resources:

```bash
cd terraform-ec2
terraform destroy
```

Type `yes` when prompted.

**Note**: This will delete:
- EC2 instance
- ALB and target group
- Security groups
- Route53 record
- ACM certificate (if not in use elsewhere)

## Cost Estimate

**Monthly costs (us-east-1):**
- EC2 g6.xlarge: ~$400/month
- ALB: ~$20/month
- Data transfer: ~$10/month (varies)
- **Total**: ~$430/month

**To reduce costs:**
- Use smaller instance type (e.g., `t3.medium` for ~$30/month)
- Stop instance when not in use
- Use spot instances

## Security Best Practices

1. **Change JWT_SECRET** in `.env.production` before deploying
2. **Restrict SSH access** to your IP only (`my_ip` variable)
3. **Enable CloudWatch logs** for monitoring
4. **Regular updates**: Keep Docker images and system packages updated
5. **Backup DynamoDB**: Enable point-in-time recovery in AWS Console

## Next Steps

- Set up CloudWatch alarms for ALB and EC2
- Configure auto-scaling for high traffic
- Enable ALB access logs for auditing
- Set up CI/CD pipeline for automated deployments
