/**
 * Day 37 — AWS Core Services: Hands-on Exercises
 *
 * Note: These exercises use real AWS SDK v3 patterns.
 * To run, install: npm install @aws-sdk/client-s3 @aws-sdk/client-lambda
 *                              @aws-sdk/s3-request-presigner
 *                              @aws-sdk/client-ssm @aws-sdk/cloudfront-signer
 * AWS credentials should be provided via IAM role (EC2/Lambda) or
 * ~/.aws/credentials (local dev). NEVER hardcode credentials.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Upload File to S3 + Generate Presigned URL
// ─────────────────────────────────────────────────────────────────────────────

const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require("path");
const fs = require("fs");

const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = process.env.S3_BUCKET ?? "my-app-bucket";

/**
 * Upload a file to S3.
 * Key pattern: {prefix}/{userId}/{timestamp}_{filename}
 */
async function uploadFileToS3(filePath, userId, prefix = "uploads") {
  const filename = path.basename(filePath);
  const key = `${prefix}/${userId}/${Date.now()}_${filename}`;
  const fileContent = fs.readFileSync(filePath);
  const contentType = getContentType(filename);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
    Metadata: {
      "uploaded-by": userId,
      "original-name": filename,
    },
    // Server-side encryption
    ServerSideEncryption: "AES256",
  });

  await s3Client.send(command);
  console.log(`[S3] Uploaded: s3://${BUCKET_NAME}/${key}`);
  return key;
}

/**
 * Generate a presigned URL for time-limited direct download.
 * Ideal for: private file sharing, browser direct downloads.
 */
async function generatePresignedDownloadUrl(key, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${path.basename(key)}"`,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  console.log(`[S3] Presigned URL (valid ${expiresInSeconds}s): ${url.slice(0, 100)}...`);
  return url;
}

/**
 * Generate a presigned URL for direct browser → S3 upload.
 * The server generates the URL, client uploads directly — server never sees file bytes.
 * Max throughput, minimal server bandwidth.
 */
async function generatePresignedUploadUrl(filename, userId, expiresInSeconds = 300) {
  const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
  const key = `uploads/${userId}/${Date.now()}_${filename}`;

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: BUCKET_NAME,
    Key: key,
    Conditions: [
      ["content-length-range", 1, 10 * 1024 * 1024], // 1 byte to 10MB
      ["starts-with", "$Content-Type", "image/"],      // Only images
    ],
    Fields: {
      "Content-Type": "image/jpeg",
    },
    Expires: expiresInSeconds,
  });

  console.log(`[S3] Presigned upload URL generated for ${key}`);
  return { url, fields, key };
  // Client uses: POST url with fields as form data + file as 'file' field
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".pdf": "application/pdf",
    ".json": "application/json", ".txt": "text/plain",
  };
  return types[ext] ?? "application/octet-stream";
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Invoke Lambda Function
// ─────────────────────────────────────────────────────────────────────────────

const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const lambdaClient = new LambdaClient({ region: "us-east-1" });

async function invokeLambda(functionName, payload, invocationType = "RequestResponse") {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
    InvocationType: invocationType,
    // InvocationType options:
    // "RequestResponse" — synchronous, wait for result (default)
    // "Event"           — async, fire and forget, response = { StatusCode: 202 }
    // "DryRun"          — validate but don't execute
    LogType: invocationType === "RequestResponse" ? "Tail" : undefined,
  });

  const response = await lambdaClient.send(command);

  if (response.StatusCode >= 200 && response.StatusCode < 300) {
    const result = response.Payload ? JSON.parse(Buffer.from(response.Payload)) : null;

    // Check for Lambda function errors (vs SDK errors)
    if (response.FunctionError) {
      throw new Error(`Lambda error: ${response.FunctionError}: ${JSON.stringify(result)}`);
    }

    // Decode logs if available
    if (response.LogResult) {
      const logs = Buffer.from(response.LogResult, "base64").toString("utf-8");
      console.log("[Lambda] Tail logs:", logs.slice(-500));
    }

    console.log(`[Lambda] Invoked ${functionName} → StatusCode: ${response.StatusCode}`);
    return result;
  }

  throw new Error(`Lambda invocation failed with status: ${response.StatusCode}`);
}

