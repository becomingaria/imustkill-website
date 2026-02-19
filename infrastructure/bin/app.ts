#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import { ImkLiveSessionsStack } from "../lib/imk-stack"

const app = new cdk.App()

// Get environment from context or use defaults
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
}

new ImkLiveSessionsStack(app, "ImkLiveSessionsStack", {
    env,
    description: "I Must Kill - Live Session Sharing Infrastructure",

    // Stack-level tags for cost tracking
    tags: {
        Project: "IMustKill",
        Environment: "production",
        ManagedBy: "CDK",
    },
})
