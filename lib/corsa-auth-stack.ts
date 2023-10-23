import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { type Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class CorsaAuthServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Attach the policy to your role
    const authLambdaRole = new iam.Role(this, 'AuthLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });

    // Create an AWS Lambda function
    const authLambda = new lambda.Function(this, 'corsaAuthLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/lambdas/stravaAuthLambda/dist'),
      role: authLambdaRole,
      timeout: cdk.Duration.seconds(10)
    });

    // Create an API Gateway REST API
    const api = new apiGateway.RestApi(this, 'CorsaAuthApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'], // TODO: Adjust this to limit CORS to specific origins
        allowMethods: apiGateway.Cors.ALL_METHODS
      }
    });

    new secretsmanager.CfnSecret(this, 'STRAVA_CLIENT_SECRET', {
      name: 'STRAVA_CLIENT_SECRET',
      secretString: JSON.stringify({
        STRAVA_CLIENT_SECRET: ''
      })
    });

    new secretsmanager.CfnSecret(this, 'STRAVA_CLIENT_ID', {
      name: 'STRAVA_CLIENT_ID',
      secretString: JSON.stringify({
        STRAVA_CLIENT_ID: ''
      })
    });

    secretsmanager.Secret.fromSecretNameV2(this, '1', 'StravaClientSecret');

    secretsmanager.Secret.fromSecretNameV2(this, '2', 'StravaClientId');

    authLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],

        resources: ['*'] //TODO: not good?
      })
    );

    const cloudWatchLogsPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: ['*'] // Adjust this to limit resources as needed
        })
      ]
    });

    const cloudwatchPolicy = new iam.Policy(this, 'CloudWatchLogsPolicy', {
      document: cloudWatchLogsPolicy
    });

    authLambdaRole.attachInlinePolicy(cloudwatchPolicy);

    // Create an API Gateway resource and method
    const resource = api.root.addResource('corsa-auth');
    const method = resource.addMethod(
      'POST',
      new apiGateway.LambdaIntegration(authLambda)
    );
  }
}

const app = new cdk.App();
new CorsaAuthServerStack(app, 'CorsaAuthServerStack');
