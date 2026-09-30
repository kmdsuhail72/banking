# Kubernetes & Infrastructure — Deployment Guide

## Architecture

```
Internet → Traefik IngressRoute (TLS, path-based)
              │
              ├── /api/v1/auth         → auth-service:4001
              ├── /api/v1/customers    → customer-service:4002
              ├── /api/v1/accounts     → account-service:4003
              ├── /api/v1/transactions → transaction-service:4004
              ├── /api/v1/payments     → payment-service:4005
              ├── /api/v1/wallets      → wallet-service:4006
              ├── /api/v1/ledger       → ledger-service:4007
              ├── /api/v1/beneficiaries→ beneficiary-service:4008
              ├── /api/v1/kyc          → kyc-risk-service:4009
              ├── /api/v1/notifications→ notification-service:4010
              ├── /api/v1/reports      → reporting-service:4011
              └── /                   → frontend:80
```

## Prerequisites

```bash
# Install tools
brew install terraform helm kubectl awscli
# Or on Windows:
winget install Hashicorp.Terraform Helm kubectl Amazon.AWSCLI
```

## Step 1 — Bootstrap Terraform State

Create the S3 bucket and DynamoDB table for Terraform state **before** running Terraform for the first time:

```bash
aws s3api create-bucket \
  --bucket banking-eks-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket banking-eks-terraform-state \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name banking-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Step 2 — Update TODO Placeholders

Edit these files and replace the `TODO` values:

| File | Variable | Replace With |
|---|---|---|
| `terraform/environments/production/main.tf` | `aws_account_id` | Your real 12-digit AWS account ID |
| `terraform/environments/production/main.tf` | backend `bucket` | `banking-eks-terraform-state` (created above) |
| `helm/banking-app/values-production.yaml` | `global.registry` | Output of `terraform output ecr_registry` |
| `helm/banking-app/values-production.yaml` | `ingress.host` | Your real domain (e.g. `banking.acme.com`) |
| `.github/workflows/ci.yml` | `AWS_ACCOUNT_ID` | Your real 12-digit AWS account ID |

## Step 3 — Provision AWS Infrastructure

```bash
cd terraform/environments/production
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

This creates (~10 minutes):
- VPC with 3 AZ public + private subnets
- NAT Gateways (HA, one per AZ)
- EKS 1.32 cluster with managed node group (m5.xlarge, 3 nodes)
- OIDC provider for IRSA
- EKS add-ons: vpc-cni, coredns, kube-proxy, ebs-csi-driver
- 13 ECR repositories (one per service)
- S3 bucket for Loki logs
- IAM roles: EBS CSI IRSA, GitHub Actions OIDC, Loki S3 IRSA

## Step 4 — Configure kubectl

```bash
# Output from terraform:
terraform output kubeconfig_command
# Then run it, e.g.:
aws eks update-kubeconfig --region us-east-1 --name banking-eks-production
kubectl get nodes    # should show 3 nodes
```

## Step 5 — Install Traefik (once, in-cluster)

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set ports.web.redirectTo.port=websecure \
  --set certificatesResolvers.letsencrypt.acme.email=you@example.com \
  --set certificatesResolvers.letsencrypt.acme.storage=/data/acme.json \
  --set certificatesResolvers.letsencrypt.acme.tlsChallenge=true
```

## Step 6 — Deploy the Banking Platform

```bash
# Update values-production.yaml with real registry URL and domain first!
helm upgrade --install banking ./helm/banking-app \
  -f helm/banking-app/values.yaml \
  -f helm/banking-app/values-production.yaml \
  --namespace banking \
  --create-namespace \
  --atomic \
  --timeout 10m
```

This deploys **~35 pods** in one command:
- 12 service Deployments (2 replicas each) = 24 pods
- 1 MongoDB + 1 Redis + 1 Kafka StatefulSet = 3 pods
- 1 frontend Deployment = 2 pods
- 12 HPAs (CPU + memory dual-metric)
- 12 PodDisruptionBudgets
- Traefik IngressRoute with TLS
- gp3 StorageClass (set as default)

## Step 7 — Verify

```bash
# All pods running
kubectl get pods -n banking

# HPAs have metrics (requires metrics-server or EKS metrics)
kubectl get hpa -n banking

# Ingress routes configured
kubectl get ingressroute -n banking

# Test endpoints (replace with real domain)
curl https://banking.example.com/health
curl https://banking.example.com/api/v1/auth/health
```

## CI/CD Flow (after Terraform + initial deploy)

```
git push main
  └─→ GitHub Actions: quality + test + build + helm-lint
      └─→ publish-ecr (matrix: 13 services in parallel)
          └─→ ECR: banking/<service>:sha-<commit>
              └─→ GitOps PR: update image tag in values-production.yaml
                  └─→ Merge PR → ArgoCD syncs → helm upgrade
```

## File Map

| Layer | Files |
|---|---|
| **Terraform** | [`terraform/`](terraform/) — VPC, EKS, ECR, S3, IAM modules |
| **Helm Chart** | [`helm/banking-app/`](helm/banking-app/) — 63 K8s objects |
| **Values** | [`values.yaml`](helm/banking-app/values.yaml) · [`values-production.yaml`](helm/banking-app/values-production.yaml) · [`values-staging.yaml`](helm/banking-app/values-staging.yaml) |
| **CI/CD** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint + build + ECR push |
| **GitOps** | [`gitops/environments/`](gitops/environments/) — ArgoCD Helm-based promotion |
