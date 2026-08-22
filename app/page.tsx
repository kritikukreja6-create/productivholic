import AuthFlow from './components/AuthFlow';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full">
        <AuthFlow />
      </div>
    </main>
  );
}