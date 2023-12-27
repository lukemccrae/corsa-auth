// Import the handler function
import { handler } from './handler';

// Create a generic mock for the functions
jest.mock('./services/stravaAuth.service');

// Import the mocked functions for better type inference
import * as stravaAuth from './services/stravaAuth.service';

describe('Handler function', () => {
  it('should call stravaRegister when service is strava-register', async () => {
    const mockParsed = { service: 'strava-register' };
    const mockReturnValue = { statusCode: 200, body: 'Success' };

    // Set the resolved value for stravaRegister
    (stravaAuth.stravaRegister as jest.Mock).mockResolvedValue(mockReturnValue);

    const result = await handler({ body: JSON.stringify(mockParsed) }, {});

    expect(stravaAuth.stravaRegister).toHaveBeenCalledWith(mockParsed);
    expect(result).toEqual(mockReturnValue);
  });

  // Add similar test cases for other service types in the switch statement
});
