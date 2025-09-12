#!/bin/bash
set -e

echo "Destroying Dipath infrastructure in India region..."

cd cdk
npx cdk destroy --region ap-south-1 --force
