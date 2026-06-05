import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WebsocketService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emit(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
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
    this.emit('evacuationCapacityUpdate', data);
  }

  // Broadcast evacuee check-in event
  broadcastEvacueeCheckIn(data: {
    evacueeId: number;
    name: string;
    evacuationLocationId: number;
    evacuationLocationName: string;
    familySize: number;
  }) {
    this.emit('evacueeCheckIn', data);
  }

  // Broadcast evacuee check-out event
  broadcastEvacueeCheckOut(data: {
    evacueeId: number;
    name: string;
    evacuationLocationId: number;
    evacuationLocationName: string;
    familySize: number;
  }) {
    this.emit('evacueeCheckOut', data);
  }

  // Broadcast dashboard stats
  broadcastDashboardStats(data: any) {
    this.emit('dashboardStats', data);
  }
}