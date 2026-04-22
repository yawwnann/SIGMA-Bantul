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
        vulnerability,
        "bpbdRiskLevel",
        "bpbdRiskScore",
        "combinedHazard",
        safe_cost,
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

      // Calculate edge cost using combined hazard if available
      const distance = road.length_m || 0;
      const cost = this.calculateEdgeCost(road, distance);

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

      edges.get(startId).push(edge1);
      edges.get(endId).push(edge2);
    });

    return { nodes, edges };
  }

  /**
   * Calculate edge cost for routing
   * Uses combined hazard (frequency + BPBD) if available, otherwise falls back to legacy calculation
   * Formula: cost = distance * (1 + combinedHazard * 0.5 + conditionFactor * 0.3)
   * This matches the pgRouting safe_cost calculation
   *
   * @param road - Road object with hazard and condition data
   * @param distance - Road length in meters
   * @returns Weighted cost for routing
   */
  private calculateEdgeCost(road: any, distance: number): number {
    // Use safe_cost if already calculated (matches pgRouting)
    if (road.safe_cost && road.safe_cost > 0) {
      return road.safe_cost;
    }

    // Use combined hazard if available (includes BPBD risk)
    if (road.combinedHazard) {
      const hazardFactor = road.combinedHazard * 0.5;
      const conditionFactor = this.getConditionMultiplier(road.condition);
      return distance * (1 + hazardFactor + conditionFactor * 0.3);
    }

    // Legacy calculation (backward compatibility)
    let weightMultiplier = 1.0;

    // Road Condition Factor
    if (road.condition === 'MODERATE') weightMultiplier += 0.3;
    else if (road.condition === 'POOR') weightMultiplier += 0.7;
    else if (road.condition === 'DAMAGED') weightMultiplier += 2.0;

    // Vulnerability (Hazard) Factor
    if (road.vulnerability === 'MEDIUM') weightMultiplier += 0.3;
    else if (road.vulnerability === 'HIGH') weightMultiplier += 0.7;
    else if (road.vulnerability === 'CRITICAL') weightMultiplier += 2.0;

    return distance * weightMultiplier;
  }

  /**
   * Get condition multiplier for cost calculation
   */
  private getConditionMultiplier(condition: string): number {
    const multipliers: Record<string, number> = {
      GOOD: 0,
      MODERATE: 0.3,
      POOR: 0.7,
      DAMAGED: 2.0,
    };
    return multipliers[condition] || 0;
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
        const dist = distances.get(nodeId);
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

        const alt = distances.get(current) + edge.cost;
        if (alt < distances.get(edge.to)) {
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
      totalCost: distances.get(endNode.id),
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
      edges.set(
        key,
        edgeList.map((e) => ({ ...e })),
      );
    });
    return { nodes, edges };
  }

  /**
   * Get road geometry by roadId
   */
  private async getRoadGeometry(roadId: number): Promise<number[][]> {
    const road = await this.prisma.$queryRaw<any[]>`
      SELECT ST_AsGeoJSON(geom)::json as geometry
      FROM "Road"
      WHERE id = ${roadId}
    `;

    if (road.length === 0 || !road[0].geometry) {
      return [];
    }

    const geom = road[0].geometry;
    if (geom.type === 'LineString') {
      return geom.coordinates;
    }
    if (geom.type === 'MultiLineString' && geom.coordinates.length > 0) {
      return geom.coordinates[0];
    }
    return [];
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
      const startNode = this.findNearestNode(
        startLat,
        startLon,
        originalGraph.nodes,
      );
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
          const edge = edgesFrom.find((e) => e.to === to);
          if (edge) edge.cost *= 10; // 10x penalty to force algorithm to find a different path
        }

        const edgesTo = altGraph.edges.get(to);
        if (edgesTo) {
          const edgeRev = edgesTo.find((e) => e.to === from);
          if (edgeRev) edgeRev.cost *= 10;
        }
      }

      // Run Dijkstra for Alternative Route
      const altResult = this.dijkstra(altGraph, startNode, endNode);

      // 3. Build GeoJSON lines with actual road geometry
      const formatRoute = async (
        result: typeof primaryResult,
        type: string,
      ) => {
        const coordinates: number[][] = [];

        // Add start point
        coordinates.push([startLon, startLat]);

        // For each segment in the path, get the actual road geometry
        for (let i = 0; i < result.path.length - 1; i++) {
          const from = result.path[i];
          const to = result.path[i + 1];

          // Find the edge (road) between these nodes
          const edges = originalGraph.edges.get(from) || [];
          const edge = edges.find((e) => e.to === to);

          if (edge && edge.roadId) {
            // Get the actual road geometry
            const roadCoords = await this.getRoadGeometry(edge.roadId);

            if (roadCoords.length > 0) {
              // Check if we need to reverse the coordinates
              const fromNode = originalGraph.nodes.get(from);
              const firstCoord = roadCoords[0];
              const lastCoord = roadCoords[roadCoords.length - 1];

              // Calculate distances to determine direction
              const distToFirst = this.haversineDistance(
                fromNode.lat,
                fromNode.lon,
                firstCoord[1],
                firstCoord[0],
              );
              const distToLast = this.haversineDistance(
                fromNode.lat,
                fromNode.lon,
                lastCoord[1],
                lastCoord[0],
              );

              // Add coordinates in correct direction
              if (distToFirst < distToLast) {
                // Use coordinates as-is
                roadCoords.forEach((coord) => coordinates.push(coord));
              } else {
                // Reverse coordinates
                roadCoords
                  .slice()
                  .reverse()
                  .forEach((coord) => coordinates.push(coord));
              }
            }
          }
        }

        // Add end point
        coordinates.push([endLon, endLat]);

        // Remove duplicate consecutive points
        const uniqueCoords = coordinates.filter((coord, index) => {
          if (index === 0) return true;
          const prev = coordinates[index - 1];
          return coord[0] !== prev[0] || coord[1] !== prev[1];
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
            coordinates: uniqueCoords,
          },
          segments: [],
        };
      };

      const primaryFeature = await formatRoute(primaryResult, 'PRIMARY');

      const routes = [primaryFeature];

      // Include alternative route if it exists and is significantly different
      if (altResult && altResult.totalCost < Infinity) {
        const altFeature = await formatRoute(altResult, 'ALTERNATIVE');
        routes.push(altFeature);
      }

      // Return FeatureCollection with primary and alternative routes
      return {
        type: 'FeatureCollection',
        properties: primaryFeature.properties,
        features: routes,
      };
    } catch (error) {
      console.error('Error calculating route:', error);
      throw error;
    }
  }
}
