#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

const app = new cdk.App();
const region = process.env.CDK_DEFAULT_REGION || 'ap-south-1';
const stackName = process.env.STACK_NAME || `dipath-dev-${region}`;

new CdkStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: region,
  },
});