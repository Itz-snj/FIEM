# 🚑 UBER-FOR-AMBULANCE FRONTEND DEVELOPMENT PROMPT

## 📋 PROJECT OVERVIEW

Create a **professional, minimalist, and highly functional frontend application** for an "Uber-for-Ambulance" emergency medical services platform. This application should provide seamless interfaces for **4 distinct user types** with role-based access, real-time updates, comprehensive analytics, and emergency response capabilities.

## 🎯 CORE REQUIREMENTS

### **Technology Stack**
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand or Redux Toolkit
- **Real-time**: Socket.io client for live updates
- **Maps**: Google Maps API or Mapbox for location services
- **Charts**: Chart.js or Recharts for analytics
- **Authentication**: JWT-based auth with role-based access control
- **API**: RESTful backend (already provided) at `http://localhost:8083/rest`

### **Design Philosophy**
- **Minimalist & Clean**: White/light backgrounds, subtle shadows, clean typography
- **Professional**: Medical-grade reliability feel, trustworthy interface
- **Mobile-First**: Responsive design that works perfectly on all devices
- **Accessibility**: WCAG 2.1 AA compliant, keyboard navigation, screen reader support
- **Fast Loading**: Optimized performance, lazy loading, efficient data fetching

## 👥 USER ROLES & INTERFACES

### **1. PATIENT/USER INTERFACE** (`role: "user"`)

#### **Core Features**:
- **Emergency SOS Button**: Large, prominent red button for instant ambulance booking
- **Book Ambulance**: Form with pickup location, destination, patient details, priority level
- **Track Ambulance**: Real-time map showing driver location, estimated arrival time
- **Medical Profile**: Store medical conditions, allergies, emergency contacts
- **Booking History**: Past bookings with status, invoices, and feedback options
- **Hospital Search**: Find nearby hospitals by specialty, insurance acceptance

#### **Dashboard Layout**:
```
[Emergency SOS - Large Red Button]
[Quick Book Ambulance Card]
[Active Booking Status (if any)]
[Recent Bookings History]
[Medical Profile Summary]
```

#### **Key Pages**:
- `/dashboard` - Main patient dashboard
- `/book` - Ambulance booking form
- `/track/:bookingId` - Live tracking page
- `/history` - Booking history
- `/profile` - Medical profile management
- `/hospitals` - Hospital search & info

---

### **2. DRIVER INTERFACE** (`role: "driver"`)

#### **Core Features**:
- **Go Online/Offline**: Toggle availability with location sharing
- **Accept Bookings**: Incoming booking notifications with patient details
- **Navigation**: Integrated maps for pickup and hospital routes
- **Status Updates**: Update booking status (en route, arrived, picked up, etc.)
- **Earnings Dashboard**: Daily, weekly, monthly earnings with breakdowns
- **Performance Analytics**: Response time, ratings, distance traveled
- **Emergency Mode**: Priority alerts for critical emergencies

#### **Dashboard Layout**:
```
[Online Status Toggle]
[Current Booking Card (if active)]
[Incoming Booking Notifications]
[Today's Statistics - Rides, Earnings, Rating]
[Performance Charts]
[Emergency Alerts Section]
```

#### **Key Pages**:
- `/driver/dashboard` - Main driver dashboard
- `/driver/bookings` - Active and pending bookings
- `/driver/navigate/:bookingId` - GPS navigation view
- `/driver/earnings` - Detailed earnings report
- `/driver/profile` - Driver profile & vehicle info
- `/driver/statistics` - Performance analytics

---

### **3. HOSPITAL INTERFACE** (`role: "hospital"`)

#### **Core Features**:
- **Bed Management**: Real-time bed availability by department/type
- **Incoming Ambulances**: Live feed of incoming patients with ETAs
- **Capacity Dashboard**: Occupancy rates, department status, alerts
- **Patient Handover**: Digital forms for ambulance-to-hospital transfers
- **Emergency Notifications**: Critical incoming patients, capacity alerts
- **Department Analytics**: Utilization rates, patient flow statistics

#### **Dashboard Layout**:
```
[Hospital Capacity Overview]
[Incoming Ambulances Feed]
[Bed Availability by Department]
[Today's Admissions Statistics]
[Emergency Alerts & Notifications]
[Department Performance Charts]
```

#### **Key Pages**:
- `/hospital/dashboard` - Main hospital overview
- `/hospital/incoming` - Incoming ambulances tracker
- `/hospital/beds` - Bed management system
- `/hospital/departments` - Department-wise analytics
- `/hospital/patients` - Patient handover system
- `/hospital/analytics` - Comprehensive hospital analytics

---

### **4. EMERGENCY EXECUTIVE INTERFACE** (`role: "emergency_executive"`)

#### **Core Features**:
- **City-Wide Dashboard**: Real-time overview of all emergency activities
- **Dispatch Control**: Manual override, resource allocation, emergency broadcasts
- **Resource Management**: Driver availability, ambulance distribution, hospital capacity
- **Analytics Hub**: System performance, response times, coverage analysis
- **Emergency Coordination**: Multi-agency communication, disaster response
- **System Monitoring**: Live system health, real-time connections, alerts

