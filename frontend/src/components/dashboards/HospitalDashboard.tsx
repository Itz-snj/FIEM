import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Bed, Activity, Users, AlertCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HospitalDashboard() {
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
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hospital Portal</h1>
              <p className="text-xs text-muted-foreground">City General Hospital</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Hospital Admin</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hospital Capacity Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Beds</p>
                  <p className="text-2xl font-bold">250</p>
                </div>
                <Bed className="w-8 h-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold text-green-600">42</p>
                </div>
                <Bed className="w-8 h-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Occupancy</p>
                  <p className="text-2xl font-bold">83%</p>
                </div>
                <Activity className="w-8 h-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff Online</p>
                  <p className="text-2xl font-bold">142</p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incoming Ambulances */}
        <Card className="mb-8 border-[hsl(var(--warning))]/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[hsl(var(--warning))]" />
              Incoming Ambulances
            </CardTitle>
            <CardDescription>Real-time incoming patient notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Incoming Patient 1 */}
            <div className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[hsl(var(--status-enroute))]/20 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[hsl(var(--status-enroute))]" />
                  </div>
                  <div>
                    <p className="font-medium">Emergency Case - Cardiac</p>
                    <p className="text-sm text-muted-foreground">Patient: Sarah Johnson</p>
                  </div>
                </div>
                <Badge className="bg-[hsl(var(--status-enroute))]">ETA: 8 min</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Driver:</span> Mike Wilson
                </div>
                <div>
                  <span className="text-muted-foreground">Booking:</span> #AMB-001
                </div>
              </div>
            </div>

            {/* Incoming Patient 2 */}
            <div className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[hsl(var(--status-enroute))]/20 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[hsl(var(--status-enroute))]" />
                  </div>
                  <div>
                    <p className="font-medium">Trauma - Road Accident</p>
                    <p className="text-sm text-muted-foreground">Patient: Robert Chen</p>
                  </div>
                </div>
                <Badge className="bg-[hsl(var(--status-enroute))]">ETA: 12 min</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Driver:</span> Emily Davis
                </div>
                <div>
                  <span className="text-muted-foreground">Booking:</span> #AMB-002
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Bed Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Department Bed Availability</CardTitle>
            <CardDescription>Real-time bed status by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Emergency', total: 30, available: 5, status: 'warning' },
                { name: 'ICU', total: 20, available: 3, status: 'critical' },
                { name: 'General Ward', total: 100, available: 18, status: 'good' },
                { name: 'Pediatric', total: 40, available: 12, status: 'good' },
                { name: 'Surgical', total: 60, available: 4, status: 'warning' },
              ].map((dept) => (
                <div key={dept.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{dept.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dept.available} available of {dept.total} total
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          dept.status === 'good' ? 'bg-green-500' : 
                          dept.status === 'warning' ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${(dept.available / dept.total) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${
                      dept.status === 'good' ? 'text-green-600' : 
                      dept.status === 'warning' ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {Math.round((dept.available / dept.total) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
