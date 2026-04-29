import { Controller, Post, Body, Get, Delete, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Post('subscribe')
  async subscribe(@Body() body: any) {
    return this.notifService.subscribe(body);
  }

  @Get('status')
  async getStatus() {
    const subscriptions = await this.notifService.getAllSubscriptions();
    
    // Categorize subscriptions
    const webPush = subscriptions.filter(s => !s.endpoint.includes('fcm.googleapis.com'));
    const fcm = subscriptions.filter(s => s.endpoint.includes('fcm.googleapis.com'));
    
    return {
      totalSubscriptions: subscriptions.length,
      webPushCount: webPush.length,
      fcmCount: fcm.length,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        type: s.endpoint.includes('fcm.googleapis.com') ? 'FCM' : 'WebPush',
        endpoint: s.endpoint.substring(0, 50) + '...',
        createdAt: s.createdAt,
      })),
    };
  }

  @Get('test')
  async sendTestNotification() {
    const result = await this.notifService.broadcastEarthquakeAlert(
      'TEST - Peringatan Gempa',
      'Notifikasi darurat berhasil diaktifkan! Klik untuk melihat detail.',
      'true',
    );
    return { 
      message: 'Test notification sent',
      ...result
    };
  }

  @Post('cleanup')
  async cleanup() {
    const result = await this.notifService.cleanupInvalidSubscriptions();
    return { 
      message: 'Cleanup completed',
      ...result
    };
  }

  @Delete('all')
  async deleteAllSubscriptions() {
    return this.notifService.deleteAllSubscriptions();
  }

  @Delete(':id')
  async deleteSubscription(@Param('id') id: string) {
    return this.notifService.deleteSubscription(parseInt(id, 10));
  }
}