#### **Dashboard Layout**:
```
[System Status Overview - KPIs]
[Live Emergency Map - City View]
[Active Bookings Feed]
[Resource Availability Summary]
[Critical Alerts & Notifications]
[Performance Analytics Grid]
```

#### **Key Pages**:
- `/executive/dashboard` - Command center overview
- `/executive/dispatch` - Live dispatch management
- `/executive/resources` - Resource allocation & monitoring
- `/executive/analytics` - Comprehensive system analytics
- `/executive/emergency` - Emergency coordination tools
- `/executive/system` - System health monitoring

## 🎨 DESIGN SPECIFICATIONS

### **Color Palette**:
```css
/* Primary Colors */
--emergency-red: #EF4444      /* Emergency buttons, critical alerts */
--medical-blue: #3B82F6       /* Primary actions, links */
--success-green: #10B981      /* Completed status, success states */
--warning-orange: #F59E0B     /* Warnings, pending states */

/* Neutral Colors */
--white: #FFFFFF              /* Background, cards */
--gray-50: #F9FAFB           /* Light background */
--gray-100: #F3F4F6          /* Border, dividers */
--gray-600: #4B5563          /* Secondary text */
--gray-900: #111827          /* Primary text */

/* Status Colors */
--status-requested: #F59E0B   /* Orange */
--status-assigned: #8B5CF6    /* Purple */
--status-enroute: #06B6D4     /* Cyan */
--status-arrived: #84CC16     /* Lime */
--status-completed: #22C55E   /* Green */
--status-cancelled: #EF4444   /* Red */
```

### **Typography**:
```css
/* Font Family: Inter or system fonts */
--font-heading: 'Inter', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
--text-3xl: 1.875rem  /* 30px */
--text-4xl: 2.25rem   /* 36px */
```

### **Component Design Patterns**:

#### **Emergency SOS Button**:
```jsx
// Large, prominent, always accessible
<button className="w-full h-20 bg-red-500 hover:bg-red-600 text-white text-2xl font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all">
  🚨 EMERGENCY SOS
</button>
```

#### **Status Badges**:
```jsx
// Color-coded booking status indicators
<span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
  Driver Assigned
</span>
```

#### **Real-time Updates**:
```jsx
// Live data indicators with pulsing animation
<div className="flex items-center space-x-2">
  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
  <span className="text-sm text-gray-600">Live</span>
</div>
```

## 📊 ANALYTICS & DATA VISUALIZATION

### **Driver Analytics Dashboard**:
- **Earnings Chart**: Line chart showing daily/weekly/monthly earnings
- **Performance Metrics**: Response time, distance traveled, ratings
- **Ride Statistics**: Total rides, completion rate, customer feedback
- **Heat Map**: Popular pickup/dropoff locations

### **Hospital Analytics Dashboard**:
- **Capacity Utilization**: Department-wise occupancy rates
- **Patient Flow**: Incoming/outgoing patient trends
- **Response Times**: Average ambulance-to-admission times
- **Equipment Status**: Bed availability, critical care capacity

### **Executive Command Center**:
- **System Overview**: City-wide emergency response metrics
- **Resource Distribution**: Real-time driver/ambulance locations
- **Performance KPIs**: Response times, coverage areas, efficiency
- **Predictive Analytics**: Demand forecasting, resource optimization

## 🔄 REAL-TIME FEATURES

### **Socket.io Integration**:
```javascript
// Real-time event handlers
socket.on('booking:status_updated', (data) => {
  // Update booking status in real-time
});

socket.on('driver:location_updated', (data) => {
  // Update driver position on map
});

socket.on('emergency:new_booking', (data) => {
  // Show emergency notification
});
```

### **Live Updates**:
- **Booking Status**: Real-time status changes for all users
- **Driver Location**: Live GPS tracking on maps
- **Hospital Capacity**: Real-time bed availability updates
- **Emergency Alerts**: Instant notifications for critical situations

## 📱 RESPONSIVE DESIGN

### **Mobile-First Approach**:
- **Breakpoints**: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- **Touch-Friendly**: Minimum 44px touch targets
- **Gesture Support**: Swipe actions, pull-to-refresh
- **Offline Capability**: Service worker for critical functions

### **Cross-Platform Compatibility**:
- **PWA Features**: Installable, push notifications, offline support
- **Performance**: <3s load time, <100ms interaction response
- **Accessibility**: Screen reader support, keyboard navigation, high contrast mode

## 🔐 AUTHENTICATION & SECURITY

### **Authentication Flow**:
```javascript
// Role-based routing example
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  
  return children;
};
```

### **Security Features**:
- **JWT Token Management**: Secure token storage, auto-refresh
- **Role-Based Access**: Granular permissions by user type
- **Data Encryption**: Sensitive medical data protection
- **Audit Logging**: User action tracking for compliance

## 🗺️ MAPS & LOCATION INTEGRATION

