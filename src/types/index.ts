export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  description?: string;
  mainPhoto?: string;
  technicalSpecs: TechnicalSpecs;
  status: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicalSpecs {
  engine: string;
  transmission: string;
  fuelType: string;
  color: string;
  doors: number;
  seats: number;
  power?: number; // in HP
  displacement?: number; // in cc
}

export enum VehicleStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance'
}

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  SALES = 'sales',
  CUSTOMER = 'customer'
}

export interface Order {
  id: string;
  vehicleId: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  downPayment?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface VehicleFilters {
  brand?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMax?: number;
  status?: VehicleStatus;
}

export interface VehicleListResponse {
  vehicles: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface PriceUpdate {
  vehicleId: string;
  newPrice: number;
  timestamp: Date;
}

export interface MetricsData {
  totalVehicles: number;
  totalOrders: number;
  totalUsers: number;
  averageOrderValue: number;
  cacheHitRate: number;
  requestLatency: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  dependencies: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
  };
  metrics: MetricsData;
} 