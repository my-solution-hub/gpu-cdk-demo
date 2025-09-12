# Dipath Infrastructure Deployment

Automated infrastructure deployment using AWS CDK for India region.

## Prerequisites

Bootstrap CDK in India region (one-time setup):

```bash
cdk bootstrap --region ap-south-1
```

## Quick Start

```bash
# Install dependencies
cd cdk && npm install

# Deploy infrastructure
./scripts/deploy.sh

# Destroy infrastructure
./scripts/destroy.sh
```

## Structure

- `cdk/` - CDK infrastructure code
- `scripts/` - Deployment automation scripts
