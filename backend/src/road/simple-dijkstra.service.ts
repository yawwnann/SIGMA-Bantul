import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface Node {
  id: string;
  lat: number;
  lon: number;
}

interface Edge {
  from: string;
  to: string;
  roadId: number;
  distance: number;
  cost: number;
}

interface Graph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge[]>;
}

@Injectable()
export class SimpleDijkstraService {
  constructor(private prisma: PrismaService) {}

  /**
   * Build graph from road network
   */
  private async buildGraph(): Promise<Graph> {
    const roads = await this.prisma.$queryRaw<any[]>`
      SELECT 
        id,
        name,
        type,
        condition,
        ST_AsGeoJSON(geom)::json as geometry,
        ST_Length(geom::geography) as length_m
      FROM "Road"
    `;

    const nodes = new Map<string, Node>();
    const edges = new Map<string, Edge[]>();

    roads.forEach((road) => {
      const geom = road.geometry;
      if (geom.type !== 'LineString') return;

      const coords = geom.coordinates;
      if (coords.length < 2) return;

      // Start and end points
      const start = coords[0];
      const end = coords[coords.length - 1];

      const startId = `${start[1].toFixed(5)},${start[0].toFixed(5)}`;
      const endId = `${end[1].toFixed(5)},${end[0].toFixed(5)}`;

      // Add nodes
      if (!nodes.has(startId)) {
        nodes.set(startId, { id: startId, lat: start[1], lon: start[0] });
      }
      if (!nodes.has(endId)) {
        nodes.set(endId, { id: endId, lat: end[1], lon: end[0] });
      }

      // Calculate Weighted Overlay Cost
      // According to thesis: Dijkstra cost is determined by weighted overlay
      const distance = road.length_m || 0;
      let weightMultiplier = 1.0;

      // Road Condition Factor
      if (road.condition === 'MODERATE') weightMultiplier += 0.3;
      else if (road.condition === 'POOR') weightMultiplier += 0.7;
      else if (road.condition === 'DAMAGED') weightMultiplier += 2.0;

      // Vulnerability (Hazard) Factor
      if (road.vulnerability === 'MEDIUM') weightMultiplier += 0.3;
      else if (road.vulnerability === 'HIGH') weightMultiplier += 0.7;
      else if (road.vulnerability === 'CRITICAL') weightMultiplier += 2.0;

      const cost = distance * weightMultiplier;

      // Add edges (bidirectional)
      const edge1: Edge = {
        from: startId,
        to: endId,
        roadId: road.id,
        distance,
        cost,
      };
      const edge2: Edge = {
        from: endId,
        to: startId,
        roadId: road.id,
        distance,
        cost,
      };

      if (!edges.has(startId)) edges.set(startId, []);
      if (!edges.has(endId)) edges.set(endId, []);

      edges.get(startId)!.push(edge1);
      edges.get(endId)!.push(edge2);
    });

    return { nodes, edges };
  }

  /**
   * Find nearest node to a point
   */
  private findNearestNode(
    lat: number,
    lon: number,
    nodes: Map<string, Node>,
  ): Node | null {
    let nearest: Node | null = null;
    let minDist = Infinity;

    nodes.forEach((node) => {
      const dist = this.haversineDistance(lat, lon, node.lat, node.lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    });

    return nearest;
  }

  /**
   * Haversine distance in meters
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Dijkstra's algorithm
   */
  private dijkstra(
    graph: Graph,
    startNode: Node,
    endNode: Node,
  ): { path: string[]; totalCost: number; totalDistance: number } | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize
    graph.nodes.forEach((node) => {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    });
    distances.set(startNode.id, 0);

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let current: string | null = null;
      let minDist = Infinity;
      unvisited.forEach((nodeId) => {
        const dist = distances.get(nodeId)!;
        if (dist < minDist) {
          minDist = dist;
          current = nodeId;
        }
      });

      if (!current || minDist === Infinity) break;
      if (current === endNode.id) break;

      unvisited.delete(current);

      // Check neighbors
      const neighbors = graph.edges.get(current) || [];
      neighbors.forEach((edge) => {
        if (!unvisited.has(edge.to)) return;

        const alt = distances.get(current!)! + edge.cost;
        if (alt < distances.get(edge.to)!) {
          distances.set(edge.to, alt);
          previous.set(edge.to, current);
        }
      });
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endNode.id;
    while (current !== null) {
      path.unshift(current);
      const prev = previous.get(current);
      if (prev === null || prev === undefined) {
        break;
      }
      current = prev;
    }

    if (path.length === 0 || path[0] !== startNode.id) {
      return null; // No path found
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edges = graph.edges.get(from) || [];
      const edge = edges.find((e) => e.to === to);
      if (edge) totalDistance += edge.distance;
    }

    return {
      path,
      totalCost: distances.get(endNode.id)!,
      totalDistance,
    };
  }

