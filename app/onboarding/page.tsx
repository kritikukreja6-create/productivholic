'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function OnboardingFlow() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // UI State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Data
  const [role, setRole] = useState('');
  const [age, setAge] = useState('');
  const [interests, setInterests] = useState<{ id: string, name: string }[]>([]);
  const [selectedInterestId, setSelectedInterestId] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  // Fetch the fields of interest directly from the database on load
  useEffect(() => {
    const fetchInterests = async () => {
      const { data } = await supabase.from('fields_of_interest').select('*');
      if (data) setInterests(data);
    };
    fetchInterests();
  }, [supabase]);

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setError("Authentication error. Please log in again.");
      setLoading(false);
      return;
    }

    // 1. Save the private responses
    const { error: insertError } = await supabase
      .from('onboarding_responses')
      .insert({
        user_id: user.id,
        role: role,
        age: parseInt(age),
        field_of_interest_id: selectedInterestId,
        skill_level: skillLevel
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // 2. Unlock the public profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Redirect to the main dashboard
    window.location.href = '/dashboard';
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-gray-800">
        
        {/* Dynamic Progress Indicator */}
        <div className="mb-6 flex justify-between text-sm text-gray-400">
          <span className={step >= 1 ? 'text-blue-600 font-bold' : ''}>1. Basics</span>
          <span className={step >= 2 ? 'text-blue-600 font-bold' : ''}>2. Goals</span>
          <span className={step >= 3 ? 'text-blue-600 font-bold' : ''}>3. Experience</span>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

        {/* STEP 1: Baseline Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Tell us about yourself</h2>
            <div>
              <label className="block text-sm font-medium mb-1">I am a...</label>
              <select 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Select a role</option>
                <option value="student">Student</option>
                <option value="professional">Professional</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              <input 
                type="number" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <button 
              disabled={!role || !age}
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 mt-4"
            >
              Next
            </button>
          </div>
        )}

        {/* STEP 2: The Goal */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">What is your primary focus?</h2>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => setSelectedInterestId(interest.id)}
                  className={`p-3 border rounded text-left ${selectedInterestId === interest.id ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {interest.name}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-800">Back</button>
              <button 
                disabled={!selectedInterestId}
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Branching Logic */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">What is your current skill level?</h2>
            <div className="space-y-3 mt-4">
              <button
                onClick={() => setSkillLevel('beginner')}
                className={`w-full p-4 border rounded text-left ${skillLevel === 'beginner' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="font-bold">I am a Beginner</div>
                <div className="text-sm text-gray-500">I need introductions and step-by-step guidance.</div>
              </button>
              <button
                onClick={() => setSkillLevel('experienced')}
                className={`w-full p-4 border rounded text-left ${skillLevel === 'experienced' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="font-bold">I have Experience</div>
                <div className="text-sm text-gray-500">I want to jump straight into active goals and matchmaking.</div>
              </button>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-800">Back</button>
              <button 
                disabled={!skillLevel || loading}
                onClick={handleComplete}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}