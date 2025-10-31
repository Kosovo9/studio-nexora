'use client';

import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Payment Cancelled</h1>
        
        <p className="text-gray-300 mb-8">
          Your payment was cancelled. No charges have been made to your account. 
          You can try again anytime or contact support if you need assistance.
        </p>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Pricing Plans
          </Link>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Return Home
          </Link>
        </div>

        <div className="mt-8 p-4 bg-blue-900/30 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Need Help?</h3>
          <p className="text-sm text-gray-300 mb-3">
            If you're experiencing issues with payment or have questions about our plans:
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            Contact Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
