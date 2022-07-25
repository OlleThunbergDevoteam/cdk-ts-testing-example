import { CfnOutput, Duration, Expiration } from "aws-cdk-lib";
import * as cognito from "@aws-cdk/aws-cognito";
import * as lambda from "@aws-cdk/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class FunfixBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // USER POOL
    const userPool = new cognito.UserPool(this, "cdk-user-pool", {
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.PHONE_AND_EMAIL,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      "cdk-user-pool-client",
      {
        userPool,
      }
    );
    const api = new appsync.GraphqlApi(this, "cdk-api", {
      name: "cdk-api",
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      schema: appsync.Schema.fromAsset("./graphql/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool,
            },
          },
        ],
      },
    });
    const playerLambda = new lambda.Function(this, "cdk-player-lambda", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "main.handler",
      code: lambda.Code.fromAsset("./lambda"),
    });
    const playerTable = new dynamodb.Table(this, "cdk-dynamo-table", {
      partitionKey: {
        name: "playerId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    const lambdaDatasource = new appsync.LambdaDataSource(
      this,
      "cdk-lambda-datasource",
      {
        api,
        lambdaFunction: playerLambda,
      }
    );

    lambdaDatasource.createResolver({
      typeName: "Query",
      fieldName: "players",
    });
    lambdaDatasource.createResolver({
      typeName: "Query",
      fieldName: "player",
    });

    playerTable.grantFullAccess(playerLambda); // give access
    playerLambda.addEnvironment("PLAYER_TABLE_NAME", playerTable.tableName);

    // CfnOutput
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, "GraphQLApiId", {
      value: api.graphqlUrl,
    });
    new cdk.CfnOutput(this, "AppSyncApiKey", {
      value: api.apiKey || "",
    });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "ProjectRegion", {
      value: this.region,
    });
  }
}
