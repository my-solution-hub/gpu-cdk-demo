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

## Stack Configuration

Stack name follows the pattern: `dipath-dev-{region}`

Environment variables:
- `STACK_NAME` - Override default stack name
- `CDK_DEFAULT_REGION` - Set deployment region (default: ap-south-1)

Examples:
```bash
# Deploy to default region with default name (dipath-dev-ap-south-1)
cdk deploy

# Deploy with custom stack name
STACK_NAME=my-custom-stack cdk deploy

# Deploy to different region
CDK_DEFAULT_REGION=us-east-1 cdk deploy  # Creates: dipath-dev-us-east-1
```

## Infrastructure Components

- **VPC**: 2 AZs, public/private subnets, 1 NAT Gateway
- **Web Server**: m7i.2xlarge, 150GB GP3 SSD, Ubuntu 22.04
- **GPU Instance**: g5.xlarge, 100GB GP3 SSD, Amazon Linux 2023
- **Database**: RDS MySQL 8.0, m7i.2xlarge, 100GB GP3
- **Load Balancer**: Application Load Balancer
- **SSM Access**: Both instances configured for Session Manager

## Connecting to Instances

Use AWS Systems Manager Session Manager:

```bash
# List available instances
aws ssm describe-instance-information

# Connect to web server
aws ssm start-session --target i-xxxxxxxxx

# Connect to GPU instance
aws ssm start-session --target i-yyyyyyyyy
```

## Structure

- `cdk/` - CDK infrastructure code
- `scripts/` - Deployment automation scripts
