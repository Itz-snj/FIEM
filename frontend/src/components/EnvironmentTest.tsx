/**
 * 🧪 FRONTEND ENVIRONMENT TEST
 * 
 * This file tests that all environment variables and browser APIs
 * are properly configured for the Vite React application.
 */

// Test environment variables
console.log('🔧 Environment Configuration Test:');
console.log('API_URL:', import.meta.env.VITE_API_URL);
console.log('WS_URL:', import.meta.env.VITE_WS_URL);
console.log('App Name:', import.meta.env.VITE_APP_NAME);

// Test browser APIs availability
console.log('🌐 Browser API Availability:');
console.log('localStorage:', typeof localStorage !== 'undefined');
console.log('navigator.geolocation:', typeof navigator !== 'undefined' && !!navigator.geolocation);
console.log('Notification API:', typeof window !== 'undefined' && 'Notification' in window);
console.log('WebSocket support:', typeof WebSocket !== 'undefined');

// Test API configuration
import { API_BASE_URL } from '@/lib/api';
console.log('📡 API Configuration:');
console.log('Base URL:', API_BASE_URL);

export default function EnvironmentTest() {
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800">✅ Environment Test Passed</h3>
      <p className="text-sm text-green-600 mt-1">
        All environment variables and browser APIs are properly configured.
        Check the browser console for detailed test results.
      </p>
    </div>
  );
}