# 🚑 AMBULANCE BOOKING SYSTEM - COMPLETE API REFERENCE

## 🎯 **Available APIs & Testing Guide**

### **🏃‍♂️ QUICK START**
```bash
# 1. Start the server
pnpm dev

# 2. Run the comprehensive demo
node demo-test.js

# 3. Or test individual endpoints with curl commands below
```

---

## 📋 **CORE APIs READY FOR TESTING**

### **👥 USER MANAGEMENT APIs**

#### **1. User Registration**
```bash
POST /rest/users/register
```
```json
{
  "fullName": "John Patient",
  "email": "john@demo.com",
  "phone": "+1234567890",
  "password": "password123",
  "role": "user|driver|hospital|emergency_executive"
}
```

#### **2. User Login**
```bash
POST /rest/users/login
```
```json
{
  "email": "john@demo.com",
  "password": "password123"
}
```

#### **3. Get User by ID**
```bash
GET /rest/users/:userId
```

#### **4. Get Users by Role**
```bash
GET /rest/users/role/:role
# roles: user, driver, hospital, emergency_executive
```

#### **5. Search Users**
```bash
GET /rest/users/search/:query
```

#### **6. Update User Profile**
```bash
PUT /rest/users/:userId
```

#### **7. Change User Status**
```bash
PUT /rest/users/:userId/status
```

---

### **🚑 DRIVER MANAGEMENT APIs**

#### **1. Get Driver Profile**
```bash
GET /rest/drivers/:driverId/profile
```

#### **2. Update Driver Status**
```bash
PUT /rest/drivers/:driverId/status
```

#### **3. Set Driver Online**
```bash
POST /rest/drivers/:driverId/go-online
```
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

#### **4. Set Driver Offline**
```bash
POST /rest/drivers/:driverId/go-offline
```

#### **5. Get Driver Statistics**
```bash
GET /rest/drivers/:driverId/statistics
```

#### **6. Find Nearby Drivers**
```bash
GET /rest/drivers/nearby
```

#### **7. Emergency Mode Toggle**
```bash
POST /rest/drivers/:driverId/emergency-mode
```

---

### **📍 LOCATION SERVICES APIs**

#### **1. Update Driver Location**
```bash
POST /rest/location/drivers/:driverId/update
```
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "timestamp": "2025-10-31T17:11:49.907Z",
  "accuracy": 10,
  "speed": 25,
  "heading": 180
}
```

#### **2. Get Driver Location**
```bash
GET /rest/location/drivers/:driverId
```

#### **3. Find Nearest Drivers**
```bash
POST /rest/location/drivers/nearest
```
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius": 5000
}
```

#### **4. Find Nearest Hospitals**
```bash
POST /rest/location/hospitals/nearest
```
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius": 10000,
  "specializations": ["emergency", "cardiology"]
}
```

#### **5. Get Active Drivers**
```bash
GET /rest/location/drivers/active
```

#### **6. Calculate Route**
```bash
POST /rest/location/route/calculate
```

#### **7. Set Driver Availability**
```bash
PUT /rest/location/drivers/:driverId/availability
```

---

### **📋 BOOKING MANAGEMENT APIs**

#### **1. Create Booking**
```bash
POST /rest/bookings
```
```json
{
  "userId": "user-id-here",
  "pickupLocation": {
    "latitude": 37.7849,
    "longitude": -122.4094,
    "address": "123 Emergency St, San Francisco, CA"
  },
  "destinationLocation": {
    "latitude": 37.7949,
    "longitude": -122.3994,
    "address": "456 Hospital Ave, San Francisco, CA"
  },
  "patientInfo": {
    "name": "Emergency Patient",
    "age": 45,
    "gender": "male",
    "medicalCondition": "chest pain",
    "severity": "high"
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+1234567894"
  }
}
```

#### **2. Get Booking Details**
```bash
GET /rest/bookings/:bookingId
```

#### **3. Get User Bookings**
```bash
GET /rest/bookings/user/:userId
```

#### **4. Smart Dispatch Ambulance**
```bash
POST /rest/bookings/:bookingId/dispatch
```
```json
{
  "priority": "high",
  "preferences": {
    "ambulanceType": "basic",
    "hospitalPreference": "nearest"
  }
}
```

#### **5. Update Booking Status**
```bash
PUT /rest/bookings/:bookingId/status
```
```json
{
  "status": "driver_assigned",
  "driverId": "driver-id-here"
}
```

#### **6. Cancel Booking**
```bash
DELETE /rest/bookings/:bookingId
```

#### **7. Manual Dispatch**
```bash
POST /rest/bookings/:bookingId/dispatch/manual
```

---

### **🚨 EMERGENCY SERVICES APIs**

#### **1. Emergency SOS**
```bash
POST /rest/bookings/emergency/sos
```
```json
{
  "userId": "user-id-here",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "Emergency Location"
  },
  "emergencyType": "cardiac_arrest"
}
```

#### **2. Emergency Broadcast**
```bash
POST /rest/bookings/realtime/emergency/broadcast
```
```json
{
  "emergencyId": "booking-id-here",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "severity": "critical"
}
```

---

### **🏥 HOSPITAL INTEGRATION APIs**

#### **1. Search Hospitals**
```bash
POST /rest/bookings/hospitals/search
```
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "patientCondition": {
    "severity": "high",
    "specialization": "cardiology"
  },
  "radius": 15000
}
```

