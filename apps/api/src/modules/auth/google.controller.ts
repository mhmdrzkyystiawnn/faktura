import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/auth/google')
export class GoogleAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuth: GoogleOAuthService,
  ) {}

  // Step 1: Redirect to Google consent screen
  @Get()
  googleLogin(@Res() res: Response) {
    const url = this.googleOAuth.getAuthorizationUrl();
    return res.redirect(url);
  }

  // Step 2: Handle Google callback
  @Get('callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (error || !code) {
      return res.redirect(`${frontendUrl}/auth/login?error=google_denied`);
    }

    try {
      const googleUser = await this.googleOAuth.handleCallback(code);

      // Find or create user
      const user = await this.authService.validateGoogleUser({
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
      });

      // Generate tokens
      const { accessToken, refreshToken } =
        await this.authService.generateTokens(user.id, user.email);

      // Set refresh token as HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to frontend with access token
      return res.redirect(
        `${frontendUrl}/auth/google-callback?token=${accessToken}`,
      );
    } catch (err: any) {
      return res.redirect(
        `${frontendUrl}/auth/login?error=${encodeURIComponent(err.message || 'google_error')}`,
      );
    }
  }
}