// Example: Invoke image processing Lambda asynchronously
async function triggerImageProcessing(s3Key, userId) {
  return invokeLambda(
    "image-processor-lambda",
    { s3Key, userId, operations: ["thumbnail", "resize-800w"] },
    "Event" // Async — don't wait for processing to complete
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: IAM Policy Document — Least Privilege for Backend Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a minimal IAM policy for a backend API service that:
 *   - Reads from a specific S3 bucket prefix (user uploads)
 *   - Reads/writes specific DynamoDB table
 *   - Cannot access any other AWS resources
 */
function generateBackendServicePolicy(bucketName, dynamoTableArn, region = "us-east-1", accountId = "123456789012") {
  return {
    Version: "2012-10-17",
    Statement: [
      // S3: Read-only access to specific prefix
      {
        Sid: "S3ReadUploads",
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:HeadObject"],
        Resource: `arn:aws:s3:::${bucketName}/uploads/*`,
      },
      // S3: Write to specific prefix only
      {
        Sid: "S3WriteUploads",
        Effect: "Allow",
        Action: ["s3:PutObject", "s3:DeleteObject"],
        Resource: `arn:aws:s3:::${bucketName}/uploads/*`,
      },
      // S3: List bucket for validation (scoped to prefix)
      {
        Sid: "S3ListBucket",
        Effect: "Allow",
        Action: "s3:ListBucket",
        Resource: `arn:aws:s3:::${bucketName}`,
        Condition: {
          StringLike: { "s3:prefix": "uploads/*" },
        },
      },
      // DynamoDB: CRUD on specific table only
      {
        Sid: "DynamoDBCRUD",
        Effect: "Allow",
        Action: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",       // Include only if needed — scan is expensive
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
        ],
        Resource: [
          dynamoTableArn,
          `${dynamoTableArn}/index/*`, // Allow accessing GSIs
        ],
      },
      // CloudWatch Logs: Write application logs
      {
        Sid: "CloudWatchLogs",
        Effect: "Allow",
        Action: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        Resource: `arn:aws:logs:${region}:${accountId}:log-group:/app/*`,
      },
    ],
  };
}

const policy = generateBackendServicePolicy(
  "my-app-bucket",
  "arn:aws:dynamodb:us-east-1:123456789012:table/Users"
);
console.log("=== Least Privilege IAM Policy ===");
console.log(JSON.stringify(policy, null, 2));


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: CloudFront Signed URL for Private S3 Content
// ─────────────────────────────────────────────────────────────────────────────

const { getSignedUrl: getCFSignedUrl } = require("@aws-sdk/cloudfront-signer");

/**
 * Generate a CloudFront signed URL for accessing private S3 content.
 * Requires: CloudFront key pair (private key + key pair ID)
 *
 * This is different from S3 presigned URLs:
 *   - S3 presigned: signed with IAM credentials, bypasses CloudFront, direct S3 access
 *   - CloudFront signed: signed with CloudFront key pair, goes through CDN edge caching
 *
 * Use CloudFront signed URLs when:
 *   - You want CDN edge caching benefits (performance + reduced origin load)
 *   - Content is large (video streaming, large files)
 *   - Need geographic restrictions or IP-based signing policies
 */
function generateCloudFrontSignedUrl(
  distributionDomain,
  objectKey,
  privateKey, // PEM format CloudFront private key
  keyPairId,
  expiresInSeconds = 3600
) {
  const url = `https://${distributionDomain}/${objectKey}`;
  const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const signedUrl = getCFSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan,
  });

  console.log(`[CloudFront] Signed URL for ${objectKey} (expires ${dateLessThan}): ${signedUrl.slice(0, 100)}...`);
  return signedUrl;
}

/**
 * CloudFront Signed Cookie (better for streaming/multi-file access):
 * Instead of signing each URL, set a signed cookie that grants access to
 * all files matching a wildcard pattern (e.g., /videos/user-1001/*)
 */
