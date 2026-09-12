import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation, Query } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

import { ProductService } from '@product/product.service';
import { Product } from '@product/product.entity';
import { CreateProductDto } from '@product/dto';

import { GqlAuthGuard } from '@auth/auth.guard';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';

@Resolver()
export class ProductResolver {
  constructor(private productService: ProductService) {}

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Mutation(() => Product)
  async createProduct(@Args('data') data: CreateProductDto): Promise<any> {
    const product = await this.productService.create(data);

    return product;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [Product], {
    nullable: true,
  })
  async getAllProducts(): Promise<any[]> {
    const products = await this.productService.findAll();

    return products;
  }

  // TODO: Add linkCategoryToProduct and other mutations when needed
}
