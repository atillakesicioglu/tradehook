import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import type { FirebaseUser } from '../auth/firebase.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Creates a user (dev auth) and provisions a default trial subscription. */
  async createDevUser(input: {
    email: string;
    name?: string;
    passwordHash: string;
  }) {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
      },
    });
    // In dev mode the firebaseUid mirrors the local id for forward compatibility.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid: user.id },
    });
    await this.subscriptions.getOrCreate(user.id);
    return user;
  }

  /** Upserts a user from a verified Firebase token and ensures a subscription. */
  async ensureFromFirebase(fb: FirebaseUser) {
    const user = await this.prisma.user.upsert({
      where: { firebaseUid: fb.uid },
      update: { email: fb.email, name: fb.name },
      create: { firebaseUid: fb.uid, email: fb.email, name: fb.name },
    });
    await this.subscriptions.getOrCreate(user.id);
    return user;
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { subscription: true, binanceAccount: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      hasBinanceAccount: Boolean(user.binanceAccount),
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
            monthlyTradeLimit: user.subscription.monthlyTradeLimit,
            monthlyTradeCount: user.subscription.monthlyTradeCount,
          }
        : null,
    };
  }
}
