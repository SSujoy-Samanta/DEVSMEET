"use client"
import { useState, useEffect } from 'react';
import { Video, Users, Copy, ArrowRight, Pencil, Plus, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CollaborationDashboard() {
    const router=useRouter();
    const [roomName, setRoomName] = useState('');
    const [copied, setCopied] = useState<boolean>(false);
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'video'| 'whiteboard'>('video'); // 'video' or 'whiteboard'
    const [mode, setMode] = useState('join'); // 'join' or 'create'

    // Generate a random room name with adjective-noun format
    const generateRoomName = () => {
        const adjectives = ['Happy', 'Bright', 'Swift', 'Clever', 'Calm', 'Gentle', 'Bold', 'Brave', 'Wise', 'Merry'];
        const nouns = ['Dolphin', 'Galaxy', 'Summit', 'Phoenix', 'Ocean', 'Forest', 'Mountain', 'River', 'Meadow', 'Eagle'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        return `${randomAdj}${randomNoun}${randomNum}`;
    };

    const handleGenerate = () => {
        setRoomName(generateRoomName());
    };

    const handleCopyRoomName = () => {
        navigator.clipboard.writeText(roomName);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoinRoom = () => {
        setIsJoining(true);
        if(activeTab==='video'){
            if(roomName.length!=0){
                router.push(`/meet?roomName=${roomName}`)
            }
        }
        if(activeTab==="whiteboard"){
            if(roomName.length!=0){
                router.push(`/board?roomName=${roomName}`)
            }
        }
        setTimeout(() => setIsJoining(false), 1500);
    };

    // Auto-generate a room name on first load or when switching modes
    useEffect(() => {
        if (mode === 'create') {
            handleGenerate();
        } else {
            setRoomName('');
        }
    }, [mode]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800/20 to-indigo-500 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white text-center">
                    <div className="flex justify-center mb-3">
                        <div className="relative">
                            {activeTab === 'video' ?
                                <Video size={32} className="animate-pulse" /> :
                                <Pencil size={32} className="animate-pulse" />
                            }
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full"></span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold">
                        {activeTab === 'video' ? 'Video Connect' : 'Collaborative Whiteboard'}
                    </h1>
                    <p className="text-indigo-200 mt-1">
                        {mode === 'create' ? 'Create a new session' : 'Join an existing session'}
                    </p>
                </div>

                {/* Tab Selection */}
                <div className="flex border-b border-gray-200">
                    <button
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 ${activeTab === 'video'
                                ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('video')}
                    >
                        <Video size={18} />
                        <span>Video Call</span>
                    </button>
                    <button
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 ${activeTab === 'whiteboard'
                                ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('whiteboard')}
                    >
                        <Pencil size={18} />
                        <span>Whiteboard</span>
                    </button>
                </div>

                {/* Toggle Create/Join */}
                <div className="flex rounded-lg bg-gray-100 p-1 mx-6 mt-6">
                    <button
                        className={`flex-1 py-2 rounded-md flex items-center justify-center transition-colors ${mode === 'join' ? 'bg-white shadow-sm text-indigo-600 font-medium' : 'text-gray-500'
                            }`}
                        onClick={() => setMode('join')}
                    >
                        <Users size={16} className="mr-2" />
                        Join
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-md flex items-center justify-center transition-colors ${mode === 'create' ? 'bg-white shadow-sm text-indigo-600 font-medium' : 'text-gray-500'
                            }`}
                        onClick={() => setMode('create')}
                    >
                        <Plus size={16} className="mr-2" />
                        Create New
                    </button>
                </div>

                <div className="p-6">
                    {/* Room name section */}
                    <div className="mb-6">
                        <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Monitor size={16} className="mr-2" />
                            {mode === 'create' ? 'Your Room Name' : 'Enter Room Name'}
                        </label>

                        <div className="relative">
                            <input
                                type="text"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                placeholder={mode === 'create' ? "Your generated room name" : "Enter room name to join"}
                            />
                            {mode === 'create' && (
                                <button
                                    onClick={handleCopyRoomName}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors"
                                    title="Copy room name"
                                >
                                    {copied ? <span className="text-green-500 text-sm font-medium">Copied!</span> : <Copy size={18} />}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        {mode === 'create' && (
                            <button
                                onClick={handleGenerate}
                                className="py-3 px-4 bg-gray-100 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                            >
                                Generate New
                            </button>
                        )}

                        <button
                            onClick={handleJoinRoom}
                            disabled={!roomName.trim()}
                            className={`py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-all ${mode === 'create' ? 'col-span-1' : 'col-span-2'
                                } ${roomName.trim()
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                        >
                            {isJoining ? (
                                <span className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                            ) : (
                                <ArrowRight size={18} className="mr-2" />
                            )}
                            {mode === 'create' ? 'Start Session' : 'Join Session'}
                        </button>
                    </div>

                    {/* Help text */}
                    <p className="text-xs text-gray-500 mt-6 text-center">
                        {mode === 'create'
                            ? "Share the room name with participants you want to invite"
                            : "Ask the host for the room name to join their session"
                        }
                    </p>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-100">
                    <div className="flex items-center justify-center space-x-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-600">
                            {activeTab === 'video'
                                ? "Secure video connection ready"
                                : "Real-time whiteboard collaboration ready"
                            }
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}