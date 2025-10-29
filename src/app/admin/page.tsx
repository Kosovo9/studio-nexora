'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { 
  Users, 
  DollarSign, 
  Settings, 
  BarChart3, 
  Shield,
  Palette,
  Globe,
  FileText,
  Activity
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  processingJobs: number;
  completedJobs: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'admin') {
      redirect('/');
    }

    // Fetch admin stats
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <div className="text-sm text-gray-400">
              Welcome, {session?.user?.email}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Subscriptions</p>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Monthly Revenue</p>
                  <p className="text-2xl font-bold">${stats.monthlyRevenue}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Processing Jobs</p>
                  <p className="text-2xl font-bold">{stats.processingJobs}</p>
                </div>
                <Activity className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
        )}

        {/* Admin Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Content Management */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold">Content Management</h3>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Edit Hero Text
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Manage Features
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Update Pricing
              </button>
            </div>
          </div>

          {/* Theme & Design */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Palette className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold">Theme & Design</h3>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Color Scheme
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Upload Assets
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Theme Settings
              </button>
            </div>
          </div>

          {/* Language Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Globe className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold">Language Settings</h3>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Enable/Disable Languages
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Edit Translations
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Default Language
              </button>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold">System Settings</h3>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Rate Limits
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Feature Flags
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Security Settings
              </button>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold">User Management</h3>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                View All Users
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Manage Roles
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Subscription Management
              </button>
            </div>
          </div>

          {/* Analytics */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-semibold">Analytics & Logs</h3>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                View Metrics
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                System Logs
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                Error Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}