import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

// CRITICAL: These keys MUST match the frontend exactly!
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BN6PVZlf6sNZmFrHqW0iw7A4fPoXxFPb5buMkL8AsFTSvErOywZDl3VKlKX8bDRghDTqMlOkYgDE8G3deudYLpQ';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'Z9110Z-bplKjMWzJgWlIJ6aQOJuEcTTpmWoOd-jFfEQ';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {
    // Initialize VAPID keys
    webpush.setVapidDetails(
      'mailto:admin@gis-bantul.local',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );

    this.logger.log('Push notifications service initialized');
    this.logger.log(
      `VAPID Public Key: ${VAPID_PUBLIC_KEY.substring(0, 20)}...`,
    );
  }

  async getAllSubscriptions() {
    return this.prisma.pushSubscription.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async subscribe(subscription: any) {
    this.logger.log(`Processing push subscription: ${subscription.endpoint}`);

    // Validate subscription data
    if (!subscription.endpoint) {
      this.logger.error('Invalid subscription: missing endpoint');
      throw new Error('Invalid subscription: missing endpoint');
    }

    if (
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      this.logger.error('Invalid subscription: missing keys');
      throw new Error('Invalid subscription: missing keys');
    }

    const result = await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    this.logger.log(`Subscription saved successfully: ${result.id}`);
    return result;
  }

  async broadcastEarthquakeAlert(
    eqTitle: string,
    eqBody: string,
    emergencyParam: string = 'true',
  ) {
    this.logger.log(`Broadcasting earthquake alert: ${eqTitle}`);

    // Create proper payload - web-push will handle the encoding
    const notificationPayload = {
      title: eqTitle,
      body: eqBody,
      data: {
        url: `/?emergency=${emergencyParam}`,
      },
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'earthquake-alert',
      requireInteraction: true,
    };

    const payload = JSON.stringify(notificationPayload);

    const subscriptions = await this.prisma.pushSubscription.findMany();
    this.logger.log(
      `Broadcasting push notification to ${subscriptions.length} devices.`,
    );

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const invalidIds: number[] = [];

    for (const sub of subscriptions) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        successCount++;
        this.logger.log(
          `Notification sent successfully to subscription ${sub.id}`,
        );
      } catch (err: any) {
        errorCount++;
        const errorMsg = `Subscription ${sub.id}: ${err.message}`;
        errors.push(errorMsg);
        this.logger.warn(errorMsg);

        if (
          err.statusCode === 410 ||
          err.statusCode === 404 ||
          err.statusCode === 401
        ) {
          this.logger.log(`Marking invalid subscription for deletion: ${sub.id}`);
          invalidIds.push(sub.id);
        }
      }
    }

    if (invalidIds.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { id: { in: invalidIds } },
      });
      this.logger.log(`Bulk deleted ${invalidIds.length} invalid subscriptions.`);
    }

    this.logger.log(
      `Broadcast completed: ${successCount} success, ${errorCount} errors`,
    );

    if (errors.length > 0) {
      return { successCount, errorCount, errors };
    }

    return { successCount, errorCount };
  }

  async cleanupInvalidSubscriptions() {
    const subscriptions = await this.prisma.pushSubscription.findMany();
    const invalidIds: number[] = [];

    for (const sub of subscriptions) {
      // Try to ping the endpoint to see if it's valid
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ type: 'ping' }),
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          invalidIds.push(sub.id);
        }
      }
    }

    if (invalidIds.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { id: { in: invalidIds } },
      });
      this.logger.log(`Deleted ${invalidIds.length} invalid subscriptions`);
    }

    return { deleted: invalidIds.length };
  }

  async deleteSubscription(id: number) {
    await this.prisma.pushSubscription.delete({ where: { id } });
    return { message: 'Subscription deleted' };
  }

  async deleteAllSubscriptions() {
    await this.prisma.pushSubscription.deleteMany({});
    return { message: 'All subscriptions deleted' };
  }
}
