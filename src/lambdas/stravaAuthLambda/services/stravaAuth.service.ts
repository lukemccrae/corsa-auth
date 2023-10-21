import { httpClient } from "../../clients/httpClient";

export const stravaAuth = async () => {
  return {
    statusCode: 200,
    headers: {
      ContentType: "application/json",
    },
    body: "Your response body goes here",
  };
};
