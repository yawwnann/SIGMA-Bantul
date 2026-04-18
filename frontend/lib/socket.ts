import { io, Socket } from "socket.io-client";
import type { Earthquake } from "@/types";

type EarthquakeCallback = (earthquake: Earthquake) => void;
type RouteUpdateCallback = () => void;

class SocketService {
  private socket: Socket | null = null;
  private earthquakeCallbacks: EarthquakeCallback[] = [];
  private routeUpdateCallbacks: RouteUpdateCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url?: string) {
    if (this.socket?.connected) return;

    const socketUrl =
      url || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.reconnectAttempts++;
    });

    this.socket.on("new-earthquake", (data: Earthquake) => {
      console.log("New earthquake received:", data);
      this.earthquakeCallbacks.forEach((callback) => callback(data));
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
