import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://sigma-bantul.duckdns.org',
      'https://sigma-bantul.vercel.app',
    ],
    credentials: true,
  },
  namespace: '/',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(private dashboardService: DashboardService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.server.emit('clientCount', this.getConnectedClients());
    // Send initial dashboard stats on connection
    this.broadcastDashboardStats();
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.server.emit('clientCount', this.getConnectedClients());
  }

  private getConnectedClients(): number {
    return this.server?.sockets?.sockets?.size || 0;
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, room: string) {
    void client.join(room);
    return { event: 'subscribed', room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, room: string) {
    void client.leave(room);
    return { event: 'unsubscribed', room };
  }

  // Broadcast dashboard statistics to all connected clients
  async broadcastDashboardStats() {
    try {
      const stats = await this.dashboardService.getDashboardSummary();
      this.server.emit('dashboardStats', stats);
      this.logger.log('Dashboard stats broadcasted to clients');
    } catch (error) {
      this.logger.error('Failed to broadcast dashboard stats:', error);
    }
  }

  // Broadcast evacuation location capacity update
  broadcastEvacuationCapacityUpdate(data: {
    id: number;
    name: string;
    currentOccupancy: number;
    availableCapacity: number;
    totalCapacity: number;
  }) {
    this.server.emit('evacuationCapacityUpdate', data);
  }

  // Broadcast officer status update
  broadcastOfficerUpdate(data: {
    totalOfficers: number;
    activeToday: number;
  }) {
    this.server.emit('officerUpdate', data);
  }

  broadcastEarthquakeUpdate(data: any) {
    this.server.emit('earthquakeUpdate', data);
  }

  broadcastHazardAlert(data: any) {
    this.server.emit('hazardAlert', data);
  }

  broadcastEvacuationRoute(data: any) {
    this.server.emit('evacuationRoute', data);
  }

  broadcastEvacuationLocationUpdate(data: any) {
    this.server.emit('evacuationLocationUpdate', data);
  }
}
