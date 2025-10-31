'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [sessionData, setSessionData] = useState<any>(null);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // Verify the session
      fetch(`/api/verify-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSessionData(data.session);
            setStatus('success');
          } else {
            setStatus('error');
          }
        })
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">✗</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Payment Verification Failed</h1>
          <p className="text-gray-300 mb-8">
            We couldn't verify your payment. Please contact support if you believe this is an error.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
        
        <p className="text-gray-300 mb-6">
          Thank you for your subscription! Your account has been upgraded and you now have access to all premium features.
        </p>

        {sessionData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6 text-left">
            <h3 className="text-lg font-semibold text-white mb-2">Order Details</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p><span className="font-medium">Plan:</span> {sessionData.planType || 'Premium'}</p>
              <p><span className="font-medium">Amount:</span> ${(sessionData.amount_total / 100).toFixed(2)}</p>
              <p><span className="font-medium">Email:</span> {sessionData.customer_email}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Return Home
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          You will receive a confirmation email shortly with your receipt and account details.
        </p>
      </div>
    </div>
  );
}
