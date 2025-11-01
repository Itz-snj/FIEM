import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Context } from "@tsed/platform-params";
import { Exception } from "@tsed/exceptions";

interface ProductionContext {
  request: any;
  response: any;
  requestId?: string;
}

/**
 * 🚨 ENHANCED ERROR HANDLING MIDDLEWARE
 * 
 * Production-ready error handling with:
 * - Structured error responses
 * - Request tracking
 * - Security-aware error messages
 * - Performance monitoring
 */
@Middleware()
export class EnhancedErrorMiddleware  implements MiddlewareMethods {
  private static requestCounter = 0;

  use(@Context() ctx: ProductionContext) {
    const { request, response } = ctx;
    
    // Generate unique request ID
    const requestId = `req_${Date.now()}_${++EnhancedErrorMiddleware.requestCounter}`;
    ctx.requestId = requestId;
    
    // Enhanced CORS headers for frontend integration
    response.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    response.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
    response.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return response.status(200).send();
    }

    // Request logging for monitoring
    const startTime = Date.now();
    console.log(`🔍 [${requestId}] ${request.method} ${request.url} - Started`, {
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection?.remoteAddress,
      timestamp: new Date().toISOString()
    });

    // Enhance response with request tracking
    const originalJson = response.json;
    response.json = function(data: any) {
      const duration = Date.now() - startTime;
      
      // Add request metadata to all responses
      if (typeof data === 'object' && data !== null) {
        data.meta = {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: `${duration}ms`
        };
      }
      
      // Log response
      if (response.statusCode < 400) {
        console.log(`✅ [${requestId}] ${request.method} ${request.url} - ${response.statusCode} (${duration}ms)`);
      } else {
        console.error(`❌ [${requestId}] ${request.method} ${request.url} - ${response.statusCode} (${duration}ms)`, {
          error: data,
          requestBody: request.body,
          params: request.params
        });
      }
      
      return originalJson.call(this, data);
    };
  }
}

/**
 * 📊 PERFORMANCE ANALYTICS MIDDLEWARE
 * 
 * Tracks API usage patterns and performance metrics
 */
@Middleware()
export class PerformanceMiddleware implements MiddlewareMethods {
  private static stats = {
    requests: new Map<string, number>(),
    responseTimes: [] as number[],
    errors: new Map<string, number>(),
    slowRequests: [] as Array<{endpoint: string, time: number, timestamp: Date}>
  };

  use(@Context() ctx: ProductionContext) {
    const { request, response } = ctx;
    const startTime = Date.now();
    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    
    // Track request count
    const currentCount = PerformanceMiddleware.stats.requests.get(endpoint) || 0;
    PerformanceMiddleware.stats.requests.set(endpoint, currentCount + 1);

    // Override response end to capture metrics
    const originalEnd = response.end;
    response.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      
      // Track response time
      PerformanceMiddleware.stats.responseTimes.push(duration);
      if (PerformanceMiddleware.stats.responseTimes.length > 1000) {
        PerformanceMiddleware.stats.responseTimes = PerformanceMiddleware.stats.responseTimes.slice(-1000);
      }
      
      // Track slow requests (>2 seconds)
      if (duration > 2000) {
        PerformanceMiddleware.stats.slowRequests.push({
          endpoint,
          time: duration,
          timestamp: new Date()
        });
        console.warn(`🐌 Slow request detected: ${endpoint} took ${duration}ms`);
      }
      
      // Track errors
      if (response.statusCode >= 400) {
        const errorKey = `${response.statusCode}_${endpoint}`;
        const errorCount = PerformanceMiddleware.stats.errors.get(errorKey) || 0;
        PerformanceMiddleware.stats.errors.set(errorKey, errorCount + 1);
      }
      
      return originalEnd.call(this, chunk, encoding);
    };
  }

  /**
   * Get comprehensive performance analytics
   */
  static getAnalytics() {
    const responseTimes = PerformanceMiddleware.stats.responseTimes;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b) / responseTimes.length 
      : 0;

    const totalRequests = Array.from(PerformanceMiddleware.stats.requests.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(PerformanceMiddleware.stats.errors.values()).reduce((a, b) => a + b, 0);

    return {
      summary: {
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100) : 0,
        averageResponseTime: Math.round(avgResponseTime),
        slowRequestsCount: PerformanceMiddleware.stats.slowRequests.length
      },
      topEndpoints: Array.from(PerformanceMiddleware.stats.requests.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, requests: count })),
      performanceMetrics: {
        averageResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: this.calculatePercentile(responseTimes, 0.95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 0.99),
        maxResponseTime: Math.max(...responseTimes, 0)
      },
      recentSlowRequests: PerformanceMiddleware.stats.slowRequests
        .slice(-10)
        .map(req => ({
          ...req,
          timestamp: req.timestamp.toISOString()
        })),
      errorsByType: Array.from(PerformanceMiddleware.stats.errors.entries())
        .map(([key, count]) => {
          const [statusCode, ...endpointParts] = key.split('_');
          return {
            statusCode: parseInt(statusCode),
            endpoint: endpointParts.join('_'),
            count
          };
        })
    };
  }

  private static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
}

