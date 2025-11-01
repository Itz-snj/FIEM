import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ambulance, Shield, Heart, Clock, Star, CheckCircle } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl mb-6 shadow-[var(--shadow-strong)]">
            <Ambulance className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            RapidAid Emergency Services
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Professional ambulance services at your fingertips. Fast response times, experienced paramedics, and 24/7 availability for your medical emergencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg text-lg px-8 animate-pulse"
              onClick={() => {
                // Create demo booking and redirect to track
                const demoBookingId = 'demo-' + Date.now();
                navigate(`/track?id=${demoBookingId}`);
              }}
            >
              🚨 EMERGENCY SOS
            </Button>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg text-lg px-8"
              onClick={() => navigate('/register')}
            >
              Get Started - Sign Up
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="hover:shadow-[var(--shadow-medium)] transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Rapid Response</CardTitle>
              <CardDescription>
                Average response time of under 6 minutes for emergency calls
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Expert Care</CardTitle>
              <CardDescription>
                Certified paramedics and advanced life support equipment in every ambulance
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>24/7 Availability</CardTitle>
              <CardDescription>
                Round-the-clock service with real-time tracking and hospital coordination
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>4.9★ Rating</CardTitle>
              <CardDescription>
                Trusted by thousands of patients with exceptional service quality
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Ambulance className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Real-time Tracking</CardTitle>
              <CardDescription>
                Track your ambulance location and estimated arrival time on a live map
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Hospital Network</CardTitle>
              <CardDescription>
                Connected to major hospitals for seamless patient transfer and admission
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 mb-16">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust RapidAid for their emergency medical needs. Create your account today and have peace of mind knowing help is just a tap away.
            </p>
            <Button 
              size="lg"
              className="text-lg px-8"
              onClick={() => navigate('/register')}
            >
              Create Your Account
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
