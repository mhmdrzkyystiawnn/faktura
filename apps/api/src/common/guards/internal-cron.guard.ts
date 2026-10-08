import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalCronGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headerValue = request.headers['x-internal-cron-secret'];

    if (!headerValue || typeof headerValue !== 'string') {
      throw new UnauthorizedException('Missing internal cron secret');
    }

    const secret = process.env.INTERNAL_CRON_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Internal cron secret not configured');
    }

    const headerBuffer = Buffer.from(headerValue, 'utf8');
    const secretBuffer = Buffer.from(secret, 'utf8');

    if (
      headerBuffer.length !== secretBuffer.length ||
      !timingSafeEqual(headerBuffer, secretBuffer)
    ) {
      throw new UnauthorizedException('Invalid internal cron secret');
    }

    return true;
  }
}
