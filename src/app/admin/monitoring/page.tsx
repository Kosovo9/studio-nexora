'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Database, Zap, CreditCard } from 'lucide-react';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  message?: string;
}

interface SystemStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  processingJobs: number;
  completedJobs: number;
}

export default function MonitoringPage() {
  const { data: session } = useSession();
  const [healthStatus, setHealthStatus] = useState<HealthStatus[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      // Mock health status for different services
      setHealthStatus([
        { service: 'API', status: response.ok ? 'healthy' : 'unhealthy', responseTime: 45 },
        { service: 'Database', status: data.database === 'connected' ? 'healthy' : 'unhealthy', responseTime: 23 },
        { service: 'Redis', status: 'healthy', responseTime: 12 },
        { service: 'Replicate', status: 'healthy', responseTime: 156 },
        { service: 'Stripe', status: 'healthy', responseTime: 89 },
      ]);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchHealthStatus(), fetchSystemStats()]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (session?.user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={refreshData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {healthStatus.map((service) => (
                <div key={service.service} className="text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Badge 
                      variant={service.status === 'healthy' ? 'default' : 'destructive'}
                      className="w-full justify-center"
                    >
                      {service.service}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      {service.responseTime}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Statistics */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${systemStats.totalRevenue}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${systemStats.monthlyRevenue}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Jobs</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.processingJobs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.completedJobs}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
