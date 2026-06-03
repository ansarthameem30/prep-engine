# Day 37 — AWS Core Services for Developers

## IAM: Identity and Access Management

IAM controls who can do what in your AWS account. Getting IAM right is foundational to security.

### Core Concepts

**Users:** Long-lived credentials for humans (or legacy systems). Avoid creating IAM users for applications — use roles instead.

**Groups:** Collections of users sharing the same policies. Manage permissions at the group level (e.g., `Developers` group), add users to groups.

**Roles:** Temporary credentials assumed by AWS services, EC2 instances, Lambda functions, or external identities. The correct way to grant AWS permissions to code running in AWS.

**Policies:** JSON documents defining allowed/denied actions.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": { "s3:prefix": "uploads/" }
    }
  }]
}
```

Policy structure: **Effect** (Allow/Deny), **Action** (which API calls), **Resource** (which AWS resources, by ARN), **Condition** (when this statement applies).

### Principle of Least Privilege

Grant only the permissions required for the job, nothing more. An EC2 instance running an API server needs: `s3:GetObject` on the specific bucket, `dynamodb:GetItem/PutItem` on the specific table. It does NOT need `s3:*` or `*:*`.

### IAM Roles for EC2/Lambda (Instance Profiles)

NEVER hardcode AWS credentials in application code:
```
# BAD — never do this
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

Instead: attach an IAM role to the EC2 instance (instance profile) or Lambda function. The AWS SDK automatically calls the instance metadata service (`http://169.254.169.254/latest/meta-data/iam/`) to get temporary credentials, which rotate automatically.

### OIDC Federation for GitHub Actions

Instead of storing long-lived AWS credentials as GitHub secrets, use OIDC (OpenID Connect) federation:
1. GitHub acts as an OIDC identity provider
2. Configure AWS IAM to trust GitHub's OIDC provider
3. Your workflow assumes an IAM role using a short-lived token
4. No AWS credentials stored anywhere — credentials are requested and expire per workflow run

This is the modern best practice for CI/CD → AWS access.

---

## EC2: Elastic Compute Cloud

### Instance Type Families

| Family | Optimized For | Examples | Use Case |
|---|---|---|---|
| t3/t4g | Burstable CPU | t3.medium (2 vCPU, 4GB) | Dev/test, low-traffic web |
| m5/m6i | General purpose | m5.xlarge (4 vCPU, 16GB) | Web apps, app servers |
| c5/c6i | CPU-intensive | c5.2xlarge (8 vCPU, 16GB) | Batch processing, encoding |
| r5/r6i | Memory-intensive | r5.large (2 vCPU, 16GB) | Databases, in-memory cache |
| p3/g4 | GPU | p3.2xlarge (8 vCPU, 1 GPU) | ML training, GPU rendering |

**Burstable (t-series):** Earn CPU credits when idle, spend credits during bursts. Great for irregular workloads. Check CPU credit balance in CloudWatch — if depleted, performance throttles.

### AMIs and Auto Scaling Groups

**AMI (Amazon Machine Image):** A snapshot of an instance (OS + installed software + configuration). Custom AMIs contain your application pre-installed — instances boot in seconds and are immediately ready. Golden AMI pattern: bake application + dependencies into AMI, no runtime installation during auto-scaling.

**Auto Scaling Group (ASG):** Manages a fleet of EC2 instances. Key configuration:
- **Launch template:** defines instance type, AMI, security groups, user data script
- **Min/max/desired:** bounds on instance count
- **Scaling policies:**
  - Target tracking: maintain CPU at 50% → add/remove instances automatically
  - Step scaling: add 2 instances if CPU > 70%, add 4 if CPU > 90%
  - Scheduled: scale up at 8 AM, scale down at midnight
- **Health checks:** replace unhealthy instances automatically

### Application Load Balancer (ALB)

Routes HTTP/HTTPS traffic to target groups.

- **Listener rules:** If path starts with `/api/v2` → forward to `api-v2-tg`. If host is `admin.example.com` → forward to `admin-tg`.
- **Target groups:** logical grouping of EC2 instances, ECS tasks, Lambda functions, or IP addresses
- **Health checks:** ALB pings `/health` every 30s, removes instances that fail 2 consecutive checks
- **Sticky sessions:** ALB inserts a cookie to route a user's requests to the same instance (use only when necessary — breaks auto-scaling benefits)

---

## S3: Object Storage

S3 stores objects (files) in buckets. Objects can be up to 5TB. Accessed via HTTP API.

### Access Control Layers

**Bucket policies (resource-based):** Attached to the bucket. Controls who can access from outside.
**IAM policies (identity-based):** Attached to users/roles. Controls what that principal can access.

For **same-account access:** Either bucket policy or IAM policy can allow. Cross-account: BOTH must allow.

