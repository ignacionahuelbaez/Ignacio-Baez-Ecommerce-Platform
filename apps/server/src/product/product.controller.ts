import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { ProductService } from '@product/product.service';
import { CreateProductDto } from '@product/dto';
import { JwtAuthGuard } from '@auth/auth.guard';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Body() data: CreateProductDto): Promise<any> {
    return await this.productService.create(data);
  }

  @Get()
  async findAll(): Promise<any[]> {
    return await this.productService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return await this.productService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() data: any): Promise<any> {
    return await this.productService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async delete(@Param('id') id: string): Promise<void> {
    await this.productService.delete(id);
  }
}

