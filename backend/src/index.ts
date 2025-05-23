import express from 'express';
import http from "http";
import { Server } from 'socket.io';
import * as mediasoup from "mediasoup";
import { createWebRtcTransport } from './webtrcTransport';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

const URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(express.json());
app.use(cors({ origin: URL, methods: ['GET', 'POST'] }));

const httpsServer = http.createServer(app);

httpsServer.listen(8080, () => {
  console.log('Listening on port: 8080');
});

const io = new Server(httpsServer, {
    cors: {
      origin: URL,  // Allow frontend to connect
      methods: ['GET', 'POST']
    }
});
interface RoomItem {
    router: any; 
    peers: string[]
}
interface PeerItem {
    roomName: string;
    socket: any;
    transports:string[];
    producers:string[];
    consumers:string[];
    peerDetails: object;
}

// Room and peer management
let worker: any;

let rooms: Record<string,RoomItem> = {}; // Room details
let peers: Record<string,PeerItem> = {}; // Peer details
// Track users in rooms
const ChatRooms: Record<string, Set<string>> = {};
// Track socket to user/room mapping
const socketUserMap = new Map<string, { username: string, roomId: string }>();


interface TransportItem{
    socketId: string;
    roomName: string;
    transport: any;
    consumer: boolean;
};
  
interface ProducerItem{
    socketId: string;
    roomName: string;
    producer: any;
};
  
interface ConsumerItem{
    socketId: string;
    roomName: string;
    consumer: any;
};
  
let transports: TransportItem[] = [];
let producers: ProducerItem[] = [];
let consumers: ConsumerItem[] = [];

const createWorker = async ()=> {
    worker = await mediasoup.createWorker({
        rtcMinPort: 2000,
        rtcMaxPort: 5000,
    });

    console.log(`Worker created with PID: ${worker.pid}`);

    worker.on("died", () => {
        console.error("Worker died unexpectedly. Exiting...");
        process.exit(1);
    });

    return worker;
};

// Initialize MediaSoup worker
(async () => {
    worker = await createWorker();
})();

// Media codecs for RTP
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
];
// Global error-catching middleware
io.use((socket, next) => {
    try {
      // Perform your validation or preprocessing
      console.log(`Incoming connection from ${socket.id}`);
      next(); // Proceed to the next middleware or event handlers
    } catch (error) {
      console.error("Global error caught:", error);
      next(new Error("Authentication error")); // Pass the error to the client
    }
});

