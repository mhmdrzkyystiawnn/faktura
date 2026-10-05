import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class GoogleOAuthService {
  private readonly client: OAuth2Client;

  constructor(private readonly config: ConfigService) {
    this.client = new OAuth2Client(
      config.get<string>('GOOGLE_CLIENT_ID'),
      config.get<string>('GOOGLE_CLIENT_SECRET'),
      config.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3001/api/v1/auth/google/callback',
    );
  }

  getAuthorizationUrl(): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      include_granted_scopes: true,
    });
  }

  async handleCallback(code: string) {
    const { tokens } = await this.client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new UnauthorizedException('Google tidak memberikan ID token');
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token Google tidak valid');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? '',
    };
  }
}
