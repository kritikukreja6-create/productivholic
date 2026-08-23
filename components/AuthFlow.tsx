'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthFlow() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // UI State Management
  const [step, setStep] = useState<'email' | 'otp' | 'details'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Data State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Regex for strong password: 8-12 chars, 1 uppercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,12}$/;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      setError(error.message);
    } else {
      setStep('details');
    }
    setLoading(false);
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!passwordRegex.test(password)) {
      setError("Password must be 8-12 characters, with at least one uppercase letter, one number, and one special character.");
      setLoading(false);
      return;
    }

    // 1. Update the user's secure password in auth.users
    const { error: passwordError } = await supabase.auth.updateUser({
      password: password
    });

    if (passwordError) {
      setError(passwordError.message);
      setLoading(false);
      return;
    }

    // 2. Update the auto-generated profile row with the new username
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: username })
        .eq('id', user.id);

      if (profileError) {
        setError("Username might already be taken. Please try another.");
        setLoading(false);
        return;
      }
      
      // Success! Redirect to the dynamic onboarding questionnaire
      window.location.href = '/onboarding'; 
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md text-gray-800">
      <h2 className="text-2xl font-bold mb-6 text-center">Join the Workspace</h2>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      {step === 'email' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Login Code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Enter 6-Digit Code</label>
            <input 
              type="text" 
              required
              maxLength={8}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-lg"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      )}

      {step === 'details' && (
        <form onSubmit={handleCompleteProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Choose a Username</label>
            <input 
              type="text" 
              required
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Set a Password</label>
            <input 
              type="password" 
              required
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              8-12 characters. Must include 1 uppercase, 1 number, and 1 special character.
            </p>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Account Setup'}
          </button>
        </form>
      )}
    </div>
  );
}