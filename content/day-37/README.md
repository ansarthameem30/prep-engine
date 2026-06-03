# Day 37 – AWS Core Services: EC2, S3, CloudFront, Route53, VPC & IAM | DSA: Intervals

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | EC2, S3, CloudFront, Route53 routing policies, VPC networking, IAM least privilege |
| Hands-On | 00:40–01:10 | Create an S3 static website + CloudFront distribution + presigned URL generator in Node.js |
| DSA | 01:10–01:25 | Merge Intervals (#56) + Meeting Rooms II (#253) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain EC2 instance families and when to use each (compute, memory, storage optimized)
- [ ] Configure S3 bucket policies, presigned URLs, lifecycle rules, and cross-region replication
- [ ] Design a VPC with public/private subnets, NAT gateway, and security groups
- [ ] Solve: Merge Intervals (#56) using sort + greedy merge
- [ ] Review 5 AWS core services interview questions

---

## Concept: AWS Core Services for Developers

### What to Study
- **EC2:** Instance families: t-series (burstable, dev/staging), c-series (compute-optimized, CPU-bound workloads), m-series (general purpose, web servers), r-series (memory-optimized, Redis, MongoDB), i-series (storage-optimized, databases); AMIs (machine images for launch templates); Auto Scaling Groups (ASG) with launch templates, scaling policies (target tracking: "keep CPU at 50%", step scaling, scheduled); ALB (Application Load Balancer) as the frontend, registers/deregisters ASG instances automatically
- **S3:** Bucket policies (resource-based IAM — allow/deny by principal, action, condition); presigned URLs (`s3.getSignedUrl('getObject', { Bucket, Key, Expires })`) for temporary private access; lifecycle rules (transition to S3-IA after 30 days → Glacier after 90 days → delete after 365 days); versioning (keep all versions of every object); cross-region replication (CRR) requires versioning enabled, adds replication latency; storage classes: Standard, Intelligent-Tiering, Standard-IA, Glacier Instant, Glacier Flexible, Deep Archive
- **CloudFront:** Distribution with origins (S3, ALB, custom HTTP); behaviors map URL patterns to origins; cache policies control TTL and cache key (headers, query strings, cookies included/excluded); origin access control (OAC) restricts S3 to only CloudFront; cache invalidation (`aws cloudfront create-invalidation`) for immediate purge; Lambda@Edge for request/response manipulation at edge
- **Route53:** Routing policies: Simple (one value), Weighted (A/B testing, gradual migrations), Latency-based (route to lowest-latency region), Failover (primary/secondary with health checks), Geolocation (route by user's country/continent), Geoproximity (route by distance with bias adjustment); health checks integrate with failover routing
- **VPC:** Default VPC vs custom; public subnets (have route to Internet Gateway), private subnets (no direct internet access); NAT Gateway (allows private subnet instances to initiate outbound internet traffic — egress only); Security Groups (stateful — allow inbound rule automatically allows return traffic); NACLs (Network Access Control Lists — stateless, evaluates both inbound and outbound independently); VPC peering for cross-VPC communication
- **IAM:** Users, Groups, Roles (preferred for EC2/Lambda — no long-lived credentials); policies (JSON — Effect/Action/Resource/Condition); managed policies vs inline; least privilege principle — start with deny-all, add only what's needed; instance profiles attach roles to EC2; ABAC (attribute-based access control) with tags

### Key Mental Models
- VPC is your virtual data center in AWS — public subnets are DMZ, private subnets are internal servers, NAT Gateway is your outbound-only proxy, Security Groups are per-instance firewalls
- IAM roles > IAM users for compute workloads — roles rotate credentials automatically, never expire, and don't require secrets management
- S3 presigned URLs solve the "how does a client upload directly to S3 without exposing credentials?" problem — your server generates a time-limited URL that the client uses directly

### Why This Matters in Interviews
AWS knowledge is now a baseline expectation for senior full-stack developers. Interviewers ask practical questions: "How would you serve static assets for your React app?" (S3 + CloudFront), "How does your backend access S3 securely?" (IAM Role via instance profile), "How do you isolate your database from the internet?" (VPC private subnet). These are architectural decisions you'll make on day one at any AWS-heavy company.

---

## DSA Focus: Intervals – Merge Intervals & Meeting Rooms II

- **Problem:** Merge Intervals (LeetCode #56) + Meeting Rooms II (LeetCode #253)
- **Difficulty:** Medium
- **Pattern:** Sort + Greedy merge / Sort + Min-Heap
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Merge Intervals: sort by start time; if current start <= last merged end, extend; otherwise start new interval. Meeting Rooms II: sort by start time, use a min-heap of end times; if current start >= heap min end, reuse that room; else add a new room — heap size at the end is the answer

---

## Today's 5 Interview Questions (Flash Review)
1. How would you architect a zero-downtime deployment for an EC2-based Node.js API using Auto Scaling Groups?
2. What is the difference between a security group and a Network ACL in AWS VPC?
3. How do you give an EC2 instance permission to access an S3 bucket — and why should you NOT use IAM user credentials?
4. What is a CloudFront origin access control (OAC) and why is it better than making your S3 bucket public?
5. Explain Route53's latency-based routing — how does AWS determine which region has lower latency for a user?

---

## Files in This Folder
- `01-concept/` → Read: AWS VPC documentation, S3 bucket policies guide, IAM best practices, CloudFront developer guide
- `02-hands-on/` → Code: s3-presigned-url.js (Node.js AWS SDK v3 presigned URL generation), cloudfront-setup.md (distribution config walkthrough)
- `03-dsa/` → DSA: merge-intervals.js (sort + greedy), meeting-rooms-ii.js (sort + min-heap of end times)
- `04-interview-prep/` → Full Q&A: 5 AWS questions with architecture diagrams and IAM policy examples

---

## Success Criteria
- [ ] Can draw a 3-tier VPC architecture (ALB in public, EC2 in private, RDS in private) from memory
- [ ] Solved Merge Intervals in < 20 minutes with correct sort + merge logic
- [ ] Confident answering all 5 AWS interview questions
- [ ] Bonus: Write an IAM policy that allows an EC2 instance to read-only access a specific S3 bucket prefix
