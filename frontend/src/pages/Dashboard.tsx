import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import PatientDashboard from '@/components/dashboards/PatientDashboard';
import DriverDashboard from '@/components/dashboards/DriverDashboard';
import HospitalDashboard from '@/components/dashboards/HospitalDashboard';
import ExecutiveDashboard from '@/components/dashboards/ExecutiveDashboard';

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to role-specific dashboard
  switch (user.role) {
    case 'user':
      return <PatientDashboard />;
    case 'driver':
      return <DriverDashboard />;
    case 'hospital':
      return <HospitalDashboard />;
    case 'emergency_executive':
      return <ExecutiveDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}
