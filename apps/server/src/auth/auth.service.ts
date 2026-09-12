import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcrypt';
import { User } from '@prisma/client';

import { AuthDto } from '@auth/dto/auth.input';
import { UserService } from '@user/user.service';
import { AuthType } from '@auth/dto/auth.interface';
import { sanitizeUser } from '@user/user.utils';

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthType> {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const user = await this.userService.create({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async validateUser(data: AuthDto): Promise<AuthType> {
    const user = await this.userService.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    const validPassword = compareSync(data.password, user.password);

    if (!validPassword) {
      throw new UnauthorizedException('Incorrect Password');
    }

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.REFRESH_SECRET || process.env.SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    let user: User;

    try {
      user = await this.userService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException('User not found');
    }

    return {
      accessToken: await this.generateAccessToken(user),
      // Rotate the refresh token on every use.
      refreshToken: await this.generateRefreshToken(user),
    };
  }

  public async generateAccessToken(user: User): Promise<string> {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  public async generateRefreshToken(user: User): Promise<string> {
    const payload = { sub: user.id };

    return this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_SECRET || process.env.SECRET,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  }
}
