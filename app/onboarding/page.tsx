'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function OnboardingFlow() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [step, setStep] = useState(1);
  const [age, setAge] = useState('');
  const [interests, setInterests] = useState<{ id: string; name: string }[]>([]);
  const [selectedInterestId, setSelectedInterestId] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // THE FIX: Using .upsert() instead of .insert() to prevent duplicate key crashes
    const { error: submitError } = await supabase
      .from('onboarding_responses')
      .upsert({
        user_id: user.id,
        age: parseInt(age) || null,
        field_of_interest_id: selectedInterestId || null,
        skill_level: skillLevel,
      });

    if (submitError) {
      setError(submitError.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-8">
        
        {/* Step Indicator Header */}
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div className={`text-sm font-bold ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>1. Basics</div>
          <div className={`text-sm font-bold ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>2. Goals</div>
          <div className={`text-sm font-bold ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>3. Experience</div>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Let's start with the basics.</h2>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">How old are you?</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
            </div>
            <div className="flex justify-end pt-4">
              <button
                disabled={!age}
                onClick={() => setStep(2)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: GOALS */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">What are your primary goals?</h2>
            <div className="grid grid-cols-1 gap-3">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => setSelectedInterestId(interest.id)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    selectedInterestId === interest.id
                      ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                      : 'border-gray-200 hover:border-blue-300 text-gray-700'
                  }`}
                >
                  <span className="font-semibold">{interest.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="text-gray-500 font-medium hover:text-gray-800"
              >
                Back
              </button>
              <button
                disabled={!selectedInterestId}
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: EXPERIENCE */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 mb-4">What is your current skill level?</h2>
            
            <button
              onClick={() => setSkillLevel('beginner')}
              className={`w-full p-5 border rounded-lg text-left transition-all ${
                skillLevel === 'beginner'
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-bold text-gray-900 text-lg">I am a Beginner</div>
              <div className="text-sm text-gray-500 mt-1">I need introductions and step-by-step guidance.</div>
            </button>

            <button
              onClick={() => setSkillLevel('experienced')}
              className={`w-full p-5 border rounded-lg text-left transition-all ${
                skillLevel === 'experienced'
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-bold text-gray-900 text-lg">I have Experience</div>
              <div className="text-sm text-gray-500 mt-1">I want to jump straight into active goals and matchmaking.</div>
            </button>

            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep(2)}
                className="text-gray-500 font-medium hover:text-gray-800"
              >
                Back
              </button>
              <button
                disabled={!skillLevel || loading}
                onClick={handleComplete}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition shadow-md"
              >
                {loading ? 'Saving...' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}