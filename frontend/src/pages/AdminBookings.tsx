import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw, Clock, MapPin, User, Phone, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import API, { Booking } from '@/lib/api';

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const { toast } = useToast();

  const fetchDatabaseStatus = async () => {
    try {
      const status = await API.BookingAPI.getDatabaseStatus();
      setDbStatus(status);
    } catch (err) {
      console.error('Failed to fetch database status:', err);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch database status
      await fetchDatabaseStatus();
      
      const response = await API.BookingAPI.getAllBookings(50);
      
      if (response.success) {
        setBookings(response.bookings);
        toast({
          title: "✅ Bookings Loaded",
          description: `Found ${response.total} bookings (Source: ${response.source || 'unknown'})`,
        });
      } else {
        throw new Error('Failed to fetch bookings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Show demo data if API fails
      setBookings([]);
      
      toast({
        title: "❌ API Error",
        description: "Could not connect to backend. Showing empty state.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'requested': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'driver_assigned': 'bg-purple-100 text-purple-800',
      'driver_enroute': 'bg-indigo-100 text-indigo-800',
      'patient_picked': 'bg-green-100 text-green-800',
      'in_transit': 'bg-emerald-100 text-emerald-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading bookings from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin: Database Bookings</h1>
          <p className="text-muted-foreground mt-2">
            View all ambulance bookings stored in the backend database
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchBookings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={fetchDatabaseStatus} variant="outline">
            🔍 Check DB
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-sm text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {bookings.filter(b => ['confirmed', 'driver_assigned', 'driver_enroute', 'patient_picked', 'in_transit'].includes(b.status)).length}
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {bookings.filter(b => b.priority === 'critical').length}
            </div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
      </div>

      {/* Database Status */}
      {dbStatus && (
        <Card className={`mb-6 ${dbStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${dbStatus.database.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className={`font-medium ${dbStatus.success ? 'text-green-900' : 'text-red-900'}`}>
                  💾 Database Status: {dbStatus.database.status.toUpperCase()}
                </p>
                <p className={`text-sm ${dbStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                  {dbStatus.message}
                </p>
                {dbStatus.database.connected && (
                  <p className="text-sm text-green-700">
                    📊 Total bookings in database: {dbStatus.database.totalBookings}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  MongoDB URI: {dbStatus.database.mongoUri}
                </p>
                {dbStatus.database.error && (
                  <p className="text-sm text-red-700 mt-1">
                    Error: {dbStatus.database.error}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Status Card */}
      {dbStatus && (
        <Card className={`mb-6 ${dbStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${dbStatus.database.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <p className={`font-medium ${dbStatus.success ? 'text-green-900' : 'text-red-900'}`}>
                    Database Status: {dbStatus.database.status.toUpperCase()}
                  </p>
                  <p className={`text-sm ${dbStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                    {dbStatus.message}
                  </p>
                  {dbStatus.database.totalBookings !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Total bookings in database: {dbStatus.database.totalBookings}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>MongoDB: {dbStatus.database.mongoUri}</p>
                <p>Checked: {new Date(dbStatus.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-900">Database Connection Error</p>
                <p className="text-sm text-red-700">
                  Error: {error}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Make sure the backend server is running on port 8083 and try refreshing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!error && bookings.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🚑</div>
            <h3 className="text-xl font-semibold mb-2">No Bookings Found</h3>
            <p className="text-muted-foreground mb-4">
              No ambulance bookings have been saved to the database yet.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>• Make sure the backend server is running</p>
              <p>• Try creating a booking through the booking page</p>
              <p>• Check the browser console for any API errors</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings List */}
      {bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Booking #{booking.bookingNumber}
                    </CardTitle>
                    <CardDescription>
                      Created {format(new Date(booking.createdAt), 'PPp')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(booking.priority)}>
                      {booking.priority.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Patient Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{booking.patientInfo.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.patientInfo.age} years, {booking.patientInfo.gender}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Condition</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.patientInfo.condition}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Emergency Contact</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.patientInfo.emergencyContact.name} ({booking.patientInfo.emergencyContact.relation})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-green-600 mt-1" />
                    <div>
                      <p className="font-medium text-green-600">Pickup Location</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.pickupLocation.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.pickupLocation.coordinates.latitude.toFixed(4)}, {booking.pickupLocation.coordinates.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  {booking.destination && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-red-600 mt-1" />
                      <div>
                        <p className="font-medium text-red-600">Destination</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.destination.address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.destination.coordinates.latitude.toFixed(4)}, {booking.destination.coordinates.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Booking Details */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Type: {booking.type.toUpperCase()}</span>
                    {booking.ambulanceRequirements && (
                      <span>Ambulance: {booking.ambulanceRequirements.type.toUpperCase()}</span>
                    )}
                    <span>User ID: {booking.userId}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">
                      {booking.payment.currency} {booking.payment.amount}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({booking.payment.status})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* API Information */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-900 mb-2">📡 System Information</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Backend URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:8083/rest'}</p>
            <p><strong>Bookings Endpoint:</strong> GET /bookings/all</p>
            <p><strong>Database Status:</strong> GET /bookings/db-status</p>
            <p><strong>Total Records:</strong> {bookings.length}</p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleTimeString()}</p>
            {dbStatus && (
              <>
                <p><strong>Database:</strong> {dbStatus.database.connected ? '✅ Connected' : '❌ Disconnected'}</p>
                <p><strong>MongoDB URI:</strong> {dbStatus.database.mongoUri}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}