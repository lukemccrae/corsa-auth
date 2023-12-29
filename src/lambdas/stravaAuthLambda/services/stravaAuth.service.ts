import {
  GetSecretValueCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import { AuthResponse } from '../../../types';
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand
} from '@aws-sdk/client-dynamodb';

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const retrieveSecrets = async (secretNames: string[]) => {
  const secrets: { [key: string]: string } = {}; // Tell TS that the secrets obj will have a string key/value
  const client = new SecretsManagerClient({ region: 'us-east-1' });

  // confusing pattern to retrieve multiple secrets defined in secretNames
  for (const secretName of secretNames) {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });
    const secretValue = await client.send(command);

    if (secretValue.SecretString == null || secretValue.SecretString === '') {
      throw new Error(`${secretName} not retrieved`);
    }
    secrets[secretName] = JSON.parse(secretValue.SecretString)[secretName];
  }
  return secrets;
};

export const stravaUserDetails = async (args: { userId: string }) => {
  // unencryt userId
  const secrets = await retrieveSecrets(['ENCRYPTION_KEY', 'IV_HEX']);

  const decryptData = (encryptedData: string) => {
    const decipher = createDecipheriv(
      'aes-256-cbc',
      Buffer.from(secrets['ENCRYPTION_KEY'], 'hex'),
      Buffer.from(secrets['IV_HEX'], 'hex')
    );

    let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  };
  const userId = decryptData(args.userId);

  // return user details
  const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

  const queryCommand = new QueryCommand({
    TableName: process.env.SESSION_MANAGEMENT_TABLE_NAME,
    KeyConditionExpression: 'UserId = :userId',
    ExpressionAttributeValues: {
      ':userId': { N: String(userId) }
    }
  });
  const queryResult = await dynamoClient.send(queryCommand);

  if (!queryResult.Items)
    throw new Error('There was a problem retrieving user data');

  const { AccessToken, UserId, Athlete, ExpiresAt } = queryResult.Items[0];

  if (!Athlete.M)
    throw new Error('There was a problem retrieving Athlete data');

  return {
    statusCode: 200,
    headers: {
      ContentType: 'application/json',
      // 'Access-Control-Allow-Origin': 'https://58f8-70-59-19-22.ngrok-free.app'
      // 'Access-Control-Allow-Origin': 'https://corsa-frontend-next.vercel.app'
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      access_token: AccessToken.S,
      userId: Number(UserId.N),
      expiresAt: Number(ExpiresAt.N),
      profile: Athlete.M.profile.S
    })
  };
};

