import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, randomInt, createHash } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      config.get<string>('GOOGLE_CLIENT_ID'),
    );
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name ?? '',
      },
    });

    await this.sendEmailVerification(user.id, user.email, user.name);
    return {
      message: 'Kode verifikasi telah dikirim ke email Anda.',
      email: user.email,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email atau password salah');
    }
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Email belum terverifikasi. Silakan cek kode di email Anda.',
      );
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    return this.generateTokens(user.id, user.email);
  }

  // --- Modern Google Login (GIS) ---

  async verifyGoogleToken(credential: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: credential,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token Google tidak valid');
    }

    return this.validateGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? '',
    });
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new UnauthorizedException(
        'Kode verifikasi tidak valid atau sudah kedaluwarsa',
      );
    const verification = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification || this.hashToken(code) !== verification.codeHash) {
      throw new UnauthorizedException(
        'Kode verifikasi tidak valid atau sudah kedaluwarsa',
      );
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return this.generateTokens(user.id, user.email);
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt && user.passwordHash) {
      await this.sendEmailVerification(user.id, user.email, user.name);
    }
    return {
      message: 'Jika akun memerlukan verifikasi, kode baru telah dikirim.',
    };
  }

  private async sendEmailVerification(
    userId: string,
    email: string,
    name: string,
  ) {
    const code = String(randomInt(100000, 1000000));
    await this.prisma.emailVerification.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.emailVerification.create({
      data: {
        userId,
        codeHash: this.hashToken(code),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await this.resend.emails.send({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'Faktura <noreply@faktura.app>',
      to: email,
      subject: 'Kode verifikasi email Faktura',
      html: `<p>Halo ${name || 'di sana'},</p><p>Kode verifikasi Faktura Anda:</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold">${code}</p><p>Kode berlaku selama 15 menit.</p>`,
    });
  }

  async validateGoogleUser(input: {
    googleId: string;
    email: string;
    name: string;
  }) {
    // Check if user exists by oauthId
    let user = await this.prisma.user.findFirst({
      where: { oauthId: input.googleId, oauthProvider: 'google' },
    });

    if (!user) {
      // Check if user exists by email (account linking)
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            oauthId: input.googleId,
            oauthProvider: 'google',
            emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: input.email,
            name: input.name,
            oauthProvider: 'google',
            oauthId: input.googleId,
            emailVerifiedAt: new Date(),
          },
        });
      }
    }

    return user;
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    if (storedToken.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token sudah digunakan. Semua sesi dicabut.',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token sudah expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.userId, storedToken.user.email);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { token: tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    const code = randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    await this.resend.emails.send({
      from:
        this.config.get<string>('EMAIL_FROM') ??
        'Faktura <noreply@faktura.app>',
      to: dto.email,
      subject: 'Kode Reset Password Faktura',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">Reset Password</h1>
          <p style="color: #555; margin-bottom: 24px;">Gunakan kode berikut untuk mereset password Anda:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 24px;">
            <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</span>
          </div>
          <p style="color: #777; font-size: 14px;">Kode ini berlaku selama 1 jam.</p>
          <p style="color: #777; font-size: 14px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
      `,
    });

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { code: dto.code },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new NotFoundException('Invalid or expired reset code');
    }

    if (resetRecord.usedAt) {
      throw new UnauthorizedException('Reset code has already been used');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset code has expired');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password has been reset successfully' };
  }

  // --- Private helpers ---

  async generateTokens(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );

    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const expiresAt = this.parseExpiration(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiration(expiration: string): Date {
    const match = expiration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * (multipliers[unit] ?? 86400000));
  }
}