### **Map Components**:
- **Emergency Map**: Real-time ambulance locations, routes
- **Hospital Locator**: Nearby hospitals with specialties
- **Route Navigation**: Turn-by-turn directions for drivers
- **Coverage Map**: Service area visualization for executives

### **Location Features**:
- **GPS Tracking**: Real-time location updates
- **Geofencing**: Service area boundaries, emergency zones
- **Route Optimization**: Fastest path to hospitals
- **Address Autocomplete**: Smart location input

## 🚀 PERFORMANCE OPTIMIZATION

### **Loading Strategies**:
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Images, charts, non-critical components
- **Caching**: API responses, static assets, user data
- **CDN Integration**: Fast asset delivery

### **State Management**:
```javascript
// Zustand store example for booking state
const useBookingStore = create((set, get) => ({
  activeBooking: null,
  bookingHistory: [],
  setActiveBooking: (booking) => set({ activeBooking: booking }),
  updateBookingStatus: (bookingId, status) => {
    // Update booking status logic
  }
}));
```

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Core Setup** (Week 1)
- [ ] Next.js project setup with TypeScript
- [ ] Authentication system with role-based routing
- [ ] Basic layouts for all 4 user types
- [ ] API integration with provided backend
- [ ] Responsive design foundation

### **Phase 2: User Interfaces** (Week 2)
- [ ] Patient booking and tracking interface
- [ ] Driver dashboard and booking management
- [ ] Hospital capacity and incoming patients
- [ ] Emergency executive command center

### **Phase 3: Real-time Features** (Week 3)
- [ ] Socket.io integration for live updates
- [ ] Real-time maps and location tracking
- [ ] Live notifications and alerts system
- [ ] Emergency SOS functionality

### **Phase 4: Analytics & Polish** (Week 4)
- [ ] Comprehensive analytics dashboards
- [ ] Performance optimization
- [ ] Accessibility compliance
- [ ] Testing and bug fixes

## 🎯 SUCCESS METRICS

### **User Experience KPIs**:
- **Patient**: <30s booking time, <5s emergency SOS response
- **Driver**: <10s booking acceptance, real-time location accuracy
- **Hospital**: <2s bed status updates, 99% uptime
- **Executive**: <1s dashboard load time, real-time data refresh

### **Technical Performance**:
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **Accessibility Score**: >95 on Lighthouse audit
- **Mobile Performance**: >90 on PageSpeed Insights
- **Cross-Browser Support**: Chrome, Safari, Firefox, Edge

## 💡 ADDITIONAL FEATURES TO CONSIDER

### **Advanced Capabilities**:
- **AI-Powered Dispatch**: Machine learning for optimal driver assignment
- **Predictive Analytics**: Demand forecasting, resource planning
- **Multi-language Support**: Internationalization for diverse users
- **Voice Commands**: Hands-free operation for drivers
- **Telemedicine Integration**: Video consultations during transport
- **Insurance Integration**: Direct billing, claim processing

### **Emergency Features**:
- **Panic Button**: One-tap emergency activation
- **Medical ID**: Quick access to patient medical information
- **Family Notifications**: Auto-notify emergency contacts
- **Hospital Pre-registration**: Streamlined admission process

## 🔗 API Integration Guide

The complete API client (`api.ts`) has been provided with the following structure:

```typescript
import { UserAPI, DriverAPI, LocationAPI, BookingAPI, EmergencyAPI, RealTimeAPI, AnalyticsAPI } from './api';

// Example usage:
const handleEmergencySOS = async () => {
  try {
    const response = await EmergencyAPI.emergencySOS({
      userId: user.id,
      location: { latitude: 37.7749, longitude: -122.4194 },
      patientDetails: { condition: 'Chest Pain' }
    });
    // Handle successful SOS activation
  } catch (error) {
    // Handle error
  }
};
```

## 📞 SUPPORT & DOCUMENTATION

### **Required Documentation**:
- **User Guides**: Step-by-step instructions for each user type
- **API Documentation**: Complete endpoint reference
- **Deployment Guide**: Production setup and configuration
- **Troubleshooting**: Common issues and solutions

### **Testing Strategy**:
- **Unit Tests**: Component testing with Jest/Testing Library
- **Integration Tests**: API integration and user flows
- **E2E Tests**: Critical user journeys with Playwright
- **Performance Testing**: Load testing and optimization

---

## ⚡ QUICK START TEMPLATE

To implement this frontend, start with this project structure:

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── maps/           # Map components
│   ├── charts/         # Analytics charts
│   └── forms/          # Form components
├── pages/
│   ├── dashboard/      # User dashboards
│   ├── driver/         # Driver interface
│   ├── hospital/       # Hospital interface
│   └── executive/      # Executive interface
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── utils/              # Utility functions
├── types/              # TypeScript types
└── api.ts              # API client (provided)
```

This frontend should create a **professional, efficient, and life-saving application** that handles emergency medical services with the reliability and user experience of modern tech platforms like Uber, but optimized for the critical nature of healthcare emergencies.

The end result should be a **hackathon-winning** application that demonstrates real-world utility, excellent design, and robust functionality across all user types while maintaining the highest standards of medical-grade reliability.