### Presigned URLs

Generate a time-limited URL that allows access to a specific object without AWS credentials:

```javascript
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket, Key }), { expiresIn: 3600 });
```

**Upload directly from browser:** Generate presigned PUT URL on your backend, give it to the client. Client uploads directly to S3 — your server never handles the file bytes. Eliminates server bandwidth bottleneck for large uploads.

### S3 Lifecycle Rules

Automatically transition objects to cheaper storage tiers or delete them:
- After 30 days → `S3 Standard-IA` (Infrequent Access, 40% cheaper)
- After 90 days → `S3 Glacier Instant Retrieval` (80% cheaper, same retrieval speed)
- After 365 days → `S3 Glacier Deep Archive` (95% cheaper, 12-hour retrieval)
- Delete version markers older than 365 days

### Event Notifications

S3 can trigger Lambda, SQS, or SNS on object creation/deletion:
```
s3:ObjectCreated:* on uploads/* → Lambda for image thumbnail generation
s3:ObjectCreated:* on logs/* → SQS for async log processing
```

---

## CloudFront: Content Delivery Network

CloudFront has 450+ edge locations globally. Requests are served from the nearest edge, not your origin.

### Origins

- **S3 bucket:** Serve static websites, assets. Use Origin Access Control (OAC) to make the S3 bucket private — only CloudFront can access it.
- **ALB / EC2:** Serve dynamic content. CloudFront caches based on `Cache-Control` headers.
- **Custom HTTP:** Any public HTTP endpoint.

### Cache Behaviors

Configure caching per URL pattern:
- `/static/*` → cache for 365 days (content-addressed filenames like `app.v3.js`)
- `/api/*` → don't cache (or very short TTL with `no-store` / `Vary: Authorization`)
- `/images/*` → cache for 30 days

### Origin Access Control (OAC)

Prevents direct S3 access — forces all traffic through CloudFront (for rate limiting, WAF, logging):
1. Create CloudFront distribution with S3 origin
2. Set OAC on the distribution
3. Bucket policy: only allow `cloudfront.amazonaws.com` service principal

### Lambda@Edge and CloudFront Functions

Run code at the CloudFront edge (near users, low latency):
- **CloudFront Functions:** <1ms execution, 10KB code limit. Use for: URL rewrites, simple header manipulation, A/B test routing by cookie.
- **Lambda@Edge:** Full Lambda, up to 30s execution, 1MB code. Use for: authentication checks, personalized response generation, dynamic image resizing.

---

## Route53: DNS Service

### Routing Policies

- **Simple:** One or more IPs, random selection. No health checks.
- **Weighted:** Send 90% to v1, 10% to v2 for canary deployment.
- **Latency:** Route to whichever region has lowest latency for the requesting IP.
- **Failover:** Primary → Secondary on health check failure. Disaster recovery.
- **Geolocation:** Route by user's country/continent. GDPR compliance (EU → EU servers).
- **Geoproximity:** Route based on geographic distance + configurable bias.
- **Multivalue Answer:** Return multiple IPs with health check filtering. Client picks one.

**Alias records vs CNAME:**
- CNAME: maps one hostname to another. Costs per query. Cannot be used at zone apex (`example.com`).
- Alias: AWS-specific, maps to AWS resources (ALB, CloudFront, S3). FREE for queries to AWS resources. Can be used at zone apex.

---

## VPC: Virtual Private Cloud

### Public vs Private Subnets

A subnet is **public** if its route table has a route `0.0.0.0/0 → Internet Gateway`. Instances in a public subnet with a public IP can communicate with the internet.

A subnet is **private** if it has no route to the Internet Gateway. Instances need a NAT Gateway to make outbound internet requests.

### NAT Gateway

Allows private subnet instances to initiate outbound internet connections (e.g., download packages, call external APIs) without being directly accessible from the internet. Deployed in a public subnet, private subnets route `0.0.0.0/0` through it.

### Security Groups vs NACLs

**Security Groups (SG):**
- Stateful: if you allow inbound on port 80, the return traffic is automatically allowed
- Instance-level (applied to ENI/NIC)
- Only allow rules (cannot explicitly deny)
- Reference other SGs: allow traffic from `sg-backend-app-sg` (no IP needed)
- The standard way to control traffic between tiers

**Network ACLs (NACL):**
- Stateless: must explicitly allow both inbound AND outbound for bidirectional traffic
- Subnet-level: applies to all instances in the subnet
- Both allow and deny rules, evaluated in numbered order (lowest number first)
- Use NACLs for: blocking a specific IP range at the subnet level, compliance requirements for explicit deny rules

**Best practice:** Use Security Groups for all inter-service traffic rules. Use NACLs only for subnet-wide rules like "block known malicious IP ranges" or "deny all traffic except from approved CIDR blocks."
