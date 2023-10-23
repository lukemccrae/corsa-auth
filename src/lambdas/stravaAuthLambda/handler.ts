import { stravaAuth } from './services/stravaAuth.service';

export const handler = async (event: any, context: any): Promise<any> => {
  console.log(event, '< event');
  const parsed = JSON.parse(event.body);
  const { authCode, service } = parsed;
  switch (service) {
    case 'strava':
      return await stravaAuth(authCode);
    default:
      return {
        statusCode: 404,
        headers: {
          ContentType: 'application/json'
        },
        body: 'service not supported'
      };
  }
};
