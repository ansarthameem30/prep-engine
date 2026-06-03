# Day 37 — Interview Prep: AWS Core Services

## Q1: Why should applications never use IAM users with access keys? What should they use instead?

**Answer:**
IAM user access keys are long-lived credentials with no automatic expiration. If they're leaked (committed to Git, logged in an error message, found in a build artifact), they remain valid until manually rotated. This has caused major security incidents at major companies.

**What to use instead:**

**For code running on AWS (EC2, Lambda, ECS, etc.):**
Use IAM roles with instance profiles. The application calls the instance metadata service (`http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name`) or IMDSv2, which provides temporary credentials that automatically rotate every hour. The AWS SDK does this automatically — zero code changes needed.

The IAM role is attached at launch time (EC2 instance profile, Lambda execution role, ECS task role). The code never sees the actual credentials.

**For CI/CD (GitHub Actions, GitLab CI):**
Use OIDC federation. GitHub acts as an OIDC identity provider. Configure an IAM identity provider in AWS for GitHub. The workflow uses `aws-actions/configure-aws-credentials` with a role ARN. GitHub provides a short-lived OIDC token; AWS validates it and vends temporary credentials for the workflow run only.

No long-lived secrets stored in GitHub at all. Each workflow run gets fresh, scoped credentials.

**For local development:**
Use `aws configure` to set up a named profile in `~/.aws/credentials`. Use IAM Identity Center (SSO) for managed short-lived credentials. Never commit credentials to code.

**Root account rule:** Never use root account credentials. Root has unlimited permissions and cannot be restricted. Create an admin IAM user immediately, enable MFA on root, then lock away root credentials.

---

## Q2: Explain the difference between security groups and NACLs. When would you use each?

**Answer:**

**Security Groups:**
- Stateful: when you allow inbound traffic on port 443, the return traffic is automatically allowed (no need to add an outbound rule for the response)
- Instance-level: applied to a specific EC2 instance's network interface (ENI)
- Only allow rules — you cannot write an explicit deny
- Can reference other security groups: allow traffic from `sg-app-servers` without knowing IP addresses
- Evaluated as a union of all rules (all rules are checked, and if ANY allows, the traffic is permitted)
- Default behavior: deny all inbound, allow all outbound

**NACLs (Network Access Control Lists):**
- Stateless: must explicitly allow BOTH inbound AND outbound for bidirectional traffic (return traffic on ephemeral ports 1024-65535 must be explicitly allowed outbound)
- Subnet-level: applies to ALL instances in the subnet (no per-instance control)
- Both allow and deny rules, evaluated in order (lowest number first, first match wins)
- Default VPC NACL: allow all in/out

