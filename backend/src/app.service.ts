import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      name: 'SIG Bencana Gempa Bumi Bantul',
      version: '1.0.0',
      description:
        'Sistem Informasi Geografis Manajemen Krisis Bencana Gempa Bumi Kabupaten Bantul',
      endpoints: {
        api: '/api',
        health: '/api/health',
        auth: '/api/auth',
        earthquakes: '/api/earthquakes',
        'hazard-zones': '/api/hazard-zones',
        shelters: '/api/shelters',
        roads: '/api/roads',
        routes: '/api/routes',
        'public-facilities': '/api/public-facilities',
        dashboard: '/api/dashboard',
      },
      websocket: {
        namespace: '/',
        events: [
          'earthquakeUpdate',
          'hazardAlert',
          'evacuationRoute',
          'shelterUpdate',
        ],
      },
    };
  }

  getHealth(): object {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
