import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { OrderService } from '@order/order.service';
import { JwtAuthGuard } from '@auth/auth.guard';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';
import { CurrentUser } from '@user/user.decorator';

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @CurrentUser() user: any,
    @Body() data: {
      shippingAddressId?: string;
      billingAddressId?: string;
      discountCode?: string;
    },
  ): Promise<any> {
    return await this.orderService.createOrder(
      user.id,
      data.shippingAddressId,
      data.billingAddressId,
      data.discountCode,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getOrders(@CurrentUser() user: any, @Query('page') page?: number, @Query('limit') limit?: number): Promise<any> {
    return await this.orderService.getOrders(user.id, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrder(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return await this.orderService.getOrder(user.id, id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateOrderStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { status: string },
  ): Promise<any> {
    return await this.orderService.updateOrderStatus(id, data.status as any, user.id);
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return await this.orderService.cancelOrder(user.id, id);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAllOrders(@Query('page') page?: number, @Query('limit') limit?: number): Promise<any> {
    return await this.orderService.getAllOrders(page, limit);
  }
}

