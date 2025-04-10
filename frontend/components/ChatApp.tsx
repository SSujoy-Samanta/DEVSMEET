"use client"
import React, { useState } from 'react';
import { ChatBox } from './ChatBox';
import {motion} from "framer-motion";
interface ChatAppProps {
    roomName: string;
}
export const ChatApp: React.FC<ChatAppProps>= ({roomName}) => {
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('general');
    const [isJoined, setIsJoined] = useState(false);

    const handleJoinChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim()) {
            setIsJoined(true);
        }
    };

    return (
        <div className="overflow-hidden flex w-full h-full justify-center items-center p-4">
            {!isJoined ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
                >
                    <h1 className="text-2xl font-bold text-center text-indigo-600 mb-6">Join Chat</h1>
                    <form onSubmit={handleJoinChat}>
                        <div className="mb-4">
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1">
                                Chat Room
                            </label>
                            <select
                                id="room"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value={roomName}>{roomName}</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Join Chat
                        </button>
                    </form>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full max-w-2xl h-full"
                >
                    <ChatBox username={username} roomId={roomId} />
                </motion.div>
            )}
        </div>
    );
};
