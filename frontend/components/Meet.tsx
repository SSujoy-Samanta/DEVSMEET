"use client"
import React, { useState, useEffect, useCallback } from 'react';
import {  Grid, Maximize, X, Menu, ChevronRight, ChevronLeft, MoreVertical,  } from 'lucide-react';
import { Board } from './WhiteBoard/Board';
import { StreamMedia } from './MeadiaStream';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChatApp } from './ChatApp';
import { FancyAnimatedChatButton } from './Buttons/MsgButton';

export default function CollaborationPlatform({roomName}:{roomName:string}) {
    const router=useRouter();
    // Use client-side only rendering for components that cause hydration issues
    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
    const [, setIsFullscreen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState('video'); // 'video' or 'whiteboard'
    const [, setIsToolbarCollapsed] = useState<boolean>(false);
    const [showMobileControls, setShowMobileControls] = useState<boolean>(true);
    const [isMsg,setMsg]=useState<boolean>(false);

    const endCall = () => {
        if (window.confirm("Are you sure you want to leave the call?")) {
            router.push('/home');
        }
    };
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const room = searchParams.get('roomName');

    const inviteURL = typeof window !== 'undefined'
        ? `${window.location.origin}${pathname}?roomName=${room}`
        : '';
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(inviteURL)
          .then(() => alert("Invite link copied!"))
          .catch(err => console.error("Failed to copy: ", err));
    }, [inviteURL]);
    

    // This effect runs only on the client after hydration is complete
    useEffect(() => {
        setIsMounted(true);

        // Responsive adjustments based on screen size
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
                setIsToolbarCollapsed(true);
            } else if (window.innerWidth >= 1280) {
                setIsSidebarOpen(true);
                setIsToolbarCollapsed(false);
            }
        };

        // Set initial state based on screen size
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Remove event listener on component unmount
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Auto-hide mobile controls after 3 seconds of inactivity
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        if (showMobileControls) {
            timeout = setTimeout(() => {
                if (window.innerWidth < 640) {
                    setShowMobileControls(false);
                }
            }, 3000);
        }

        return () => clearTimeout(timeout);
    }, [showMobileControls, isMounted]);


    // Mock participant data
    const participants = [
        { id: 1, name: "You", isHost: true },
        { id: 2, name: "Sarah Miller", isHost: false },
        { id: 3, name: "Alex Johnson", isHost: false },
        { id: 4, name: "Jamie Lee", isHost: false },
        { id: 5, name: "Taylor Wong", isHost: false },
        { id: 6, name: "Michael Chen", isHost: false },
        { id: 7, name: "Priya Patel", isHost: false },
        { id: 8, name: "David Rodriguez", isHost: false },
        { id: 9, name: "Olivia Smith", isHost: false },
        { id: 10, name: "Zaid Hassan", isHost: false },
    ];
    // Toggle mobile controls
    const handleScreenTouch = () => {
        if (window.innerWidth < 640) {
            setShowMobileControls(true);
        }
    };

    return (
        <div
            className="flex flex-col lg:flex-row h-screen bg-white text-slate-800 overflow-hidden"
            onClick={handleScreenTouch}
        >
            {/* Main content area */}
            <div className="flex flex-col flex-1 h-full">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 p-2 sm:p-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-full hover:bg-slate-100 hidden lg:block"
                        >
                            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="p-2 rounded-full hover:bg-slate-100 lg:hidden"
                        >
                            <Menu size={20} />
                        </button>
                        <h1 className="text-lg sm:text-xl font-semibold ml-2">DevsMeet</h1>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                    
                        <button className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 sm:py-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium" onClick={endCall}>
                            <span className="hidden sm:inline">End Call</span>
                            <span className="sm:hidden">End</span>
                        </button>
                    </div>
                </header>

                {/* Main content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Mode switcher */}
                    <div className="bg-white p-1 sm:p-2 flex justify-center border-b border-slate-200">
                        <div className="inline-flex rounded-lg bg-slate-100 p-1">
                            <button
                                onClick={() => setActiveTab('video')}
                                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${activeTab === 'video' ? 'bg-white shadow' : 'hover:bg-slate-200'}`}
                            >
                                Video Call
                            </button>
                            <button
                                onClick={() => setActiveTab('whiteboard')}
                                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${activeTab === 'whiteboard' ? 'bg-white shadow' : 'hover:bg-slate-200'}`}
                            >
                                Board
                            </button>
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 relative overflow-y-scroll overflow-x-hidden">
                        <div className={`${activeTab==="video"?"visible":"hidden"} absolute bg-white inset-0 p-1 sm:p-2 md:p-4`}>
                            <StreamMedia roomName={roomName}/>
                            {/* Video grid - responsive columns */}
                            {/* <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-2 md:gap-4 h-full">
                                <StreamMediaPro21 roomName='hello'/>
                            </div> */}
                        </div>
                        <div className={`${activeTab!=="video"?"visible":"hidden"} absolute inset-0 flex flex-col p-4 overflow-hidden`}>
                            {/* Whiteboard tools - with responsive display */}
                            <Board roomName={roomName}/>
                        </div>
                    </div>

                    {/* Control bar - with responsive controls and auto-hide for mobile */}
                    <div className={`bg-white border-t border-slate-200 p-2 sm:p-4 flex justify-end items-center transition-opacity duration-300 ${showMobileControls || window.innerWidth >= 640 ? 'opacity-100' : 'opacity-0'}`}>
                        

                        <div className="flex gap-1 sm:gap-3">
                            <button className="p-2 sm:p-3 rounded-full bg-slate-100 hover:bg-slate-200 hidden sm:block">
                                <Grid size={20} />
                            </button>
                            <button onClick={() => setIsFullscreen(x=>!x)} className="p-2 sm:p-3 rounded-full bg-slate-100 hover:bg-slate-200">
                                <Maximize size={18} className="sm:hidden" />
                                <Maximize size={20} className="hidden sm:block" />
                            </button>
                            <FancyAnimatedChatButton onClick={()=>{setMsg(x=>!x)}} isActive={isMsg}/>
                            
                        </div>
                    </div>
                </main>
            </div>
            {
                isMsg && <div className='absolute md:right-8 bottom-16 md:bottom-32 z-20 w-full md:w-3/6 flex items-center justify-center overflow-hidden h-4/6'>
                    <ChatApp roomName={roomName}/>
                </div>
            }

            {/* Desktop Sidebar */}
            {isSidebarOpen && (
                <aside className="hidden lg:flex w-64 xl:w-80 border-l border-slate-200 bg-white flex-col">
                    <div className="p-4 border-b border-slate-200 flex justify-end items-center">
    
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-full hover:bg-slate-100">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <ul className="divide-y divide-slate-100">
                            {participants.map((participant) => (
                                <li key={participant.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                                            {participant.name.charAt(0)}
                                        </div>
                                        <span>{participant.name} {participant.isHost && <span className="text-xs text-slate-500">(Host)</span>}</span>
                                    </div>
                                    {participant.id !== 1 && (
                                        <button className="text-slate-400 hover:text-slate-600">
                                            <MoreVertical size={16} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-4 border-t border-slate-200">
                        <h3 className="font-medium mb-2">Meeting Details</h3>
                        <div className="bg-slate-50 p-3 rounded-md">
                            <div className="text-sm text-slate-600 mb-1">Meeting ID: {roomName}</div>
                            <div className="text-sm text-slate-600">Invite Link: <button onClick={handleCopy} className="text-indigo-500 hover:text-indigo-600">Copy</button></div>
                        </div>
                    </div>
                </aside>
            )}

            {/* Mobile Sidebar - Slide-in drawer */}
            {isMobileSidebarOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    ></div>

                    {/* Drawer */}
                    <aside className="fixed inset-y-0 right-0 w-64 sm:w-72 bg-white shadow-xl z-50 flex flex-col lg:hidden">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="font-semibold">Participants ({participants.length})</h2>
                            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1 rounded-full hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <ul className="divide-y divide-slate-100">
                                {participants.map((participant) => (
                                    <li key={participant.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                                                {participant.name.charAt(0)}
                                            </div>
                                            <span>{participant.name} {participant.isHost && <span className="text-xs text-slate-500">(Host)</span>}</span>
                                        </div>
                                        {participant.id !== 1 && (
                                            <button className="text-slate-400 hover:text-slate-600">
                                                <MoreVertical size={16} />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-4 border-t border-slate-200">
                            <h3 className="font-medium mb-2">Meeting Details</h3>
                            <div className="bg-slate-50 p-3 rounded-md">
                                <div className="text-sm text-slate-600 mb-1">Meeting ID: 824-391-065</div>
                                <div className="text-sm text-slate-600">Invite Link: <button className="text-indigo-500 hover:text-indigo-600">Copy</button></div>
                            </div>
                        </div>
                    </aside>
                </>
            )}

            {/* Add custom breakpoint for extra small screens */}
            <style jsx global>{`
        @media (min-width: 480px) {
          .xs\\:block {
            display: block;
          }
          .xs\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .xs\\:hidden {
            display: none;
          }
        }
      `}</style>
        </div>
    );
}