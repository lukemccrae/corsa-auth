export interface Athlete {
  id: number;
  username: string | null;
  resource_state: number;
  firstname: string;
  lastname: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  summit: boolean;
  created_at: string; // You might want to use a Date type here
  updated_at: string; // You might want to use a Date type here
  badge_type_id: number;
  weight: number;
  profile_medium: string;
  profile: string;
  friend: any | null; // You might want to define a more specific type for friend
  follower: any | null; // You might want to define a more specific type for follower
}

export interface AuthResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: Athlete;
}
