#!/bin/bash
set -e

echo "Deploying Dipath infrastructure to India region..."

cd cdk
npm run build
npx cdk deploy --region ap-south-1 --require-approval never
