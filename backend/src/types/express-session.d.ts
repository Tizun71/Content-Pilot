declare module 'express-session' {
  interface SessionData {
    twitter?: {
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
      user: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
        description?: string;
      };
    };
  }
}

export {};
