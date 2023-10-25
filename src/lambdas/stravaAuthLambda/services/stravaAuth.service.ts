import {
  GetSecretValueCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import { AuthResponse } from '../../../types';
import jwt = require('jsonwebtoken');

export const stravaAuth = async (authCode: string): Promise<any> => {
  try {
    const client = new SecretsManagerClient({ region: 'us-east-1' });

    const secretNames = [
      'STRAVA_CLIENT_SECRET',
      'STRAVA_CLIENT_ID',
      'JWT_SECRET_KEY'
    ];
    const secrets: { [key: string]: string } = {}; // Tell TS that the secrets obj will have a string key/value

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

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: parseInt(secrets['STRAVA_CLIENT_ID']),
        client_secret: secrets['STRAVA_CLIENT_SECRET'],
        code: authCode,
        grant_type: 'authorization_code'
      })
    });

    const authResponse: AuthResponse = await Promise.resolve(response.json()); //TODO is this best?
    const jwt = await generateJwt(authResponse, secrets['JWT_SECRET_KEY']);
    return {
      statusCode: 200,
      headers: {
        ContentType: 'application/json',
        'Access-Control-Allow-Origin':
          'https://8882-190-129-180-114.ngrok-free.app' // Specify the allowed origin here
      },
      body: JSON.stringify({ access_token: jwt })
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

export const generateJwt = async (
  authResponse: AuthResponse,
  secret: string
) => {
  const token = jwt.sign(authResponse, secret);
  return token;
};
