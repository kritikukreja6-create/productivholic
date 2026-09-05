'use client';

import { useState, useEffect } from 'react';
import { generateReflection } from '@/app/actions/reflect';

export default function EveningReflection() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [accomplished, setAccomplished] = useState('');
  const [blocked, setBlocked] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    const today = new Date().toISOString().split('T')[0];
    const hasReflected = localStorage.getItem(`reflected_${today}`);
    
    // Triggers automatically after 8:00 PM local time
    if (hour >= 20 && !hasReflected) {
      setShow(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await generateReflection(accomplished, blocked);
    setSummary(res.summary);
    setLoading(false);
    setStep(2);
    
    // Prevent it from showing again tonight
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`reflected_${today}`, 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative overflow-hidden">
        
        {/* Decorative background header */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-900 to-black rounded-t-3xl -z-10"></div>
        
        {step === 1 ? (
          <div className="mt-8">
            <h2 className="text-3xl font-black text-gray-900 mb-2">End of Day Review</h2>
            <p className="text-gray-500 font-medium mb-6">Take 60 seconds to reflect before you log off.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">What did you accomplish today?</label>
                <textarea 
                  required
                  value={accomplished}
                  onChange={(e) => setAccomplished(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  placeholder="e.g., Finished 2 roadmap tasks and leveled up."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">What was difficult?</label>
                <textarea 
                  required
                  value={blocked}
                  onChange={(e) => setBlocked(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                  placeholder="e.g., Got distracted during my DSA block."
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || !accomplished || !blocked}
                className="w-full py-4 mt-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Consulting AI Coach...' : 'Generate Reflection'}
              </button>
              <button 
                type="button" 
                onClick={() => setShow(false)}
                className="w-full py-3 text-gray-400 font-semibold hover:text-gray-600 transition"
              >
                Skip for tonight
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8 text-center space-y-6">
            <span className="text-5xl">🌙</span>
            <h2 className="text-2xl font-black text-gray-900">Day Complete</h2>
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <p className="text-lg font-medium text-indigo-900 italic leading-relaxed">"{summary}"</p>
            </div>
            <button 
              onClick={() => setShow(false)}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition"
            >
              Close & Log Off
            </button>
          </div>
        )}
      </div>
    </div>
  );
}