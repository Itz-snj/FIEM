import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Context } from "@tsed/platform-params";
import { Unauthorized, BadRequest } from "@tsed/exceptions";
import { UserRole } from "../models/User.js";

export interface AuthenticatedContext {
  request: any;
  response: any;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    status: string;
  };
}

@Middleware()
export class AuthMiddleware implements MiddlewareMethods {
  use(@Context() ctx: AuthenticatedContext) {
    const token = this.extractToken(ctx.request);
    
    if (!token) {
      throw new Unauthorized("Authentication token required");
    }

    try {
      // TODO: Replace with actual JWT verification once jsonwebtoken is installed
      // For now, we'll create a mock verification
      const decoded = this.verifyToken(token);
      ctx.user = decoded;
    } catch (error) {
      throw new Unauthorized("Invalid or expired token");
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check for token in cookies
    if (request.cookies && request.cookies.token) {
      return request.cookies.token;
    }
    
    return null;
  }

  private verifyToken(token: string): any {
    // TODO: Implement actual JWT verification
    // const jwt = require('jsonwebtoken');
    // return jwt.verify(token, process.env.JWT_SECRET);
    
    // Mock verification for now
    if (token === 'mock-valid-token') {
      return {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: UserRole.USER,
        status: 'active'
      };
    }
    
    throw new Error('Invalid token');
  }
}

// Role-based access control decorator
export function RequireRole(...roles: UserRole[]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      const ctx = args[0] as AuthenticatedContext;
      
      if (!ctx.user) {
        throw new Unauthorized("Authentication required");
      }
      
      if (roles.length > 0 && !roles.includes(ctx.user.role)) {
        throw new Unauthorized(`Access denied. Required roles: ${roles.join(', ')}`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}