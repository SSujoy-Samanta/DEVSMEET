
import { Board } from "@/components/WhiteBoard/Board";
import { redirect } from "next/navigation";

export default async function WhiteBoard({
    searchParams,
}: {
    searchParams?: { roomName?: string };
}) {
    const roomName=searchParams?.roomName

    if (!roomName || roomName.length === 0) {
        redirect("/home"); 
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
            <header className="w-full max-w-6xl mb-8">
                <h1 className='text-5xl font-bold text-gray-800 text-center bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 bg-clip-text text-transparent transition-all duration-300 ease-in-out'>
                    Collaborative Whiteboard
                </h1>
                <p className="text-gray-600 text-center mt-2 text-lg">
                    Share your ideas with your team in real-time
                </p>
            </header>

            <div className="w-full max-w-6xl rounded-xl overflow-hidden">
                
                <div className="relative">
                    <Board roomName={roomName} />
                </div>
                
            </div>

            <footer className="mt-8 text-gray-500 text-sm">
                Draw, collaborate, and bring your ideas to life
            </footer>
        </div>
    );
}
