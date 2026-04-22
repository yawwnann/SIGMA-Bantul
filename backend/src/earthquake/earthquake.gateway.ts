import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  // Removed namespace so it emits to to root namespace matching frontend
})
export class EarthquakeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EarthquakeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastLatestEarthquake(data: any) {
    // Change to match frontend listener
    this.server.emit('new-earthquake', data);
  }

  broadcastEarthquakeHistory(data: any[]) {
    this.server.emit('earthquakeHistory', data);
  }
}
