import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation, Query } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

import { CategoryService } from '@category/category.service';
import { Category } from '@category/category.entity';
import { CreateCategoryDto } from '@category/dto/create-category.dto';

import { GqlAuthGuard } from '@auth/auth.guard';
import { RolesGuard } from '@auth/roles.guard';
import { Roles } from '@auth/roles.decorator';

@Resolver()
export class CategoryResolver {
  constructor(private categoryService: CategoryService) {}

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Mutation(() => Category)
  async createCategory(@Args('data') data: CreateCategoryDto): Promise<Category> {
    const category = await this.categoryService.create(data);

    return category;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [Category], {
    nullable: true,
  })
  async getAllCategories(): Promise<Category[]> {
    const categories = await this.categoryService.findAll();

    return categories;
  }
}
