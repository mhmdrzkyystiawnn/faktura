import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { idToken } = req.body;

    if (!idToken) {
      throw new UnauthorizedException('Google ID token is required');
    }

    try {
      const payload = await this.authService.verifyGoogleIdToken(idToken);
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
