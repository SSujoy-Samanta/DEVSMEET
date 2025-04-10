// atoms/socketAtom.ts
import { selector } from 'recoil';
import { io, Socket } from 'socket.io-client';

const WEBSOCKET_SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';

// Recoil selector to handle the socket initialization
export const socketState = selector<Socket | null>({
    key: 'socketState', // Unique key for the selector
    get: async () => {
        const socket = io(WEBSOCKET_SERVER_URL, {
            transports: ['websocket'],
        });

        return new Promise((resolve, reject) => {
            socket.on('connect', () => {
                console.log('Connected to WebSocket server');
                resolve(socket); // Resolve with the socket when it's connected
            });

            socket.on('error', (error) => {
                console.error('WebSocket Error:', error);
                reject(error); // Reject the promise if there's an error
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from WebSocket server');
            });
        });
    }
});
