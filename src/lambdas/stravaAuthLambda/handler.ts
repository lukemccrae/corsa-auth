import { stravaRegister } from './services/stravaAuth.service';
import { stravaAuthRefresh } from './services/stravaAuth.service';
import { stravaUserDetails } from './services/stravaAuth.service';

export const handler = async (event: any, context: any): Promise<any> => {
  const parsed = JSON.parse(event.body);
  const { service } = parsed;
  switch (service) {
    // initial login, write permissions
    case 'strava-register':
      return await stravaRegister(parsed);
    // refresh expired token
    case 'strava-refresh':
      return await stravaAuthRefresh(parsed);
    // give user details when matching id and access_token is provided
    case 'strava-user-details':
      return await stravaUserDetails(parsed);
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