export const stravaAuthRefresh = async (args: {
  userId: number;
  access_token: string;
}) => {
  try {
    // dynamo client for retrieving refresh token and checking access token
    const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

    const queryCommand = new QueryCommand({
      TableName: process.env.SESSION_MANAGEMENT_TABLE_NAME,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': { N: String(args.userId) }
      }
    });
    const queryResult = await dynamoClient.send(queryCommand);

    if (!queryResult.Items || !queryResult.Items[0])
      throw new Error('Matching record not found');

    const storedToken = queryResult.Items[0].AccessToken.S;
    const refreshToken = queryResult.Items[0].RefreshToken.S;

    if (storedToken === args.access_token) {
      // user passed us the same access token we have stored,
      // lets pull secrets to make refresh request
      const secrets = await retrieveSecrets([
        'STRAVA_CLIENT_SECRET',
        'STRAVA_CLIENT_ID'
      ]);

      // use secrets for token refresh
      const response = await fetch(
        'https://www.strava.com/api/v3/oauth/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: secrets['STRAVA_CLIENT_ID'],
            client_secret: secrets['STRAVA_CLIENT_SECRET'],
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          })
        }
      );

      const res = await response.json();

      // store new access token in dynamo
      const command = new UpdateItemCommand({
        TableName: process.env.SESSION_MANAGEMENT_TABLE_NAME,
        Key: {
          UserId: { N: String(args.userId) }
        },
        // This is analogous to a SQL statement
        UpdateExpression:
          'SET #AccessToken = :access_token, #RefreshToken = :refresh_token, #ExpiresAt = :expires_at',
        // This ties the passed values to the DB variables
        ExpressionAttributeNames: {
          '#AccessToken': 'AccessToken',
          '#RefreshToken': 'RefreshToken',
          '#ExpiresAt': 'ExpiresAt'
        },
        // This passes the values to the write operation
        ExpressionAttributeValues: {
          ':access_token': { S: res.access_token },
          ':refresh_token': { S: res.refresh_token },
          ':expires_at': { N: String(res.expires_at) }
        }
      });
      const dynamoResult = await dynamoClient.send(command);
      if (!dynamoResult) throw new Error('dynamo write failed');

      // 200 response
      return {
        statusCode: 200,
        headers: {
          ContentType: 'application/json',
          // 'Access-Control-Allow-Origin': 'https://58f8-70-59-19-22.ngrok-free.app'
          'Access-Control-Allow-Origin':
            // 'https://corsa-frontend-next.vercel.app'
            '*'
        },
        body: JSON.stringify({
          access_token: res.access_token,
          userId: res.userId,
          expires_at: res.expires_at,
          profile: res.profile
        })
      };
    } else {
      // token doesnt match
      return {
        statusCode: 404,
        headers: {
          ContentType: 'application/json',
          // 'Access-Control-Allow-Origin': 'https://58f8-70-59-19-22.ngrok-free.app'
          'Access-Control-Allow-Origin':
            'https://corsa-frontend-next.vercel.app'
        },
        body: JSON.stringify({
          error: 'The access token does not match our system.'
        })
      };
    }
  } catch (e) {
    console.log(e);
    // bad response
    return {
      statusCode: 400,
      headers: {
        ContentType: 'application/json',
        // 'Access-Control-Allow-Origin': 'https://58f8-70-59-19-22.ngrok-free.app'
        'Access-Control-Allow-Origin': 'https://corsa-frontend-next.vercel.app'
      },
      body: JSON.stringify({
        error: 'There was a problem with your request.'
      })
    };
  }
};

export const stravaRegister = async (args: {
  authCode: string;
}): Promise<any> => {
  try {
    const secrets = await retrieveSecrets([
      'STRAVA_CLIENT_SECRET',
      'STRAVA_CLIENT_ID',
      'ENCRYPTION_KEY',
      'IV_HEX'
    ]);

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: parseInt(secrets['STRAVA_CLIENT_ID']),
        client_secret: secrets['STRAVA_CLIENT_SECRET'],
        code: args.authCode,
        grant_type: 'authorization_code'
      })
    });

    const authResponse: AuthResponse = await Promise.resolve(response.json()); //TODO is this best?

    // authResponse has refresh token on it
    // write it to storage along with other account details
    const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

    const command = new PutItemCommand({
      TableName: process.env.SESSION_MANAGEMENT_TABLE_NAME,
      Item: {
        UserId: { N: String(authResponse.athlete.id) },
        RefreshToken: { S: authResponse.refresh_token },
        AccessToken: { S: authResponse.access_token },
        ExpiresAt: { N: String(authResponse.expires_at) },
        Athlete: {
          M: {
            profile: {
              S: authResponse.athlete.profile
            }
          }
        }
      }
    });

    await dynamoClient.send(command);

    // encyrpt userId for storage in frontend
    const cipher = createCipheriv(
      'aes-256-cbc',
      Buffer.from(secrets['ENCRYPTION_KEY'], 'hex'),
      Buffer.from(secrets['IV_HEX'], 'hex')
    );

    let encryptedUserId = cipher.update(
      String(authResponse.athlete.id),
      'utf-8',
      'hex'
    );
    encryptedUserId += cipher.final('hex');

    return {
      statusCode: 200,
      headers: {
        ContentType: 'application/json',
        'Access-Control-Allow-Origin': 'https://corsa-frontend-next.vercel.app' // Specify the allowed origin here
      },
      body: JSON.stringify({
        userId: encryptedUserId,
        profile: authResponse.athlete.profile
      })
    };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 400,
      headers: {
        ContentType: 'application/json'
      },
      body: 'Auth request failed'
    };
  }
};