**When to use each:**
- **Security Groups for everything:** The standard, recommended approach. More flexible (SG references), stateful (easier to configure), fine-grained (per instance), scalable.
- **NACLs as an additional layer:** When compliance requires subnet-level blocking of specific IP ranges, or when you need explicit deny (e.g., block a known malicious IP range that you don't want to reach any instance in the subnet, including those managed by other teams).
- **Both together for defense in depth:** Public subnet NACL blocks known-bad IP ranges. Security groups control inter-service traffic precisely.

---

## Q3: How do S3 bucket policies differ from IAM policies? When does both need to allow access?

**Answer:**
S3 has two types of access control:

**IAM policy (identity-based):** Attached to an IAM user, role, or group. Controls what that principal can do across AWS services, including S3. "This Lambda role can read from this bucket."

**Bucket policy (resource-based):** Attached to the S3 bucket itself. Controls who can access this bucket. "Allow the CloudFront OAC service principal to GetObject."

**When BOTH must allow:**
For **cross-account access**: if IAM user in Account A wants to access a bucket in Account B, Account B's bucket policy must allow Account A, AND Account A's IAM policy must allow the S3 action. If either is missing, access is denied.

**Single account access:**
Within the same account, either the IAM policy OR the bucket policy can grant access. If the IAM policy allows it, the bucket policy can be absent (default bucket policy allows same-account access). OR the bucket policy can allow access regardless of IAM policy.

Exception: if the bucket has `BlockPublicAccess` settings or an explicit Deny in the bucket policy, even a permissive IAM policy cannot override an explicit Deny.

**Common interview gotcha:** Public bucket access requires: bucket policy allows `*`, AND `BlockPublicAccess` settings are all turned off, AND no `Deny` from IAM SCP. All three conditions must be met.

---

## Q4: What is the difference between an EC2 Auto Scaling Group's scaling policies? When would you use each?

**Answer:**

**Target Tracking:**
- Specify a metric and target value; ASG automatically adds/removes instances to maintain the target
- Example: maintain average CPU at 50%. If CPU rises to 70%, ASG adds instances. If CPU drops to 30%, it removes them.
- Simplest to configure, AWS handles the math
- **Use for:** Most web applications where you want automatic scaling without manual tuning
- Common metrics: CPU utilization, ALB request count per target, SQS queue depth (custom metric)

**Step Scaling:**
- Define "steps" with different scaling actions at different thresholds
- Example: add 1 instance if CPU 60-70%, add 2 instances if CPU 70-80%, add 4 if CPU > 80%
- More fine-grained control over scaling behavior
- **Use for:** Workloads with predictable scaling patterns where you want aggressive scaling for severe load spikes

**Scheduled Scaling:**
- Pre-set capacity changes at specific times
- Example: increase minimum to 10 at 8 AM weekdays, decrease to 2 at 8 PM
- **Use for:** Predictable traffic patterns (business hours, end-of-month batch processing, known events like product launches)

**Predictive Scaling:**
- ML-based, analyzes historical load patterns and pre-scales before expected traffic increases
- Helps avoid the lag between traffic increase and new instances being ready
- **Use for:** Recurring load patterns where reactive scaling isn't fast enough (instances take 2-5 minutes to be ready)

---

## Q5: How does CloudFront caching interact with your application? What headers control behavior?

**Answer:**
CloudFront sits between users and your origin. On the first request for a resource, CloudFront fetches from origin and caches based on response headers. Subsequent requests for the same resource are served from the edge without hitting your origin.

**Key response headers that control CloudFront behavior:**

`Cache-Control: max-age=86400` — cache for 1 day
`Cache-Control: s-maxage=3600` — CloudFront specifically caches for 1 hour (overrides max-age for shared caches)
`Cache-Control: no-store` — don't cache at all (sensitive content)
`Cache-Control: private` — only browser caches, CloudFront must not cache
`Vary: Accept-Encoding` — different cached version per encoding (gzip vs br)

**CloudFront cache key:** By default, the cache key includes URL path + any query strings/headers you configure. Requests with different query strings are cached separately. Be careful: accidentally including session tokens or random values in the cache key defeats caching.

**Cache invalidation:**
```bash
aws cloudfront create-invalidation --distribution-id E1234 --paths "/index.html" "/app.*.js"
```
Costs $0.005 per invalidation path after the first 1,000/month. Use versioned filenames for static assets (`app.v5.js`) — when the file changes, the filename changes, so old cached versions naturally expire and the new version gets its own cache slot. Reserve invalidations for emergencies (accidental bad deploy).

**Dynamic content caching:** Configure CloudFront behaviors to bypass caching for `/api/*`:
```
Path: /api/*
TTL: 0 (no caching)
Forward: all headers + cookies
```

---

## Q6: Walk me through setting up a private web application in a VPC with proper network segmentation.

**Answer:**
A properly segmented VPC has three tiers:

**Public subnets (DMZ):**
- Contains: Application Load Balancer, NAT Gateway, Bastion host (if needed)
- Route table: `0.0.0.0/0 → Internet Gateway`
- Security groups: ALB accepts 80/443 from `0.0.0.0/0`

**Private subnets (App tier):**
- Contains: EC2 app servers, ECS tasks, Lambda (within VPC)
- Route table: `0.0.0.0/0 → NAT Gateway` (for outbound internet, e.g., calling external APIs)
- Security groups: accept 443/3000 from ALB security group only (not from internet)
- App servers have no public IP addresses

**Private subnets (Data tier):**
- Contains: RDS, ElastiCache, Elasticsearch
- Route table: NO route to internet
- Security groups: accept DB port (5432/3306/6379) from app tier security group only
- RDS instances have no public IPs

**Multi-AZ deployment:**
- Each tier has subnets in at least 2 AZs (e.g., us-east-1a and us-east-1b)
- ALB is multi-AZ by default
- ASG spreads instances across AZs
- RDS Multi-AZ: primary in 1a, standby in 1b

**Connectivity to AWS services without internet:**
Use VPC Endpoints:
- Interface endpoint (PrivateLink): for S3, DynamoDB, SSM, Secrets Manager, ECR — private connectivity, no internet, no NAT needed
- This means your app server can read from S3 without the traffic going through the NAT gateway (saves cost + improves security)

---

## Q7: What is the difference between Route53 Alias records and CNAMEs? When would you use each?

**Answer:**

**CNAME:**
- Maps one hostname to another hostname: `www.example.com → example-alb-123.us-east-1.elb.amazonaws.com`
- Standard DNS record type, works with any DNS provider
- Costs: Route53 charges per DNS query for CNAME records to AWS resources
- Limitation: Cannot be used at the zone apex (`example.com`). DNS spec doesn't allow CNAME at zone apex because zone apex must have SOA and NS records (CNAME would conflict).

**Alias:**
- AWS-specific DNS extension: maps a hostname to an AWS resource ARN/DNS name
- Routes traffic based on the resource's current IP(s) — if ALB IPs change, Route53 automatically follows
- FREE for queries to AWS resources (no per-query charge)
- Can be used at zone apex (`example.com → ALB`) — the primary use case
- Supported targets: ALB, NLB, CloudFront, API Gateway, S3 static website, Elastic Beanstalk, VPC endpoints, and other Route53 record sets

**Decision rule:** 
- Mapping `example.com` (zone apex) to an AWS resource: must use Alias
- Mapping any hostname to an AWS resource: prefer Alias (free, auto-follows IP changes)
- Mapping to a non-AWS resource: must use CNAME

**Health check integration:** Route53 Alias records support health checks. If the target health check fails, Route53 stops returning the record for DNS queries (automatic DNS failover).

---

## Q8: How do presigned S3 URLs work and when would you use them over direct file serving through your API?

**Answer:**
A presigned URL is a time-limited, pre-signed S3 URL that grants access to a specific S3 object without requiring the requester to have AWS credentials. The URL embeds authentication information (HMAC signature over object key + expiry + IAM identity) directly in the URL parameters.

**How it's generated:**
```javascript
const command = new GetObjectCommand({ Bucket: "my-bucket", Key: "uploads/user123/photo.jpg" });
const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
// URL: https://my-bucket.s3.amazonaws.com/uploads/...?X-Amz-Signature=abc&X-Amz-Expires=3600
```

**When to use presigned URLs over serving through your API:**

**Use presigned URLs for:**
- File downloads from private S3 buckets: generate URL server-side, send to client. Client downloads directly from S3. Your server never handles the file bytes → saves bandwidth + compute cost.
- Large file uploads from browsers: generate presigned PUT URL. Client uploads directly to S3 at full internet speed. No 30MB/s API server bottleneck.
- Temporary access to private content (images, PDFs, videos): expire in 1-24 hours.
- Cross-service file sharing (email a link to a report).

**Serve through your API when:**
- You need to enforce access control based on business logic (check if user's subscription is active before allowing download)
- You need to log/audit every download with business context (not just S3 access logs)
- You need to transform the content (watermark images, decrypt, add headers) before serving
- File is tiny (< 1KB) and the overhead of a presigned URL generation plus redirect isn't worth it

**Security note:** Presigned URLs are only as secure as the transport. Always use HTTPS. URLs can be shared by the recipient (forward the URL to someone else). For highly sensitive documents, use presigned URLs with short expiry (5-15 minutes) and add an access log check.
