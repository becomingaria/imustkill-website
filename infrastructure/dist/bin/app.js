#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const imk_stack_1 = require("../lib/imk-stack");
const app = new cdk.App();
// Get environment from context or use defaults
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};
new imk_stack_1.ImkLiveSessionsStack(app, "ImkLiveSessionsStack", {
    env,
    description: "I Must Kill - Live Session Sharing Infrastructure",
    // Stack-level tags for cost tracking
    tags: {
        Project: "IMustKill",
        Environment: "production",
        ManagedBy: "CDK",
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBb0M7QUFDcEMsaURBQWtDO0FBQ2xDLGdEQUF1RDtBQUV2RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUV6QiwrQ0FBK0M7QUFDL0MsTUFBTSxHQUFHLEdBQUc7SUFDUixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7SUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztDQUN4RCxDQUFBO0FBRUQsSUFBSSxnQ0FBb0IsQ0FBQyxHQUFHLEVBQUUsc0JBQXNCLEVBQUU7SUFDbEQsR0FBRztJQUNILFdBQVcsRUFBRSxtREFBbUQ7SUFFaEUscUNBQXFDO0lBQ3JDLElBQUksRUFBRTtRQUNGLE9BQU8sRUFBRSxXQUFXO1FBQ3BCLFdBQVcsRUFBRSxZQUFZO1FBQ3pCLFNBQVMsRUFBRSxLQUFLO0tBQ25CO0NBQ0osQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0IFwic291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyXCJcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIlxuaW1wb3J0IHsgSW1rTGl2ZVNlc3Npb25zU3RhY2sgfSBmcm9tIFwiLi4vbGliL2ltay1zdGFja1wiXG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKClcblxuLy8gR2V0IGVudmlyb25tZW50IGZyb20gY29udGV4dCBvciB1c2UgZGVmYXVsdHNcbmNvbnN0IGVudiA9IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8IFwidXMtZWFzdC0xXCIsXG59XG5cbm5ldyBJbWtMaXZlU2Vzc2lvbnNTdGFjayhhcHAsIFwiSW1rTGl2ZVNlc3Npb25zU3RhY2tcIiwge1xuICAgIGVudixcbiAgICBkZXNjcmlwdGlvbjogXCJJIE11c3QgS2lsbCAtIExpdmUgU2Vzc2lvbiBTaGFyaW5nIEluZnJhc3RydWN0dXJlXCIsXG5cbiAgICAvLyBTdGFjay1sZXZlbCB0YWdzIGZvciBjb3N0IHRyYWNraW5nXG4gICAgdGFnczoge1xuICAgICAgICBQcm9qZWN0OiBcIklNdXN0S2lsbFwiLFxuICAgICAgICBFbnZpcm9ubWVudDogXCJwcm9kdWN0aW9uXCIsXG4gICAgICAgIE1hbmFnZWRCeTogXCJDREtcIixcbiAgICB9LFxufSlcbiJdfQ==