  /**
   * Clone graph for alternative route processing
   */
  private cloneGraph(graph: Graph): Graph {
    const nodes = new Map<string, Node>(graph.nodes);
    const edges = new Map<string, Edge[]>();
    graph.edges.forEach((edgeList, key) => {
      edges.set(key, edgeList.map(e => ({ ...e })));
    });
    return { nodes, edges };
  }

  /**
   * Calculate primary and alternative routes
   */
  async calculateRoute(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
  ) {
    try {
      // Build original graph
      const originalGraph = await this.buildGraph();

      // Find nearest nodes
      const startNode = this.findNearestNode(startLat, startLon, originalGraph.nodes);
      const endNode = this.findNearestNode(endLat, endLon, originalGraph.nodes);

      if (!startNode || !endNode) {
        throw new Error('Could not find nearby roads');
      }

      // 1. Run Dijkstra for Primary Route
      const primaryResult = this.dijkstra(originalGraph, startNode, endNode);

      if (!primaryResult) {
        throw new Error('No route found');
      }

      // 2. Prepare graph for Alternative Route (Yen's subset / Edge Penalty)
      const altGraph = this.cloneGraph(originalGraph);
      
      // Penalize the edges heavily that were used in the primary route
      for (let i = 0; i < primaryResult.path.length - 1; i++) {
        const from = primaryResult.path[i];
        const to = primaryResult.path[i + 1];
        
        const edgesFrom = altGraph.edges.get(from);
        if (edgesFrom) {
          const edge = edgesFrom.find(e => e.to === to);
          if (edge) edge.cost *= 10; // 10x penalty to force algorithm to find a different path
        }
        
        const edgesTo = altGraph.edges.get(to);
        if (edgesTo) {
          const edgeRev = edgesTo.find(e => e.to === from);
          if (edgeRev) edgeRev.cost *= 10;
        }
      }

      // Run Dijkstra for Alternative Route
      const altResult = this.dijkstra(altGraph, startNode, endNode);

      // 3. Build GeoJSON lines
      const formatRoute = (result: typeof primaryResult, type: string) => {
        const coordinates: number[][] = [];
        result.path.forEach((nodeId) => {
          const node = originalGraph.nodes.get(nodeId)!;
          coordinates.push([node.lon, node.lat]);
        });

        // Time roughly based on km holding average 40km/h regardless of overlay weight
        const totalMinutes = (result.totalDistance / 1000.0 / 40.0) * 60;

        return {
          type: 'Feature',
          properties: {
            routeId: type,
            totalDistance: Math.round(result.totalDistance),
            totalTime: Math.round(totalMinutes),
            segments: result.path.length - 1,
            overlayScore: Math.round(result.totalCost),
          },
          geometry: {
            type: 'LineString',
            coordinates,
          },
          segments: [],
        };
      };

      const primaryFeature = formatRoute(primaryResult, 'PRIMARY');
      
      const routes = [primaryFeature];
      
      // Include alternative route if it exists and is significantly different
      if (altResult && altResult.totalCost < Infinity) {
        const altFeature = formatRoute(altResult, 'ALTERNATIVE');
        routes.push(altFeature);
      }

      // Return FeatureCollection with primary and alternative routes
      return {
        type: 'FeatureCollection',
        properties: primaryFeature.properties,
        features: routes
      };

    } catch (error) {
      console.error('Error calculating route:', error);
      throw error;
    }
  }
}
