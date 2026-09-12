import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: {
                    isPrimary: true,
                  },
                  take: 1,
                },
                categories: {
                  include: {
                    category: true,
                  },
                  where: {
                    isPrimary: true,
                  },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    where: {
                      isPrimary: true,
                    },
                    take: 1,
                  },
                  categories: {
                    include: {
                      category: true,
                    },
                    where: {
                      isPrimary: true,
                    },
                    take: 1,
                  },
                },
              },
              variant: true,
            },
          },
        },
      });
    }

    return this.calculateCartTotals(cart);
  }

  async addToCart(userId: string, productId: string, variantId: string | null, quantity: number) {
    const cart = await this.getCart(userId);

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if variant exists if provided
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId,
      },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async mergeGuestCart(
    userId: string,
    items: { productId: string; variantId?: string | null; quantity: number }[],
  ) {
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) continue;

      // Reuse addToCart's existing-item/product/variant validation so a stale or
      // tampered guest cart entry can't silently fail or corrupt the server cart.
      try {
        await this.addToCart(userId, item.productId, item.variantId ?? null, item.quantity);
      } catch {
        // Skip items that no longer exist (deleted product/variant) instead of
        // failing the whole merge over one stale guest-cart entry.
        continue;
      }
    }

    return this.getCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.getCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, itemId: string) {
    const cart = await this.getCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }

  private calculateCartTotals(cart: any) {
    const subtotal = cart.items.reduce((sum: number, item: any) => {
      const price = item.variant?.price || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    return {
      ...cart,
      subtotal,
      total: subtotal,
      itemCount: cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    };
  }
}

