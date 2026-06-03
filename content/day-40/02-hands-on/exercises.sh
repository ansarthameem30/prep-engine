#!/usr/bin/env bash
# Day 40 — CI/CD + Docker: Deployment Scripts
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-123456789012}"
ECR_REPO="${ECR_REPO:-my-express-app}"
ALB_ARN="${ALB_ARN:-arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123}"
BLUE_TG_ARN="${BLUE_TG_ARN:-arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/blue-tg/abc}"
GREEN_TG_ARN="${GREEN_TG_ARN:-arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/green-tg/def}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "[ERROR] $*" >&2; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
# Exercise 3: GitHub Actions Equivalent — Build Docker Image + Push to ECR
# ─────────────────────────────────────────────────────────────────────────────

build_and_push_to_ecr() {
  local GIT_SHA
  GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  local IMAGE_TAG="${ECR_REGISTRY}/${ECR_REPO}:${GIT_SHA}"
  local LATEST_TAG="${ECR_REGISTRY}/${ECR_REPO}:latest"

  log "Building Docker image for SHA: ${GIT_SHA}"

  # Login to ECR
  aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${ECR_REGISTRY}"

  # Build with cache from registry
  docker buildx build \
    --platform linux/amd64 \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="${GIT_SHA}" \
    --build-arg VERSION="${GIT_SHA}" \
    --cache-from "type=registry,ref=${ECR_REGISTRY}/${ECR_REPO}:cache" \
    --cache-to "type=registry,ref=${ECR_REGISTRY}/${ECR_REPO}:cache,mode=max" \
    --tag "${IMAGE_TAG}" \
    --tag "${LATEST_TAG}" \
    --push \
    .

  log "Image pushed: ${IMAGE_TAG}"
  echo "${IMAGE_TAG}"
}


# ─────────────────────────────────────────────────────────────────────────────
# Exercise 4: Blue/Green Deployment — Switch ALB Target Group
# ─────────────────────────────────────────────────────────────────────────────

get_active_target_group() {
  # Returns "blue" or "green" based on which target group is currently primary
  local LISTENER_ARN
  LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "${ALB_ARN}" \
    --region "${AWS_REGION}" \
    --query "Listeners[?Port=='443'].ListenerArn" \
    --output text)

  local CURRENT_TG_ARN
  CURRENT_TG_ARN=$(aws elbv2 describe-rules \
    --listener-arn "${LISTENER_ARN}" \
    --region "${AWS_REGION}" \
    --query "Rules[?Priority=='default'].Actions[0].TargetGroupArn" \
    --output text)

  if [[ "${CURRENT_TG_ARN}" == "${BLUE_TG_ARN}" ]]; then
    echo "blue"
  else
    echo "green"
  fi
}

blue_green_deploy() {
  local NEW_IMAGE_TAG="$1"
  local ACTIVE
  ACTIVE=$(get_active_target_group)
  log "Current active environment: ${ACTIVE}"

  local INACTIVE
  local INACTIVE_TG_ARN
  if [[ "${ACTIVE}" == "blue" ]]; then
    INACTIVE="green"
    INACTIVE_TG_ARN="${GREEN_TG_ARN}"
  else
    INACTIVE="blue"
    INACTIVE_TG_ARN="${BLUE_TG_ARN}"
  fi

  log "Deploying to ${INACTIVE} environment with image: ${NEW_IMAGE_TAG}"

  # Step 1: Deploy new version to inactive environment (ECS service update)
  aws ecs update-service \
    --cluster "my-app-cluster-${INACTIVE}" \
    --service "my-app-service" \
    --force-new-deployment \
    --region "${AWS_REGION}" > /dev/null

  # Step 2: Wait for inactive environment to be healthy
  log "Waiting for ${INACTIVE} environment to stabilize..."
  aws ecs wait services-stable \
    --cluster "my-app-cluster-${INACTIVE}" \
    --services "my-app-service" \
    --region "${AWS_REGION}" || die "${INACTIVE} environment failed to stabilize"

  # Step 3: Run smoke tests against inactive environment (pre-switch)
  local INACTIVE_URL="https://${INACTIVE}.internal.example.com"
  log "Running smoke tests on ${INACTIVE_URL}..."
  if ! curl -sf "${INACTIVE_URL}/health" > /dev/null; then
    die "Smoke tests failed on ${INACTIVE} environment. Aborting switch."
  fi
  log "Smoke tests passed on ${INACTIVE} environment"

  # Step 4: Switch ALB traffic to inactive (now becomes active)
  log "Switching ALB traffic to ${INACTIVE} environment..."
  local LISTENER_ARN
  LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "${ALB_ARN}" \
    --region "${AWS_REGION}" \
    --query "Listeners[?Port=='443'].ListenerArn" \
    --output text)

  # Atomic traffic switch (< 1 second downtime)
  aws elbv2 modify-rule \
    --rule-arn "${LISTENER_ARN}" \
    --actions "[{\"Type\":\"forward\",\"TargetGroupArn\":\"${INACTIVE_TG_ARN}\"}]" \
    --region "${AWS_REGION}" > /dev/null

  log "Traffic switched to ${INACTIVE} environment successfully"
  log "Old active (${ACTIVE}) environment is now idle (keep for instant rollback)"
}

