import { io, Socket } from "socket.io-client";
import type { Earthquake } from "@/types";

type EarthquakeCallback = (earthquake: Earthquake) => void;
type RouteUpdateCallback = () => void;
type DashboardStatsCallback = (stats: DashboardStats) => void;
type EvacuationCapacityCallback = (data: EvacuationCapacityUpdate) => void;

export interface DashboardStats {
  earthquake: {
    total: number;
    last30Days: number;
    averageMagnitude: number;
  };
  evacuationLocation: {
    total: number;
    totalCapacity: number;
    goodCondition: number;
  };
  road: {
    total: number;
    totalLength: number;
    goodCondition: number;
  };
  hazardZone: {
    total: number;
    critical: number;
    high: number;
  };
  evacuation: {
    totalRoutes: number;
    averageScore: number;
  };
  latestEarthquake: Earthquake | null;
}

export interface EvacuationCapacityUpdate {
  id: number;
  name: string;
  currentOccupancy: number;
  availableCapacity: number;
  totalCapacity: number;
}

class SocketService {
  private socket: Socket | null = null;
  private earthquakeCallbacks: EarthquakeCallback[] = [];
  private routeUpdateCallbacks: RouteUpdateCallback[] = [];
  private dashboardStatsCallbacks: DashboardStatsCallback[] = [];
  private evacuationCapacityCallbacks: EvacuationCapacityCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url?: string) {
    if (this.socket?.connected) return;

    const socketUrl =
      url || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.warn("Socket connection error - backend may not be running");
      this.reconnectAttempts++;
    });

    // Earthquake events
    this.socket.on("new-earthquake", (data: Earthquake) => {
      console.log("New earthquake received:", data);
      this.earthquakeCallbacks.forEach((callback) => callback(data));
    });

    // Dashboard stats events
    this.socket.on("dashboardStats", (data: DashboardStats) => {
      console.log("Dashboard stats received:", data);
      this.dashboardStatsCallbacks.forEach((callback) => callback(data));
    });

    // Evacuation capacity update events
    this.socket.on("evacuationCapacityUpdate", (data: EvacuationCapacityUpdate) => {
      console.log("Evacuation capacity update received:", data);
      this.evacuationCapacityCallbacks.forEach((callback) => callback(data));
    });

    this.socket.on("route-update", () => {
      console.log("Route update received");
      this.routeUpdateCallbacks.forEach((callback) => callback());
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onNewEarthquake(callback: EarthquakeCallback) {
    this.earthquakeCallbacks.push(callback);
    return () => {
      this.earthquakeCallbacks = this.earthquakeCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onRouteUpdate(callback: RouteUpdateCallback) {
    this.routeUpdateCallbacks.push(callback);
    return () => {
      this.routeUpdateCallbacks = this.routeUpdateCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onDashboardStats(callback: DashboardStatsCallback) {
    this.dashboardStatsCallbacks.push(callback);
    return () => {
      this.dashboardStatsCallbacks = this.dashboardStatsCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onEvacuationCapacityUpdate(callback: EvacuationCapacityCallback) {
    this.evacuationCapacityCallbacks.push(callback);
    return () => {
      this.evacuationCapacityCallbacks = this.evacuationCapacityCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  emitRouteCalculated(routeData: unknown) {
    if (this.socket?.connected) {
      this.socket.emit("route-calculated", routeData);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
