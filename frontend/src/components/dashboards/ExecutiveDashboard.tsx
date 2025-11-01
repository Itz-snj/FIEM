import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, Ambulance, Building2, MapPin, Clock, TrendingUp, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExecutiveDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card border-b shadow-[var(--shadow-soft)] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Command Center</h1>
              <p className="text-xs text-muted-foreground">Emergency Executive Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-green-500 pulse-live">System Online</Badge>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Executive</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* System Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Bookings</p>
                  <p className="text-3xl font-bold">24</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% from yesterday
                  </p>
                </div>
                <Activity className="w-10 h-10 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online Drivers</p>
                  <p className="text-3xl font-bold">48</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    85% availability
                  </p>
                </div>
                <Ambulance className="w-10 h-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Beds</p>
                  <p className="text-3xl font-bold">127</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across 8 hospitals
                  </p>
                </div>
                <Building2 className="w-10 h-10 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-3xl font-bold">6.2m</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    -15% improvement
                  </p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Emergency Map Placeholder */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Live Emergency Map
            </CardTitle>
            <CardDescription>Real-time view of all ambulances and emergencies in the city</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Interactive Map Integration</p>
                <p className="text-sm text-muted-foreground">Google Maps / Mapbox will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Emergency Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Active Emergencies</CardTitle>
              <CardDescription>Real-time emergency booking feed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: 'AMB-001', type: 'Cardiac', status: 'enroute', time: '8 min ago', priority: 'high' },
                { id: 'AMB-002', type: 'Trauma', status: 'assigned', time: '12 min ago', priority: 'high' },
                { id: 'AMB-003', type: 'Transfer', status: 'arrived', time: '15 min ago', priority: 'normal' },
                { id: 'AMB-004', type: 'Respiratory', status: 'enroute', time: '18 min ago', priority: 'high' },
              ].map((emergency) => (
                <div key={emergency.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${emergency.priority === 'high' ? 'bg-red-500 pulse-live' : 'bg-yellow-500'}`} />
                    <div>
                      <p className="font-medium text-sm">{emergency.id}</p>
                      <p className="text-xs text-muted-foreground">{emergency.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-[hsl(var(--status-enroute))] text-xs">{emergency.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{emergency.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Resource Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Availability</CardTitle>
              <CardDescription>Current system resource status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Driver Availability</span>
                  <span className="text-sm text-muted-foreground">48/56 online</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '85%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Hospital Capacity</span>
                  <span className="text-sm text-muted-foreground">127/450 available</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">ICU Beds</span>
                  <span className="text-sm text-muted-foreground">18/120 available</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: '15%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Emergency Rooms</span>
                  <span className="text-sm text-muted-foreground">24/80 available</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: '30%' }} />
                </div>
              </div>

              <Button className="w-full mt-4">
                View Detailed Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
