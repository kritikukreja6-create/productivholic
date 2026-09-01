import RoomClient from './RoomClient';
export default async function FocusRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  // Await params to fix the 404 dynamic route error
  const resolvedParams = await params;
  
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <RoomClient roomId={resolvedParams.roomId} />
    </main>
  );
}