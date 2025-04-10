'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const WEBSOCKET_SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';

interface SocketContextType {
    socket: Socket | undefined;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | undefined>(undefined);

    useEffect(() => {
        const newSocket = io(WEBSOCKET_SERVER_URL, {
            transports: ['websocket'],
        });
        setSocket(newSocket);

        // Event listeners
        newSocket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        newSocket.on('error', (error) => {
            console.error('WebSocket Error:', error);
        });

        // Cleanup on unmount
        return () => {
            newSocket.disconnect();
            setSocket(undefined);
        };
    }, []);

    // Memoize the context value to avoid unnecessary re-renders
    const contextValue = useMemo(() => ({ socket }), [socket]);

    return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};

// Custom hook to access the socket context
export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
