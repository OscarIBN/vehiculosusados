import { register, Counter, Histogram, Gauge } from 'prom-client';
import { MetricsData } from '@/types';

export class MetricsService {
  private requestCounter: Counter;
  private requestDuration: Histogram;
  private activeConnections: Gauge;
  private cacheHitCounter: Counter;
  private cacheMissCounter: Counter;
  private vehicleCounter: Counter;
  private orderCounter: Counter;
  private userCounter: Counter;
  private errorCounter: Counter;

  constructor() {
    // Request metrics
    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.requestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    // Connection metrics
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
    });

    // Cache metrics
    this.cacheHitCounter = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
    });

    this.cacheMissCounter = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
    });

    // Business metrics
    this.vehicleCounter = new Counter({
      name: 'vehicles_total',
      help: 'Total number of vehicles',
    });

    this.orderCounter = new Counter({
      name: 'orders_total',
      help: 'Total number of orders',
    });

    this.userCounter = new Counter({
      name: 'users_total',
      help: 'Total number of users',
    });

    // Error metrics
    this.errorCounter = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'route'],
    });

    // Register all metrics
    register.registerMetric(this.requestCounter);
    register.registerMetric(this.requestDuration);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.cacheHitCounter);
    register.registerMetric(this.cacheMissCounter);
    register.registerMetric(this.vehicleCounter);
    register.registerMetric(this.orderCounter);
    register.registerMetric(this.userCounter);
    register.registerMetric(this.errorCounter);
  }

  // Request tracking
  recordRequest(method: string, route: string, status: number, duration: number): void {
    this.requestCounter.inc({ method, route, status });
    this.requestDuration.observe({ method, route }, duration);
  }

  // Connection tracking
  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  // Cache tracking
  recordCacheHit(): void {
    this.cacheHitCounter.inc();
  }

  recordCacheMiss(): void {
    this.cacheMissCounter.inc();
  }

  // Business metrics
  recordVehicleCreated(): void {
    this.vehicleCounter.inc();
  }

  recordOrderCreated(): void {
    this.orderCounter.inc();
  }

  recordUserCreated(): void {
    this.userCounter.inc();
  }

  // Error tracking
  recordError(type: string, route: string): void {
    this.errorCounter.inc({ type, route });
  }

  // Get cache hit rate
  async getCacheHitRate(): Promise<number> {
    const hits = await this.cacheHitCounter.get();
    const misses = await this.cacheMissCounter.get();
    const total = (hits.values[0]?.value || 0) + (misses.values[0]?.value || 0);
    return total > 0 ? (hits.values[0]?.value || 0) / total : 0;
  }

  // Get average request latency
  async getAverageLatency(): Promise<number> {
    const histogram = await this.requestDuration.get();
    const sum = histogram.values.reduce((acc, val) => acc + val.value, 0);
    const count = histogram.values.reduce((acc, val) => acc + (val as any).count, 0);
    return count > 0 ? sum / count : 0;
  }

  // Get metrics as JSON
  async getMetricsData(): Promise<MetricsData> {
    const cacheHitRate = await this.getCacheHitRate();
    const requestLatency = await this.getAverageLatency();

    return {
      totalVehicles: 0, // Will be populated from database
      totalOrders: 0,   // Will be populated from database
      totalUsers: 0,    // Will be populated from database
      averageOrderValue: 0, // Will be populated from database
      cacheHitRate,
      requestLatency,
    };
  }

  // Get Prometheus metrics
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Reset metrics (useful for testing)
  reset(): void {
    register.clear();
  }
}

export const metricsService = new MetricsService(); 