#### **2. Reserve Hospital Bed**
```bash
POST /rest/bookings/hospitals/:hospitalId/reserve
```

#### **3. Get Hospital Analytics**
```bash
GET /rest/bookings/analytics/hospitals
```

---

### **📡 REAL-TIME FEATURES APIs**

#### **1. Get Real-time Status**
```bash
GET /rest/bookings/realtime/status
```

#### **2. Join Booking Room**
```bash
POST /rest/bookings/realtime/booking/:bookingId/join
```

#### **3. Get Dispatch Analytics**
```bash
GET /rest/bookings/analytics/dispatch
```

---

## 🧪 **COMPLETE TESTING WORKFLOW**

### **Step 1: Create Demo Users**
```bash
# Create Patient
curl -X POST http://localhost:8083/rest/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Patient",
    "email": "john@demo.com",
    "phone": "+1111111111",
    "password": "demo123",
    "role": "user"
  }'

# Create Driver
curl -X POST http://localhost:8083/rest/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Mike Driver",
    "email": "mike@demo.com",
    "phone": "+2222222222",
    "password": "demo123",
    "role": "driver"
  }'

# Create Hospital
curl -X POST http://localhost:8083/rest/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "City Hospital",
    "email": "hospital@demo.com",
    "phone": "+3333333333",
    "password": "demo123",
    "role": "hospital"
  }'

# Create Emergency Executive
curl -X POST http://localhost:8083/rest/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Emergency Executive",
    "email": "exec@demo.com",
    "phone": "+4444444444",
    "password": "demo123",
    "role": "emergency_executive"
  }'
```

### **Step 2: Get User IDs**
```bash
# Get all users to find their IDs
curl -X GET http://localhost:8083/rest/users/role/user
curl -X GET http://localhost:8083/rest/users/role/driver
curl -X GET http://localhost:8083/rest/users/role/hospital
```

### **Step 3: Test Authentication**
```bash
curl -X POST http://localhost:8083/rest/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@demo.com",
    "password": "demo123"
  }'
```

### **Step 4: Test Location Services**
```bash
# Update driver location (replace DRIVER_ID)
curl -X POST http://localhost:8083/rest/location/drivers/DRIVER_ID/update \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "accuracy": 10,
    "speed": 0,
    "heading": 0
  }'

# Set driver online
curl -X POST http://localhost:8083/rest/drivers/DRIVER_ID/go-online \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }'
```

### **Step 5: Test Booking Workflow**
```bash
# Create booking (replace USER_ID)
curl -X POST http://localhost:8083/rest/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "pickupLocation": {
      "latitude": 37.7849,
      "longitude": -122.4094,
      "address": "123 Emergency St, San Francisco, CA"
    },
    "destinationLocation": {
      "latitude": 37.7949,
      "longitude": -122.3994,
      "address": "456 Hospital Ave, San Francisco, CA"
    },
    "patientInfo": {
      "name": "Emergency Patient",
      "age": 45,
      "gender": "male",
      "medicalCondition": "chest pain",
      "severity": "high"
    },
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+1234567894"
    }
  }'
```

### **Step 6: Test Emergency SOS**
```bash
# Emergency SOS (replace USER_ID)
curl -X POST http://localhost:8083/rest/bookings/emergency/sos \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "address": "Emergency Location"
    },
    "emergencyType": "cardiac_arrest"
  }'
```

### **Step 7: Test Real-time Features**
```bash
# Get real-time status
curl -X GET http://localhost:8083/rest/bookings/realtime/status

# Test emergency broadcast (replace BOOKING_ID)
curl -X POST http://localhost:8083/rest/bookings/realtime/emergency/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyId": "BOOKING_ID",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "severity": "critical"
  }'
```

---

## 🎯 **EXPECTED RESPONSES**

### **Successful User Registration:**
```json
{
  "id": "6904edd56cf77325a7b2ade6",
  "fullName": "John Patient",
  "email": "john@demo.com",
  "phone": "+1111111111",
  "role": "user",
  "status": "pending_verification",
  "isEmailVerified": false,
  "isPhoneVerified": false,
  "createdAt": "2025-10-31T17:11:49.907Z",
  "updatedAt": "2025-10-31T17:11:49.907Z"
}
```

### **Successful Booking Creation:**
```json
{
  "success": true,
  "bookingId": "booking-1761921288778-nowzndxiv",
  "status": "requested",
  "hospitalRecommendations": [
    {
      "hospitalId": "hosp-1761921288787-abc123",
      "name": "City General Hospital",
      "distance": 2.3,
      "suitabilityScore": 95,
      "specializations": ["emergency", "cardiology"]
    }
  ]
}
```

---

## 🚀 **SYSTEM STATUS**

✅ **User Management**: Complete with MongoDB persistence  
✅ **Authentication**: Working with login/token system  
✅ **Location Services**: GPS tracking and nearest searches  
✅ **Booking System**: End-to-end booking workflow  
✅ **Emergency SOS**: One-tap emergency booking  
✅ **Hospital Integration**: Smart recommendations  
✅ **Real-time Features**: Socket.io communication  
✅ **API Documentation**: Complete endpoint reference  

🎯 **Ready for hackathon demo and production use!**