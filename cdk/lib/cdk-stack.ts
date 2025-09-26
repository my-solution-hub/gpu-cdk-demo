import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { Construct } from 'constructs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC with 2 public, 2 private subnets, 1 NAT Gateway
    const vpc = new ec2.Vpc(this, 'DipathVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Security Groups
    const webSg = new ec2.SecurityGroup(this, 'WebServerSG', {
      vpc,
      allowAllOutbound: true,
    });
    webSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');

    const albSg = new ec2.SecurityGroup(this, 'AlbSG', {
      vpc,
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');

    const dbSg = new ec2.SecurityGroup(this, 'DatabaseSG', {
      vpc,
      allowAllOutbound: false,
    });
    dbSg.addIngressRule(webSg, ec2.Port.tcp(3306), 'MySQL from web servers');

    const gpuSg = new ec2.SecurityGroup(this, 'GpuSG', {
      vpc,
      allowAllOutbound: true,
    });

    // IAM Role for SSM access
    const ssmRole = new iam.Role(this, 'SSMRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Web Server (m7i.2xlarge = 8 cores, 32GB RAM)
    const webServer = new ec2.Instance(this, 'WebServer', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M7I, ec2.InstanceSize.XLARGE2),
      machineImage: new ec2.LookupMachineImage({
        name: 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
        owners: ['099720109477'],
      }),
      securityGroup: webSg,
      role: ssmRole,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      blockDevices: [{
        deviceName: '/dev/sda1',
        volume: ec2.BlockDeviceVolume.ebs(150, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
        }),
      }],
      userData: ec2.UserData.custom(`#!/bin/bash
apt update -y
apt install -y nginx
systemctl start nginx
systemctl enable nginx`),
    });

    // GPU Instance (g5.xlarge = A10 GPU, 24GB GPU memory)
    const gpuInstance = new ec2.Instance(this, 'GpuInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.G5, ec2.InstanceSize.XLARGE),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: gpuSg,
      role: ssmRole,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: ec2.BlockDeviceVolume.ebs(100, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
        }),
      }],
    });

    // RDS MySQL (db.m7i.2xlarge = 8 cores, 32GB RAM, 100GB storage)
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M7I, ec2.InstanceSize.XLARGE2),
      vpc,
      securityGroups: [dbSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      allocatedStorage: 100,
      storageType: rds.StorageType.GP3,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    const listener = alb.addListener('Listener', {
      port: 80,
    });

    listener.addTargets('WebServerTarget', {
      port: 80,
      targets: [new elbv2_targets.InstanceTarget(webServer)],
      healthCheck: {
        path: '/',
        port: '80',
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ALBDnsName', {
      value: alb.loadBalancerDnsName,
      description: 'ALB DNS Name',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS MySQL Endpoint',
    });
  }
}
