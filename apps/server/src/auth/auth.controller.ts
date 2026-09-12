import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

import { AuthDto } from '@auth/dto/auth.input';
import { AuthType } from '@auth/dto/auth.interface';
import { AuthService } from '@auth/auth.service';

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface RefreshInput {
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  public async register(@Body() input: RegisterInput): Promise<AuthType> {
    return await this.authService.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(@Body() data: AuthDto): Promise<AuthType> {
    return await this.authService.validateUser(data);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Body() input: RefreshInput,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return await this.authService.refreshTokens(input.refreshToken);
  }
}

