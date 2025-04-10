import { io, Socket } from "socket.io-client";

const WEBSOCKET_SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080";

let socket: Socket;

export const initializeSocket = () => {
    if (!socket) {
        socket = io(WEBSOCKET_SERVER_URL, {
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            console.log("Connected to WebSocket server");
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from WebSocket server");
        });

        socket.on("error", (error) => {
            console.error("WebSocket Error:", error);
        });
    }
    return socket;
};

export const getSocket = () => {
    let socket=initializeSocket();
    if (!socket) {
        throw new Error("WebSocket is not initialized. Call initializeSocket first.");
    }
    return socket;
};
