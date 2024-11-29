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
        rtcMaxPort: 2200,
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

io.on('connection', async (socket) => {
    console.log("Socket ID:"+socket.id);
    socket.emit('connection-success', { socketId: socket.id });

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
        const router = await createRoom(roomName, socket.id);

        peers[socket.id] = {
            socket,
            roomName,
            transports: [],
            producers: [],
            consumers: [],
            peerDetails: { name: '', isAdmin: false },
        };

        const rtpCapabilities = router.rtpCapabilities;
        callback({ rtpCapabilities });
    });

    const createRoom = async (roomName: string, socketId: string)=> {
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
        transports.push({ socketId: socket.id, transport, roomName, consumer });
        peers[socket.id].transports.push(transport.id);
    };

    const addProducer = (producer:any, roomName: string) => {
        producers.push({ socketId: socket.id, producer, roomName });
        peers[socket.id].producers.push(producer.id);
    };

    const addConsumer = (consumer: any, roomName: string) => {
        consumers.push({ socketId: socket.id, consumer, roomName });
        peers[socket.id].consumers.push(consumer.id);
    };

    socket.on('getProducers', (callback) => {
        const { roomName } = peers[socket.id];

        let producerList: string[] = [];
        producers.forEach((producerData) => {
        if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
            producerList.push(producerData.producer.id);
        }
        });

        callback(producerList);
    });

    const informConsumers = (roomName: string, socketId: string, id: string) => {
        console.log(`Just joined, id: ${id}, room: ${roomName}, socket: ${socketId}`);
        producers.forEach((producerData) => {
        if (producerData.socketId !== socketId && producerData.roomName === roomName) {
            const producerSocket = peers[producerData.socketId].socket;
            producerSocket.emit('new-producer', { producerId: id });
        }
        });
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
        const transport = getTransport(socket.id);
        if (transport) {
            const producer = await transport.produce({ kind, rtpParameters });
            addProducer(producer, peers[socket.id].roomName);

            informConsumers(peers[socket.id].roomName, socket.id, producer.id);

            producer.on('transportclose', () => {
                console.log('Transport for this producer closed');
                producer.close();
            });

            callback({
                id: producer.id,
                producersExist: producers.length > 1,
            });
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
});