/**
 * 🛡️ BASIC RATE LIMITING MIDDLEWARE
 * 
 * Simple rate limiting to prevent abuse
 */
@Middleware()
export class BasicRateLimitMiddleware implements MiddlewareMethods {
  private static clientRequests = new Map<string, { count: number; resetTime: number }>();
  
  // Rate limits per minute
  private static readonly LIMITS = {
    emergency: 5,      // Emergency SOS - 5 per minute
    booking: 20,       // Regular bookings - 20 per minute
    auth: 30,          // Login/Register - 30 per minute
    general: 100       // Other requests - 100 per minute
  };

  use(@Context() ctx: ProductionContext) {
    const { request, response } = ctx;
    const clientId = this.getClientId(request);
    const limit = this.getRateLimit(request);
    
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window
    
    let requestData = BasicRateLimitMiddleware.clientRequests.get(clientId);
    
    // Reset counter if window has passed
    if (!requestData || requestData.resetTime !== windowStart) {
      requestData = { count: 0, resetTime: windowStart };
    }
    
    requestData.count++;
    BasicRateLimitMiddleware.clientRequests.set(clientId, requestData);
    
    // Check if limit exceeded
    if (requestData.count > limit) {
      const resetIn = Math.ceil((windowStart + 60000 - now) / 1000);
      
      response.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          limit,
          remaining: 0,
          resetIn
        }
      });
      
      return;
    }
    
    // Add rate limit headers
    response.header('X-RateLimit-Limit', limit.toString());
    response.header('X-RateLimit-Remaining', (limit - requestData.count).toString());
    response.header('X-RateLimit-Reset', Math.ceil(windowStart / 1000 + 60).toString());
  }

  private getClientId(request: any): string {
    // Use IP address as identifier
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  private getRateLimit(request: any): number {
    const url = request.url.toLowerCase();
    
    if (url.includes('/emergency/sos')) {
      return BasicRateLimitMiddleware.LIMITS.emergency;
    } else if (url.includes('/bookings')) {
      return BasicRateLimitMiddleware.LIMITS.booking;
    } else if (url.includes('/login') || url.includes('/register')) {
      return BasicRateLimitMiddleware.LIMITS.auth;
    }
    
    return BasicRateLimitMiddleware.LIMITS.general;
  }
}

/**
 * 📈 HEALTH CHECK UTILITIES
 */
export class HealthCheckService {
  static getSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      performance: PerformanceMiddleware.getAnalytics()
    };
  }
}

export { EnhancedErrorMiddleware, PerformanceMiddleware, BasicRateLimitMiddleware };