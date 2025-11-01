import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Ambulance, 
  Hospital, 
  CreditCard, 
  Filter, 
  Eye, 
  Download,
  RefreshCw,
  Star,
  Phone,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Timer,
  Activity,
  Heart
} from 'lucide-react';

interface BookingHistoryItem {
  id: string;
  bookingNumber: string;
  date: string;
  status: 'completed' | 'cancelled' | 'in-progress' | 'scheduled';
  patientName: string;
  pickupLocation: string;
  destination?: string;
  ambulanceType: string;
  priority: string;
  totalAmount: number;
  driverName?: string;
  driverRating?: number;
  estimatedTime?: string;
  actualTime?: string;
}

export default function BookingHistoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Sample booking data - in real app, this would come from API
  const sampleBookings: BookingHistoryItem[] = [
    {
      id: 'book-001',
      bookingNumber: 'AMB-1001',
      date: '2025-10-28T14:30:00Z',
      status: 'completed',
      patientName: 'John Doe',
      pickupLocation: 'MG Road Metro Station, Bangalore',
      destination: 'Apollo Hospital, Bangalore',
      ambulanceType: 'Advanced Life Support',
      priority: 'high',
      totalAmount: 2850,
      driverName: 'Rajesh Kumar',
      driverRating: 4.8,
      estimatedTime: '15 min',
      actualTime: '12 min'
    },
    {
      id: 'book-002',
      bookingNumber: 'AMB-1002',
      date: '2025-10-25T09:15:00Z',
      status: 'completed',
      patientName: 'Sarah Wilson',
      pickupLocation: 'Electronic City Phase 1, Bangalore',
      destination: 'Fortis Hospital, Bangalore',
      ambulanceType: 'Basic Life Support',
      priority: 'medium',
      totalAmount: 1650,
      driverName: 'Suresh Reddy',
      driverRating: 4.6,
      estimatedTime: '20 min',
      actualTime: '18 min'
    },
    {
      id: 'book-003',
      bookingNumber: 'AMB-1003',
      date: '2025-10-20T16:45:00Z',
      status: 'cancelled',
      patientName: 'Michael Brown',
      pickupLocation: 'Whitefield Main Road, Bangalore',
      ambulanceType: 'Cardiac Care Unit',
      priority: 'critical',
      totalAmount: 0,
      estimatedTime: '8 min'
    },
    {
      id: 'book-004',
      bookingNumber: 'AMB-1004',
      date: '2025-11-02T11:00:00Z',
      status: 'scheduled',
      patientName: 'Emily Davis',
      pickupLocation: 'Koramangala 4th Block, Bangalore',
      destination: 'Manipal Hospital, Bangalore',
      ambulanceType: 'Advanced Life Support',
      priority: 'medium',
      totalAmount: 2400,
      estimatedTime: '18 min'
    }
  ];

  useEffect(() => {
    loadBookingHistory();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  const loadBookingHistory = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app, fetch from API
      // const response = await API.BookingAPI.getUserBookings(user.id);
      
      // For now, use sample data + any local storage bookings
      const localBookings = JSON.parse(localStorage.getItem('user_bookings') || '[]');
      const allBookings = [...sampleBookings, ...localBookings.map((booking: any) => ({
        id: booking.bookingId || booking.id,
        bookingNumber: booking.bookingId || `AMB-${Date.now()}`,
        date: booking.timestamp || new Date().toISOString(),
        status: booking.status || 'completed',
        patientName: booking.patientInfo?.name || 'Unknown Patient',
        pickupLocation: booking.pickupLocation?.address || 'Unknown Location',
        destination: booking.destinationLocation?.address,
        ambulanceType: booking.ambulanceType || 'Basic Life Support',
        priority: booking.priority || 'medium',
        totalAmount: booking.estimatedCost || 1500,
        estimatedTime: '15 min'
      }))];
      
      setBookings(allBookings);
      
      toast({
        title: "✅ History Loaded",
        description: `Found ${allBookings.length} bookings`,
      });
    } catch (error) {
      toast({
        title: "❌ Load Failed",
        description: "Could not load booking history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.destination?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setFilteredBookings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'in-progress':
        return <Timer className="w-4 h-4" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewBookingDetails = (bookingId: string) => {
    navigate(`/track?id=${bookingId}`);
  };

  const rebookService = (booking: BookingHistoryItem) => {
    // Pre-fill booking form with previous booking data
    navigate('/book', { 
      state: { 
        prefillData: {
          pickupLocation: { address: booking.pickupLocation },
          destinationLocation: booking.destination ? { address: booking.destination } : undefined,
          patientInfo: { name: booking.patientName },
          ambulanceType: booking.ambulanceType.toLowerCase().replace(' ', ''),
          priority: booking.priority
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-600/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-pink-400/20 to-orange-600/20 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/90 backdrop-blur-xl shadow-xl border-b border-white/20">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-pink-600/10"></div>
        <div className="relative container mx-auto px-4 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 md:space-x-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <Calendar className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 bg-clip-text text-transparent">
                    Booking History
                  </h1>
                  <p className="text-sm md:text-base text-gray-600">Track your medical journey</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="hidden md:flex bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-3 py-1">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {filteredBookings.length} Records
              </Badge>
              <Button
                onClick={loadBookingHistory}
                disabled={isLoading}
                variant="outline"
                size="icon"
                className="hover:bg-white/20 backdrop-blur-sm border-white/30 transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="relative container mx-auto px-4 py-6">
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 md:p-8 mb-8 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
            <div className="flex-1 max-w-lg">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-blue-500 transition-colors" />
                <Input
                  placeholder="Search bookings, patients, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 border-2 border-white/50 rounded-2xl bg-white/50 backdrop-blur-sm focus:bg-white/80 transition-all duration-300 text-base placeholder:text-gray-500"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-6 py-3 border-2 border-white/50 rounded-2xl bg-white/50 backdrop-blur-sm text-base focus:outline-none focus:border-blue-500 focus:bg-white/80 transition-all duration-300 min-w-[140px]"
              >
                <option value="all">🎯 All Status</option>
                <option value="completed">✅ Completed</option>
                <option value="cancelled">❌ Cancelled</option>
                <option value="scheduled">📅 Scheduled</option>
                <option value="in-progress">🚑 In Progress</option>
              </select>
              
              <Button
                onClick={loadBookingHistory}
                disabled={isLoading}
                variant="outline"
                className="md:hidden h-14 px-4 bg-white/50 backdrop-blur-sm border-white/50 hover:bg-white/80"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Booking List */}
        <div className="space-y-6 md:space-y-8">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-xl text-gray-600 mb-2">Loading your medical history...</p>
                <p className="text-sm text-gray-500">Please wait while we fetch your records</p>
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <Card className="text-center py-16 bg-white/60 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
              <CardContent className="space-y-6">
                <div className="relative">
                  <Calendar className="w-24 h-24 mx-auto text-gray-300 mb-4" />
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">No Medical Records Found</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No bookings match your current search filters. Try adjusting your criteria.' 
                      : 'Start your medical journey with us. Book your first ambulance service today.'
                    }
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/book')} 
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Ambulance className="w-5 h-5 mr-3" />
                  Book Emergency Service
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredBookings.map((booking, index) => (
              <Card 
                key={booking.id} 
                className="group bg-white/60 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden transform hover:scale-[1.02] hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="relative p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Main Booking Info */}
                    <div className="flex-1 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                            <Ambulance className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900">{booking.bookingNumber}</h3>
                            <Badge className={`${getStatusColor(booking.status)} border-0 text-sm px-3 py-1 rounded-full shadow-md mt-1`}>
                              {getStatusIcon(booking.status)}
                              <span className="ml-2 capitalize font-medium">{booking.status}</span>
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/50 rounded-2xl px-4 py-2 shadow-md">
                          <div className={`w-4 h-4 rounded-full ${getPriorityColor(booking.priority)} shadow-lg`}></div>
                          <span className="text-sm font-semibold text-gray-700 capitalize">{booking.priority} Priority</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-4 p-4 bg-white/40 rounded-2xl shadow-md">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{booking.patientName}</p>
                            <p className="text-sm text-gray-600 font-medium">{booking.ambulanceType}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-white/40 rounded-2xl shadow-md">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{formatDate(booking.date)}</p>
                            <p className="text-sm text-gray-600">
                              {booking.actualTime ? `✅ Completed in ${booking.actualTime}` : `⏱️ Est. ${booking.estimatedTime}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-100">
                          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-red-700 mb-1">Pickup Location</p>
                            <p className="font-semibold text-gray-900 break-words">{booking.pickupLocation}</p>
                          </div>
                        </div>
                        
                        {booking.destination && (
                          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
                            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                              <Hospital className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-purple-700 mb-1">Destination Hospital</p>
                              <p className="font-semibold text-gray-900 break-words">{booking.destination}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {booking.driverName && (
                        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 shadow-md">
                          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <User className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg">{booking.driverName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="font-semibold text-gray-700">{booking.driverRating}</span>
                              </div>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-600">Professional Driver</span>
                            </div>
                          </div>
                          <Phone className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Actions & Price */}
                    <div className="flex flex-col items-end gap-4 lg:min-w-[240px]">
                      <div className="text-right bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-200 shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                          <CreditCard className="w-6 h-6 text-green-600" />
                          <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            ₹{booking.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-green-700">
                          {booking.status === 'cancelled' ? '🚫 No charge applied' : '✅ Payment completed'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewBookingDetails(booking.id)}
                          className="flex items-center gap-2 text-sm bg-white/50 backdrop-blur-sm border-white/50 hover:bg-white/80 rounded-xl px-4 py-3 font-medium transition-all duration-300 hover:scale-105"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                        
                        {booking.status === 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => rebookService(booking)}
                            className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-xl px-4 py-3 font-medium shadow-lg transform hover:scale-105 transition-all duration-300"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Book Again
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredBookings.length > 0 && (
          <div className="mt-12 bg-white/60 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">
                Medical Journey Summary
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">
                  {filteredBookings.length}
                </div>
                <div className="text-sm font-medium text-blue-700">Total Services</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">
                  {filteredBookings.filter(b => b.status === 'completed').length}
                </div>
                <div className="text-sm font-medium text-green-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent mb-1">
                  {filteredBookings.filter(b => b.status === 'scheduled').length}
                </div>
                <div className="text-sm font-medium text-orange-700">Upcoming</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                  ₹{filteredBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
                </div>
                <div className="text-sm font-medium text-purple-700">Total Investment</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed SOS Button - Bottom Right Corner */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            // Quick SOS emergency booking
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  // Create emergency booking data
                  const emergencyBooking = {
                    pickupLocation: {
                      address: `🚨 Emergency SOS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                      coordinates: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                      }
                    },
                    patientInfo: {
                      name: 'Emergency Patient',
                      age: '0',
                      gender: 'unknown',
                      condition: 'Medical Emergency - SOS Alert',
                      emergencyContact: {
                        name: 'Emergency Services',
                        phone: '911',
                        relation: 'emergency'
                      }
                    },
                    priority: 'critical',
                    ambulanceType: 'advanced'
                  };
                  
                  // Store emergency booking
                  const emergencyId = 'sos-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
                  const emergencyData = {
                    ...emergencyBooking,
                    bookingId: emergencyId,
                    timestamp: new Date().toISOString(),
                    status: 'emergency-dispatched'
                  };
                  
                  const existingBookings = JSON.parse(localStorage.getItem('user_bookings') || '[]');
                  existingBookings.unshift(emergencyData); // Add to beginning
                  localStorage.setItem('user_bookings', JSON.stringify(existingBookings));
                  
                  toast({
                    title: "🚨 EMERGENCY SOS ACTIVATED",
                    description: "Ambulance dispatched to your location. Stay calm, help is coming.",
                    variant: "destructive"
                  });
                  
                  // Redirect to current ride tracking
                  setTimeout(() => {
                    navigate(`/current-ride?id=${emergencyId}`);
                  }, 2000);
                },
                () => {
                  toast({
                    title: "❌ Location Required",
                    description: "Please enable GPS for emergency SOS",
                    variant: "destructive"
                  });
                }
              );
            } else {
              toast({
                title: "❌ GPS Not Available",
                description: "Please call 911 directly for emergency",
                variant: "destructive"
              });
            }
          }}
          className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full shadow-2xl border-4 border-white transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        >
          <div className="relative">
            <Heart className="w-8 h-8 md:w-10 md:h-10 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping"></div>
          </div>
          <span className="absolute -top-14 -left-12 bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            🚨 Emergency SOS
          </span>
        </Button>
      </div>
    </div>
  );
}