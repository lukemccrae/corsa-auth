import { stravaAuth } from "./services/stravaAuth.service";

export const handler = async (event: any, context: any): Promise<any> => {
  try {
    console.log(event, "< event");
    return await stravaAuth();
  } catch (e) {
    console.log(e);
  }
};