function generateCloudFrontSignedCookies(
  distributionDomain,
  resourcePattern,    // e.g., "https://cdn.example.com/videos/user-1001/*"
  privateKey,
  keyPairId,
  expiresInSeconds = 3600
) {
  const { getSignedCookies } = require("@aws-sdk/cloudfront-signer");
  const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const cookies = getSignedCookies({
    url: resourcePattern,
    keyPairId,
    privateKey,
    dateLessThan,
  });

  // Set these cookies on the response:
  // Set-Cookie: CloudFront-Policy=...; HttpOnly; Secure; Domain=cdn.example.com
  // Set-Cookie: CloudFront-Signature=...; HttpOnly; Secure; Domain=cdn.example.com
  // Set-Cookie: CloudFront-Key-Pair-Id=...; HttpOnly; Secure; Domain=cdn.example.com
  console.log("[CloudFront] Signed cookies generated for:", resourcePattern);
  return cookies;
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: AWS Systems Manager Parameter Store — Read Secrets
// ─────────────────────────────────────────────────────────────────────────────

const { SSMClient, GetParameterCommand, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");

const ssmClient = new SSMClient({ region: "us-east-1" });

/**
 * Read a single parameter from SSM Parameter Store.
 * SecureString parameters are encrypted with KMS.
 */
async function getParameter(name, withDecryption = true) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });

  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}

/**
 * Read all parameters under a path prefix.
 * Convention: /app-name/environment/parameter-name
 * Example: /myapp/production/db-password
 */
async function getParametersByPath(path, withDecryption = true) {
  const params = new Map();
  let nextToken = undefined;

  do {
    const command = new GetParametersByPathCommand({
      Path: path,
      WithDecryption: withDecryption,
      Recursive: true,
      NextToken: nextToken,
    });

    const response = await ssmClient.send(command);
    for (const param of response.Parameters) {
      const shortName = param.Name.replace(path + "/", "");
      params.set(shortName, param.Value);
    }
    nextToken = response.NextToken;
  } while (nextToken);

  return params;
}

/**
 * Config loader: load all app config from SSM at startup.
 * Caches values in memory (avoids repeated SSM API calls per request).
 *
 * Best practice: load at startup, restart pod/instance to pick up changes.
 * For hot-reloading: poll SSM every 5 minutes and update in-memory config.
 */
class AppConfigLoader {
  constructor(basePath) {
    this.basePath = basePath;
    this.config = new Map();
    this.loaded = false;
  }

  async load() {
    console.log(`[Config] Loading configuration from SSM: ${this.basePath}`);
    // In a real app, this would call getParametersByPath
    // Simulated for demo:
    this.config = new Map([
      ["DB_HOST", "myapp-db.cluster-xyz.us-east-1.rds.amazonaws.com"],
      ["DB_PASSWORD", "super-secret-password-from-kms"],
      ["REDIS_URL", "redis://myapp-redis.cache.amazonaws.com:6379"],
      ["STRIPE_SECRET_KEY", "sk_live_abc123..."],
      ["JWT_SECRET", "eyJhbGciOiJIUzI1NiJ9..."],
    ]);
    this.loaded = true;
    console.log(`[Config] Loaded ${this.config.size} parameters`);
  }

  get(key) {
    if (!this.loaded) throw new Error("Config not loaded. Call load() first.");
    return this.config.get(key);
  }
}

// Usage pattern in Express app:
// const config = new AppConfigLoader('/myapp/production');
// await config.load(); // Call once at app startup, before starting HTTP server
// app.listen(3000);
// Later: const dbPassword = config.get('DB_PASSWORD');

console.log("\n=== SSM Parameter Store Config Pattern ===");
const config = new AppConfigLoader("/myapp/production");
config.load().then(() => {
  // config.get('DB_HOST') would return the actual value in production
  console.log("Config loaded. DB_HOST:", "[would be loaded from SSM in production]");
  console.log("Config pattern: no env vars, no .env files, no hardcoded secrets");
});

/*
 * SSM Parameter Store vs AWS Secrets Manager:
 *
 * Parameter Store:
 *   - Free for standard parameters (up to 10,000 per account)
 *   - $0.05/month for advanced parameters
 *   - Good for: config values, feature flags, non-secret configuration
 *   - SecureString: encrypted with KMS (for secrets)
 *
 * Secrets Manager:
 *   - $0.40/month per secret + $0.05/10,000 API calls
 *   - Automatic secret rotation (native support for RDS, Redshift, DocumentDB)
 *   - Integration with RDS/Lambda for seamless rotation
 *   - Good for: database credentials, API keys that need rotation
 *   - Cross-account secret sharing
 *
 * Rule of thumb:
 *   - Database passwords that need rotation → Secrets Manager
 *   - App configuration, static secrets, feature flags → Parameter Store
 */
