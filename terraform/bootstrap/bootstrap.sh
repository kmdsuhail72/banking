#!/usr/bin/env bash
# =============================================================================
# Bootstrap — Run ONCE before terraform init
# Creates: S3 state bucket, DynamoDB lock table, GitHub Actions OIDC provider
# Usage:  bash terraform/bootstrap/bootstrap.sh production us-east-1 111122223333
# =============================================================================
set -euo pipefail

ENV="${1:-production}"
REGION="${2:-us-east-1}"
ACCOUNT_ID="${3:?AWS account ID required as 3rd argument}"

STATE_BUCKET="banking-eks-${ENV}-terraform-state"
LOCK_TABLE="banking-terraform-locks"

echo "==> [1/4] Creating Terraform state S3 bucket: ${STATE_BUCKET}"
aws s3api create-bucket \
  --bucket "${STATE_BUCKET}" \
  --region "${REGION}" \
  $([ "${REGION}" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=${REGION}") \
  2>/dev/null || echo "Bucket already exists — skipping"

aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "==> [2/4] Creating DynamoDB lock table: ${LOCK_TABLE}"
aws dynamodb create-table \
  --table-name "${LOCK_TABLE}" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${REGION}" \
  2>/dev/null || echo "Table already exists — skipping"

echo "==> [3/4] Creating GitHub Actions OIDC provider (idempotent)"
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
  2>/dev/null || echo "OIDC provider already exists — skipping"

echo "==> [4/4] Done. You can now run:"
echo "    cd terraform/environments/${ENV}"
echo "    terraform init"
echo "    terraform plan -out=tfplan"
echo "    terraform apply tfplan"