io.on('connection', async (socket) => {
    console.log("Socket ID:"+socket.id);
    socket.emit('connection-success', { socketId: socket.id });

    try {
        const removeItems = <T extends { socketId: string; [key: string]: any }>(
            items: T[],
            socketId: string,
            type?: keyof T
            ): T[] => {
            items.forEach(item => {
                if (item.socketId === socketId && type && item[type] && typeof item[type].close === "function") {
                    item[type].close(); // Safely call `close` if it exists
                }
            });
    
            return items.filter(item => item.socketId !== socketId);
        };
    
        socket.on('disconnect', () => {
            try {
                console.log('Peer disconnected');
                consumers = removeItems(consumers, socket.id, 'consumer');
                producers = removeItems(producers, socket.id, 'producer');
                transports = removeItems(transports, socket.id, 'transport');
    
                const { roomName } = peers[socket.id];
                delete peers[socket.id];
    
                // Remove socket from room
                if (rooms[roomName]) {
                    rooms[roomName].peers = rooms[roomName].peers.filter((id) => id !== socket.id);
                }
                if (rooms[roomName].peers.length === 0) {
                    delete rooms[roomName]; // Clean up empty rooms
                }
    
                console.log(`Updated room ${roomName} state:`, rooms[roomName]);
            } catch (error:any) {
                console.log("Error while closing socket ");
            }
        });
    
        socket.on('joinRoom', async ({ roomName }, callback) => {
            try {
                const router = await createRoom(roomName, socket.id);
    
                peers[socket.id] = {
                    socket,
                    roomName,
                    transports: [],
                    producers: [],
                    consumers: [],
                    peerDetails: { name: '', isAdmin: false },
                };
                socket.join(roomName);
                socket.to(roomName).emit("newuser");
                const rtpCapabilities = router.rtpCapabilities;
                callback({ rtpCapabilities });
            } catch (error:any) {
                console.log("Join room Error:"+error);
            }
        });
    
        const createRoom = async (roomName: string, socketId: string)=> {
            try {
                let router;
                let peersList: string[] = [];
        
                if (rooms[roomName]) {
                    router = rooms[roomName].router;
                    peersList = rooms[roomName].peers;
                } else {
                    router = await worker.createRouter({ mediaCodecs });
                }
        
                console.log(`Router ID: ${router.id}, Peers: ${peersList.length}`);
        
                rooms[roomName] = {
                    router,
                    peers: [...peersList, socketId],
                };
        
                return router;
            } catch (error:any) {
                console.log("Create room Error:"+error);
            }
        };
    
        socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
            const roomName = peers[socket.id].roomName;
            const router = rooms[roomName].router;
    
            try {
                const transport = await createWebRtcTransport(router);
                callback({
                    params: {
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters,
                    },
                });
    
                addTransport(transport, roomName, consumer);
            } catch (error) {
                console.log(error);
            }
        });
    
    
        const addTransport = (transport:any, roomName: string, consumer: boolean) => {
            try {
                transports.push({ socketId: socket.id, transport, roomName, consumer });
                peers[socket.id].transports.push(transport.id);
            } catch (error:any) {
                console.log("Adding transport Error:"+error);
            }
        };
    
        const addProducer = (producer:any, roomName: string) => {
            try {
                producers.push({ socketId: socket.id, producer, roomName });
                peers[socket.id].producers.push(producer.id);
            } catch (error:any) {
                console.log("Adding producer Error:"+error);
            }
        };
    
        const addConsumer = (consumer: any, roomName: string) => {
            try {
                consumers.push({ socketId: socket.id, consumer, roomName });
                peers[socket.id].consumers.push(consumer.id);
            } catch (error:any) {
                console.log("Adding consumer Error:"+error);
            }
        };
    
        socket.on('getProducers', (callback) => {
            try {
                const { roomName } = peers[socket.id];
    
                let producerList: string[] = [];
                producers.forEach((producerData) => {
                    if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
                        producerList.push(producerData.producer.id);
                    }
                });
        
                callback(producerList);
            } catch (error:any) {
                console.log("getting producer Error:"+error);
            }
        });
    
        const informConsumers = (roomName: string, socketId: string, id: string) => {
            try {
                console.log(`Just joined, id: ${id}, room: ${roomName}, socket: ${socketId}`);
                producers.forEach((producerData) => {
                    if (producerData.socketId !== socketId && producerData.roomName === roomName) {
                        const producerSocket = peers[producerData.socketId].socket;
                        //console.log("heeeeeee");
                        producerSocket.emit('new-producer', { producerId: id });
                    }
                });
            } catch (error:any) {
                console.log("inform consumers Error:"+error)
            }
        };
    
        const getTransport = (socketId: string): any => {
            return transports.find(
                (transport) => transport.socketId === socketId && !transport.consumer
            )?.transport;
        };
    
        socket.on('transport-connect', ({ dtlsParameters }) => {
            console.log('DTLS Parameters: ', dtlsParameters);
            const transport = getTransport(socket.id);
            if (transport) {
                transport.connect({ dtlsParameters });
            }
        });
    
        socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
            try {
                const transport = getTransport(socket.id);
                if (transport) {
                    const producer = await transport.produce({ kind, rtpParameters });
                    //console.log("producer"+(producer.kind));
        
                    addProducer(producer, peers[socket.id].roomName);
        
                    informConsumers(peers[socket.id].roomName, socket.id, producer.id);
        
                    producer.on('transportclose', () => {
                        console.log('Transport for this producer closed');
                        producer.close();
                    });
        
                    callback({
                        id: producer.id,
                        kind:producer.kind,
                        producersExist: producers.length > 1,
                    });
                }
            } catch (error:any) {
                console.log("transport producer-error:"+error)
            }
        });
    
        socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
            console.log(`DTLS Params: ${dtlsParameters}`);
            const consumerTransport = transports.find(
                (transport) => transport.consumer && transport.transport.id === serverConsumerTransportId
            )?.transport;
    
            if (consumerTransport) {
                await consumerTransport.connect({ dtlsParameters });
            }
        });
    
        socket.on('consume', async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback) => {
            try {
                const { roomName } = peers[socket.id];
                const router = rooms[roomName].router;
    
                const consumerTransport = transports.find(
                    (transport) => transport.consumer && transport.transport.id === serverConsumerTransportId
                )?.transport;
    
                if (!consumerTransport) {
                    throw new Error('Transport not found');
                }
    
                if (router.canConsume({ producerId: remoteProducerId, rtpCapabilities })) {
                    const consumer = await consumerTransport.consume({
                        producerId: remoteProducerId,
                        rtpCapabilities,
                        paused: true,
                    });
                    consumer.on('transportclose', () => {
                        console.log('transport close from consumer')
                    })
            
                    consumer.on('producerclose', () => {
                        console.log('producer of consumer closed')
                        socket.emit('producer-closed', { remoteProducerId })
            
                        consumerTransport.close([])
                        transports = transports.filter(transportData => transportData.transport.id !== consumerTransport.id)
                        consumer.close()
                        consumers = consumers.filter(consumerData => consumerData.consumer.id !== consumer.id)
                    })
    
                    addConsumer(consumer, roomName);
    
                    callback({
                        params: {
                            id: consumer.id,
                            producerId: remoteProducerId,
                            kind: consumer.kind,
                            rtpParameters: consumer.rtpParameters,
                            serverConsumerId: consumer.id,
                        },
                    });
                } else {
                    callback({ error: 'Cannot consume' });
                }
            } catch (error) {
                console.log('Error in consume:', error);
            }
        });
        socket.on('consumer-resume', async ({ serverConsumerId }) => {
            console.log('consumer resume');
            
            // Find the consumer based on the serverConsumerId
            const consumerItem = consumers.find(consumerData => consumerData.consumer.id === serverConsumerId);
            
            // Ensure consumerItem is found before proceeding
            if (!consumerItem) {
              console.error(`Consumer with id ${serverConsumerId} not found`);
              return; // Exit early if consumer is not found
            }
          
            const { consumer } = consumerItem; // Now we can safely access consumer
    
            try {
              // Resume the consumer stream
              await consumer.resume();
              console.log(`Consumer with id ${serverConsumerId} resumed successfully`);
            } catch (error) {
              console.error(`Error resuming consumer with id ${serverConsumerId}:`, error);
            }
        });
        socket.on("producer-pause", ({ producerId }) => {
            try {
                const producerItem = producers.find((item) => item.producer.id === producerId);
                if (producerItem) {
                    producerItem.producer.pause();
                    console.log(`Producer ${producerId} paused`);
                    socket.to(producerItem.roomName).emit("producer-paused", { producerId });
                } else {
                    console.error(`Producer with ID ${producerId} not found`);
                }
            } catch (error:any) {
                console.error(`Error pause producer with id ${producerId}:`, error);
            }
        });
          
        socket.on("producer-resume", ({ producerId }) => {
            try {
                const producerItem = producers.find((item) => item.producer.id === producerId);
                if (producerItem) {
                    producerItem.producer.resume();
                    console.log(`Producer ${producerId} resumed`);
                    socket.to(producerItem.roomName).emit("producer-resumed", { producerId });
                } else {
                    console.error(`Producer with ID ${producerId} not found`);
                }
            } catch (error:any) {
                console.error(`Error resume producer with id ${producerId}:`, error);
            }
        }); 
        socket.on("close-producer", ({ producerId },callback) => {
            try {
                const producerItem = producers.find((item) => item.producer.id === producerId);
                if (producerItem) {
                    producerItem.producer.close();
                    producers = producers.filter((item) => item.producer.id !== producerId);
                    console.log(`Producer with ID ${producerId} has been closed.`);
                    callback({result:true})
                } else {
                    console.error(`Producer with ID ${producerId} not found.`);
                    callback({result:false})
                }
            } catch (error:any) {
                console.error(`closing producer error`);
                callback({result:false})
            }
        });
        let imageUrl:any;
        socket.on("joinBoardRoom",({roomName})=>{
            socket.join(roomName);
            console.log("new user join drawing room:"+roomName);
            socket.to(roomName).emit("drawingresponse",{imageUrl}) 
        })
        socket.on("drawing", ({canvasImage,roomName})=>{
            console.log(roomName);
            imageUrl=canvasImage;
            socket.to(roomName).emit("drawingresponse",{canvasImage})
        })

        socket.on("joinChatRoom", ({ username, roomId }: { username: string; roomId: string }) => {
            const existingUser = socketUserMap.get(socket.id);
        
            const oldRoomId = existingUser?.roomId;
            const isSwitchingRoom = oldRoomId && oldRoomId !== roomId;
        
            // If user is switching rooms
            if (isSwitchingRoom) {
                // Leave old room in Socket.IO
                socket.leave(oldRoomId);
        
                // Remove from old room set
                if (ChatRooms[oldRoomId]) {
                    ChatRooms[oldRoomId].delete(username);
        
                    // Notify others
                    socket.to(oldRoomId).emit("message", {
                        id: Date.now().toString(),
                        content: `${username} has left the chat`,
                        sender: "system",
                        timestamp: new Date(),
                    });
        
                    // Delete room if empty
                    if (ChatRooms[oldRoomId].size === 0) {
                        delete ChatRooms[oldRoomId];
                    }
                }
            }
        
            // Join new room
            socket.join(roomId);
        
            // Initialize new room
            if (!ChatRooms[roomId]) {
                ChatRooms[roomId] = new Set();
            }
        
            // Add user to new room
            ChatRooms[roomId].add(username);
        
            // Update socket-user mapping
            socketUserMap.set(socket.id, { username, roomId });
        
            // Notify room about new user
            socket.to(roomId).emit("message", {
                id: Date.now().toString(),
                content: `${username} has joined the chat`,
                sender: "system",
                timestamp: new Date(),
            });
        
            // Confirm to the user
            socket.emit("room-joined", {
                roomId,
                message: `You have joined ${roomId}`,
            });
        
            console.log(`User ${username} joined room: ${roomId}`);
        });
        
        // Message handling
        socket.on('message', (message) => {
            // Retrieve current room from the map
            const userInfo = socketUserMap.get(socket.id);
            if (!userInfo) return;
            
            // Broadcast message to all users in the room except sender
            socket.to(userInfo.roomId).emit('message', {
                ...message,
                sender: 'other', // Change sender to 'other' for recipients
                username:userInfo.username
            });
        });
        
        // Typing indicators
        socket.on('typing', () => {
            const userInfo = socketUserMap.get(socket.id);
            if (!userInfo) return;
            
            socket.to(userInfo.roomId).emit('typing', userInfo.username);
        });
        
        socket.on('stop-typing', () => {
            const userInfo = socketUserMap.get(socket.id);
            if (!userInfo) return;
            
            socket.to(userInfo.roomId).emit('stop-typing', userInfo.username);
        });
        
        // Handle disconnect
        socket.on('disconnect', () => {
            // Retrieve user info from our map
            const userInfo = socketUserMap.get(socket.id);
            
            if (userInfo) {
            const { username, roomId } = userInfo;
            console.log(`User disconnected: ${username} from room: ${roomId}`);
            
            // Remove user from our mapping
            socketUserMap.delete(socket.id);
            
            if (ChatRooms[roomId]) {
                // Remove user from room
                ChatRooms[roomId].delete(username);
                
                // Remove room if empty
                if (ChatRooms[roomId].size === 0) {
                    delete ChatRooms[roomId];
                    console.log(`Room ${roomId} was deleted as it's now empty`);
                } else {
                    // Notify room about user leaving
                    socket.to(roomId).emit('message', {
                        id: Date.now().toString(),
                        content: `${username} has left the chat`,
                        sender: 'system',
                        timestamp: new Date()
                    });
                }
            }
            } else {
                console.log(`Socket ${socket.id} disconnected (user info not found)`);
            }
        });
        
        // Handle user explicitly leaving a room
        socket.on('leave-room', () => {
            const userInfo = socketUserMap.get(socket.id);
            if (!userInfo) return;
            
            const { username, roomId } = userInfo;
            
            // Remove from room
            if (ChatRooms[roomId]) {
                ChatRooms[roomId].delete(username);
            
                // Notify others in the room
                socket.to(roomId).emit('message', {
                    id: Date.now().toString(),
                    content: `${username} has left the chat`,
                    sender: 'system',
                    timestamp: new Date()
                });
            
                // Remove room if empty
                if (ChatRooms[roomId].size === 0) {
                    delete ChatRooms[roomId];
                    console.log(`Room ${roomId} was deleted as it's now empty`);
                }
            }
            
            // Leave the Socket.io room
            socket.leave(roomId);
        });
        // Handle user joining a new room
        socket.on('join-chat-room', (newRoomId: string) => {
            const userInfo = socketUserMap.get(socket.id);
            if (!userInfo) return;
            
            const { username, roomId: oldRoomId } = userInfo;
            
            // Leave old room first
            if (oldRoomId !== newRoomId) {
                // Remove from old room
                if (ChatRooms[oldRoomId]) {
                    ChatRooms[oldRoomId].delete(username);
                    
                    // Notify others in old room
                    socket.to(oldRoomId).emit('message', {
                        id: Date.now().toString(),
                        content: `${username} has left the chat`,
                        sender: 'system',
                        timestamp: new Date()
                    });
                    
                    // Remove old room if empty
                    if (ChatRooms[oldRoomId].size === 0) {
                        delete ChatRooms[oldRoomId];
                    }
                }
            
                // Leave Socket.io room
                socket.leave(oldRoomId);
            
                // Join new room
                socket.join(newRoomId);
            
                // Initialize new room if it doesn't exist
                if (!ChatRooms[newRoomId]) {
                    ChatRooms[newRoomId] = new Set();
                }
            
                // Add user to new room
                ChatRooms[newRoomId].add(username);
            
                // Update user info in our map
                socketUserMap.set(socket.id, { username, roomId: newRoomId });
                
                // Notify new room about user joining
                socket.to(newRoomId).emit('message', {
                    id: Date.now().toString(),
                    content: `${username} has joined the chat`,
                    sender: 'system',
                    timestamp: new Date()
                });
                
                // Confirm room change to the user
                socket.emit('room-changed', { 
                    roomId: newRoomId,
                    message: `You have joined ${newRoomId}`
                });
            }
        });
  
       
        
    } catch (error:any) {
        console.log("Internal server Error:"+error);
    }
      
});
