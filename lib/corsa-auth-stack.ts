import * as cdk from "aws-cdk-lib";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { type Construct } from "constructs";

export class CorsaAuthServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an AWS Lambda function
    const corsaAuthFunction = new lambda.Function(this, "CorsaAuthFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler", // Assuming your Lambda handler is in a file named "app.js"
      code: lambda.Code.fromAsset("src/lambdas/stravaAuthLambda/dist"),
    });

    // Create an API Gateway REST API
    const api = new apiGateway.RestApi(this, "CorsaAuthApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"], // TODO: Adjust this to limit CORS to specific origins
        allowMethods: apiGateway.Cors.ALL_METHODS,
      },
    });

    // Create an API Gateway resource and method
    const resource = api.root.addResource("corsa-auth");
    const method = resource.addMethod(
      "POST",
      new apiGateway.LambdaIntegration(corsaAuthFunction)
    );

    const get = resource.addMethod(
      "GET",
      new apiGateway.LambdaIntegration(corsaAuthFunction)
    );
  }
}

const app = new cdk.App();
new CorsaAuthServerStack(app, "CorsaAuthServerStack");
