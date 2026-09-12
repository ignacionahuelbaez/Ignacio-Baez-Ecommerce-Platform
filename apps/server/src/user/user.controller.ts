import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { UserService } from '@user/user.service';
import { CreateUserDto } from '@user/dto';
import { sanitizeUser } from '@user/user.utils';

import { ValidationPipe } from '@shared/pipes/validation.pipe';
import { JwtAuthGuard } from '@auth/auth.guard';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';
import { CurrentUser } from '@user/user.decorator';

const isAdmin = (user: any) =>
  user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(@Query('role') role?: string): Promise<any[]> {
    const users = await this.userService.findAll(0, 100, role);
    return users.map(sanitizeUser);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any): Promise<any> {
    return sanitizeUser(await this.userService.findById(user.id));
  }

  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  async getAddresses(@CurrentUser() user: any): Promise<any> {
    return await this.userService.getAddresses(user.id);
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard)
  async createAddress(@CurrentUser() user: any, @Body() data: any): Promise<any> {
    return await this.userService.createAddress(user.id, data);
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findByEmail(@Param('email') email: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    return user ? sanitizeUser(user) : user;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@CurrentUser() requester: any, @Param('id') id: string): Promise<any> {
    if (requester.id !== id && !isAdmin(requester)) {
      throw new ForbiddenException('Insufficient role to access this resource');
    }

    return sanitizeUser(await this.userService.findById(id));
  }

  @Post()
  @UsePipes(new ValidationPipe())
  async createUser(@Body() data: CreateUserDto): Promise<any> {
    return sanitizeUser(await this.userService.create(data));
  }
}

