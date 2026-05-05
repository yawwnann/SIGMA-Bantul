"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Database,
  Zap,
  Clock,
  Server,
  HardDrive,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Pause,
  Play,
} from "lucide-react";

interface PerformanceMetric {
  timestamp: string;
  redisLatency: number;
  databaseLatency: number;
  systemUptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface MonitoringData {
  health: {
    status: string;
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    services: {
      redis: { status: string; latency: number };
      database: { status: string; latency: number };
    };
  };
  performance: PerformanceMetric[];
  redis: {
    connected: boolean;
    latency: number;
    totalKeys: number;
    avgLatency: number;
    maxLatency: number;
  };
  database: {
    connected: boolean;
    latency: number;
    avgLatency: number;
    maxLatency: number;
    size: string;
    activeConnections: number;
    topTables: Array<{ name: string; rows: number }>;
  };
  userAccess: {
    activeSessions: number;
    usersByRole: Array<{ role: string; count: number }>;
    totalRequests: number;
    requestsPerMinute: number;
  };
  requestHistory: Array<{ timestamp: string; count: number }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/monitoring/metrics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-zinc-400">Gagal memuat data monitoring</p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const chartData = data.performance.map((metric) => ({
    time: formatTime(metric.timestamp),
    redis: metric.redisLatency,
    database: metric.databaseLatency,
    memory: metric.memoryUsage.percentage,
  }));

  const requestChartData = data.requestHistory.map((point) => ({
    time: formatTime(point.timestamp),
    requests: point.count,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-50">
              Monitoring Kinerja Sistem
            </h1>
            <p className="text-zinc-400 mt-2 text-sm md:text-base">
              Real-time monitoring performa dan kesehatan sistem
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                autoRefresh
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/30"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              {autoRefresh ? (
                <>
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">Auto Refresh: ON</span>
                  <span className="sm:hidden">Auto ON</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  <span className="hidden sm:inline">Auto Refresh: OFF</span>
                  <span className="sm:hidden">Auto OFF</span>
                </>
              )}
            </button>
            <button
              onClick={fetchData}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* System Health Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-zinc-400 mb-1">
                  Status Sistem
                </p>
                <p className="text-xl md:text-2xl font-bold text-zinc-50">
                  {data.health.status === "healthy" ? (
                    <span className="text-green-500 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6" />
                      Sehat
                    </span>
                  ) : (
                    <span className="text-yellow-500 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 md:h-6 md:w-6" />
                      Degraded
                    </span>
                  )}
                </p>
              </div>
              <Activity className="h-8 w-8 md:h-10 md:w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-zinc-400 mb-1">Uptime</p>
                <p className="text-xl md:text-2xl font-bold text-zinc-50">
                  {formatUptime(data.health.uptime)}
                </p>
              </div>
              <Clock className="h-8 w-8 md:h-10 md:w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-zinc-400 mb-1">
                  Memory Usage
                </p>
                <p className="text-xl md:text-2xl font-bold text-zinc-50">
                  {data.health.memory.percentage}%
                </p>
                <p className="text-[10px] md:text-xs text-zinc-500 mt-1">
                  {data.health.memory.used}MB / {data.health.memory.total}MB
                </p>
                <p className="text-[9px] md:text-[10px] text-zinc-600 mt-1 italic">
                  Node.js heap memory
                </p>
              </div>
              <HardDrive className="h-8 w-8 md:h-10 md:w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-zinc-400 mb-1">
                  API Requests
                </p>
                <p className="text-xl md:text-2xl font-bold text-zinc-50">
                  {data.userAccess.requestsPerMinute}
                </p>
                <p className="text-[10px] md:text-xs text-zinc-500 mt-1">
                  requests per minute
                </p>
              </div>
              <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Latency Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Redis & Database Latency */}
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800">
            <h2 className="text-base md:text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              <span className="text-sm md:text-base">
                Latency Redis & Database (ms)
              </span>
            </h2>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={220} minWidth={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line
                    type="monotone"
                    dataKey="redis"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Redis"
                    dot={{ fill: "#3b82f6", r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="database"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Database"
                    dot={{ fill: "#10b981", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800">
            <h2 className="text-base md:text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-2">
              <HardDrive className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
              <span className="text-sm md:text-base">Memory Usage (%)</span>
            </h2>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={220} minWidth={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    name="Memory"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* API Request Chart */}
        <div className="mb-6 md:mb-8">
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800">
            <h2 className="text-base md:text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
              <span className="text-sm md:text-base">
                API Requests per Minute (Last 5 Minutes)
              </span>
            </h2>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={220} minWidth={300}>
                <AreaChart data={requestChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.6}
                    name="Requests"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Redis Stats */}
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800">
            <h2 className="text-base md:text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
              <span className="text-sm md:text-base">Redis Statistics</span>
            </h2>
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">Status</span>
                <span
                  className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                    data.redis.connected
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {data.redis.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Current Latency
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.redis.latency}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Average Latency
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.redis.avgLatency}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Max Latency
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.redis.maxLatency}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Total Keys
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.redis.totalKeys}
                </span>
              </div>
            </div>
          </div>

          {/* Database Stats */}
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800">
            <h2 className="text-base md:text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
              <span className="text-sm md:text-base">Database Statistics</span>
            </h2>
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">Status</span>
                <span
                  className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                    data.database.connected
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {data.database.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Current Latency
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.database.latency}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Average Latency
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.database.avgLatency}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Max Latency
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.database.maxLatency}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Database Size
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.database.size}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-zinc-400">
                  Active Connections
                </span>
                <span className="font-semibold text-sm md:text-base text-zinc-100">
                  {data.database.activeConnections}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* API Activity & Database Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {/* API Request Activity */}
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800">
            <h2 className="text-base md:text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
              <span className="text-sm md:text-base">API Request Activity</span>
            </h2>
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center py-2 md:py-3 px-3 md:px-4 bg-zinc-900/50 rounded-lg border border-zinc-800/40">
                <span className="text-xs md:text-sm text-zinc-400">
                  Total Requests
                </span>
                <span className="font-semibold text-zinc-100 text-base md:text-lg">
                  {data.userAccess.totalRequests.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 md:py-3 px-3 md:px-4 bg-zinc-900/50 rounded-lg border border-zinc-800/40">
                <span className="text-xs md:text-sm text-zinc-400">
                  Requests per Minute
                </span>
                <span className="font-semibold text-zinc-100 text-base md:text-lg">
                  {data.userAccess.requestsPerMinute}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 md:py-3 px-3 md:px-4 bg-zinc-900/50 rounded-lg border border-zinc-800/40">
                <span className="text-xs md:text-sm text-zinc-400">
                  Average Response Time
                </span>
                <span className="font-semibold text-zinc-100 text-base md:text-lg">
                  {(
                    (data.redis.avgLatency + data.database.avgLatency) /
                    2
                  ).toFixed(0)}
                  ms
                </span>
              </div>

              {/* Request Rate Indicator */}
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-linear-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm text-zinc-300 font-medium">
                    Request Rate
                  </span>
                  <span
                    className={`text-xs md:text-sm font-bold ${
                      data.userAccess.requestsPerMinute > 50
                        ? "text-green-400"
                        : data.userAccess.requestsPerMinute > 20
                          ? "text-yellow-400"
                          : "text-zinc-400"
                    }`}
                  >
                    {data.userAccess.requestsPerMinute > 50
                      ? "High"
                      : data.userAccess.requestsPerMinute > 20
                        ? "Medium"
                        : "Low"}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      data.userAccess.requestsPerMinute > 50
                        ? "bg-green-500"
                        : data.userAccess.requestsPerMinute > 20
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min((data.userAccess.requestsPerMinute / 100) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Database Tables */}
          <div className="bg-zinc-900 rounded-xl shadow-lg p-4 md:p-6 border border-zinc-800">
            <h2 className="text-base md:text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              <span className="text-sm md:text-base">Top Database Tables</span>
            </h2>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={220} minWidth={300}>
                <BarChart data={data.database.topTables}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="#71717a"
                    fontSize={9}
                  />
                  <YAxis stroke="#71717a" fontSize={11} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="rows" fill="#3b82f6" name="Rows" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
