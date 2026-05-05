import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.server.emit('clientCount', this.getConnectedClients());
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
    client.join(room);
    return { event: 'subscribed', room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, room: string) {
    client.leave(room);
    return { event: 'unsubscribed', room };
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

  broadcastShelterUpdate(data: any) {
    this.server.emit('shelterUpdate', data);
  }
}