blue_green_rollback() {
  local ACTIVE
  ACTIVE=$(get_active_target_group)
  local ROLLBACK_TO
  if [[ "${ACTIVE}" == "blue" ]]; then ROLLBACK_TO="green"; else ROLLBACK_TO="blue"; fi

  log "ROLLING BACK from ${ACTIVE} to ${ROLLBACK_TO}"

  local ROLLBACK_TG_ARN
  if [[ "${ROLLBACK_TO}" == "blue" ]]; then
    ROLLBACK_TG_ARN="${BLUE_TG_ARN}"
  else
    ROLLBACK_TG_ARN="${GREEN_TG_ARN}"
  fi

  local LISTENER_ARN
  LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "${ALB_ARN}" \
    --region "${AWS_REGION}" \
    --query "Listeners[?Port=='443'].ListenerArn" \
    --output text)

  aws elbv2 modify-rule \
    --rule-arn "${LISTENER_ARN}" \
    --actions "[{\"Type\":\"forward\",\"TargetGroupArn\":\"${ROLLBACK_TG_ARN}\"}]" \
    --region "${AWS_REGION}" > /dev/null

  log "Rollback complete. Traffic now on ${ROLLBACK_TO} environment."
}


# ─────────────────────────────────────────────────────────────────────────────
# Exercise 5: Canary Deployment — ALB Weighted Target Groups
# ─────────────────────────────────────────────────────────────────────────────

canary_deploy() {
  local NEW_IMAGE_TAG="$1"
  local CANARY_PERCENT="${2:-5}"  # Default: 5% canary

  log "Starting canary deployment with ${CANARY_PERCENT}% traffic for: ${NEW_IMAGE_TAG}"

  local LISTENER_ARN
  LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "${ALB_ARN}" \
    --region "${AWS_REGION}" \
    --query "Listeners[?Port=='443'].ListenerArn" \
    --output text)

  # Step 1: Route ${CANARY_PERCENT}% to canary (green), rest to stable (blue)
  set_traffic_split "${LISTENER_ARN}" "$((100 - CANARY_PERCENT))" "${CANARY_PERCENT}"
  log "Canary at ${CANARY_PERCENT}%: Blue $(( 100 - CANARY_PERCENT ))%, Green ${CANARY_PERCENT}%"

  # Step 2: Monitor metrics for 5 minutes
  log "Monitoring canary for 300s..."
  local ERROR_RATE
  ERROR_RATE=$(get_canary_error_rate)
  if (( $(echo "${ERROR_RATE} > 1.0" | bc -l) )); then
    log "ERROR: Canary error rate ${ERROR_RATE}% exceeds threshold 1%. Rolling back."
    set_traffic_split "${LISTENER_ARN}" 100 0
    die "Canary rollback complete."
  fi
  log "Canary error rate: ${ERROR_RATE}% (acceptable). Proceeding."

  # Step 3: Progressive rollout 5% → 25% → 50% → 100%
  local STAGES=(25 50 100)
  for WEIGHT in "${STAGES[@]}"; do
    log "Increasing canary to ${WEIGHT}%..."
    set_traffic_split "${LISTENER_ARN}" "$((100 - WEIGHT))" "${WEIGHT}"
    sleep 60  # Observe each stage for 60s
    ERROR_RATE=$(get_canary_error_rate)
    if (( $(echo "${ERROR_RATE} > 1.0" | bc -l) )); then
      log "ERROR: Error rate ${ERROR_RATE}% at ${WEIGHT}% canary. Rolling back."
      set_traffic_split "${LISTENER_ARN}" 100 0
      die "Canary rollback at ${WEIGHT}%."
    fi
    log "Stage ${WEIGHT}%: Error rate ${ERROR_RATE}% — OK"
  done

  log "Canary deployment complete. 100% traffic on new version."
}

set_traffic_split() {
  local LISTENER_ARN="$1"
  local STABLE_WEIGHT="$2"
  local CANARY_WEIGHT="$3"

  aws elbv2 modify-rule \
    --rule-arn "${LISTENER_ARN}" \
    --actions "[
      {
        \"Type\": \"forward\",
        \"ForwardConfig\": {
          \"TargetGroups\": [
            {\"TargetGroupArn\": \"${BLUE_TG_ARN}\", \"Weight\": ${STABLE_WEIGHT}},
            {\"TargetGroupArn\": \"${GREEN_TG_ARN}\", \"Weight\": ${CANARY_WEIGHT}}
          ],
          \"StickinessDuration\": 0
        }
      }
    ]" \
    --region "${AWS_REGION}" > /dev/null

  log "Traffic split: Stable ${STABLE_WEIGHT}%, Canary ${CANARY_WEIGHT}%"
}

get_canary_error_rate() {
  # In production: query CloudWatch metrics for 5xx rate on the green target group
  # Simulated here:
  echo "0.3"
}


# ─────────────────────────────────────────────────────────────────────────────
# Main — Command dispatch
# ─────────────────────────────────────────────────────────────────────────────
case "${1:-help}" in
  build)
    log "=== Building and pushing Docker image ==="
    build_and_push_to_ecr
    ;;
  blue-green-deploy)
    [[ -z "${2:-}" ]] && die "Usage: $0 blue-green-deploy <image-tag>"
    log "=== Blue/Green Deployment ==="
    blue_green_deploy "$2"
    ;;
  rollback)
    log "=== Blue/Green Rollback ==="
    blue_green_rollback
    ;;
  canary)
    [[ -z "${2:-}" ]] && die "Usage: $0 canary <image-tag> [percent]"
    log "=== Canary Deployment ==="
    canary_deploy "$2" "${3:-5}"
    ;;
  help|*)
    echo "Usage: $0 {build|blue-green-deploy <tag>|rollback|canary <tag> [percent]}"
    echo ""
    echo "Commands:"
    echo "  build                           Build Docker image and push to ECR"
    echo "  blue-green-deploy <image-tag>   Deploy to inactive env, switch ALB"
    echo "  rollback                        Switch ALB back to previous version"
    echo "  canary <image-tag> [percent]    Progressive canary: 5%→25%→50%→100%"
    ;;
esac
