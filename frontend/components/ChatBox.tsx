"use client"
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

// Define our message type
interface Message {
    id: string;
    content: string;
    sender: 'user' | 'other';
    username?:string;
    timestamp: Date;
}

// Props for our ChatBox component
interface ChatBoxProps {
    username: string;
    roomId?: string;
    initialMessages?: Message[];
}

export const ChatBox: React.FC<ChatBoxProps> = ({
    username,
    roomId = 'general',
    initialMessages = []
}) => {
    // State
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputMessage, setInputMessage] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Connect to Socket.io server
    useEffect(() => {
        const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080');

        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            setIsConnected(true);
            socketInstance.emit("joinChatRoom",{
                username,
                roomId
            })
            console.log('Connected to chat server');
        });

        socketInstance.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from chat server');
        });

        socketInstance.on('message', (message: Message) => {
            console.log(JSON.stringify(message))
            setMessages(prevMessages => [...prevMessages, message]);
        });

        socketInstance.on('typing', (user: string) => {
            if (user !== username) {
                setTypingUsers(prev =>
                    prev.includes(user) ? prev : [...prev, user]
                );
            }
        });

        socketInstance.on('stop-typing', (user: string) => {
            setTypingUsers(prev => prev.filter(u => u !== user));
        });

        // Cleanup on unmount
        return () => {
            socketInstance.disconnect();
        };
    }, [username, roomId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle typing indicator
    useEffect(() => {
        const typingTimeout = setTimeout(() => {
            if (isTyping && socket) {
                socket.emit('stop-typing', username);
                setIsTyping(false);
            }
        }, 2000);

        return () => clearTimeout(typingTimeout);
    }, [inputMessage, isTyping, socket, username]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);

        if (!isTyping && socket) {
            socket.emit('typing', username);
            setIsTyping(true);
        }
    };

    const sendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();

        if (inputMessage.trim() && socket) {
            const newMessage: Message = {
                id: Date.now().toString(),
                content: inputMessage,
                sender: 'user',
                timestamp: new Date()
            };

            socket.emit('message', newMessage);
            setMessages(prevMessages => [...prevMessages, newMessage]);
            setInputMessage('');
            socket.emit('stop-typing', username);
            setIsTyping(false);
        }
    };

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col bg-white rounded-lg shadow-xl h-full min-w-xl w-full mx-auto overflow-hidden">
            {/* Chat header */}
            <div className="bg-indigo-600 text-white px-4 py-2 md:py-5 flex items-center justify-between">
                <div className="flex items-center">
                    <h2 className="font-semibold text-lg">{roomId}</h2>
                    <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`}></div>
                </div>
                <div className="text-sm md:text-xl opacity-80">
                    {username}
                </div>
            </div>

            {/* Messages section */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`mb-3 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`px-4 py-2 rounded-lg max-w-xs break-words ${message.sender === 'user'
                                        ? 'bg-indigo-500 text-white rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                {message.username && <p className='text-xs'>{message.username}</p>}
                                <div className="text-sm">{message.content}</div>
                                <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
                                    {formatTime(message.timestamp)}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="text-gray-500 text-xs italic mb-2">
                        {typingUsers.length === 1
                            ? `${typingUsers[0]} is typing...`
                            : `${typingUsers.length} people are typing...`}
                        <div className="inline-block">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse delay-75">.</span>
                            <span className="animate-pulse delay-150">.</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form
                onSubmit={sendMessage}
                className="border-t border-gray-200 p-3 flex items-center bg-white"
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 md:py-5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className={`ml-2 p-2 rounded-full ${inputMessage.trim() ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'
                        } focus:outline-none`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                </motion.button>
            </form>
        </div>
    );
};