'use client';
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, Phone, Monitor, X } from "lucide-react";
import { AiOutlineAudioMuted } from "react-icons/ai";
import { useRouter } from "next/navigation";

const URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080";

interface StreamMediaProps {
    roomName: string;
}

export const StreamMedia = ({ roomName = "sujoy" }: StreamMediaProps) => {
    const router=useRouter();
    const socket = useRef<any>(null);
    const device = useRef<mediasoupClient.Device | null>(null);
    const GlobalTransport = useRef<mediasoupClient.types.Transport | null>(null);
    const consumerTransports = useRef<any[]>([]);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const localScreenStreamRef = useRef<MediaStream | null>(null);
    const localScreenVideoContainerRef = useRef<HTMLDivElement>(null);

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    
    const [showControls, setShowControls] = useState(true);
    const [notification, setNotification] = useState<{ message: string, type: string } | null>(null);

  

    const [producers, setProducers] = useState({
        audio: null as string | null,
        video: null as string | null,
        screen: null as string | null,
    });


    const params = useMemo(
        () => ({
            encodings: [
                { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" },
                { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" },
                { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" },
            ],
            codecOptions: { videoGoogleStartBitrate: 1000 },
        }),
        []
    );

    // Show notification for 3 seconds
    const showNotification = (message: string, type: string = "info") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Auto-hide controls after inactivity
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const handleActivity = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 5000);
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('keydown', handleActivity);

        handleActivity(); // Initial setup

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, []);

    const getLocalStream = useCallback(() => {
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: { width: { min: 100, max: 300 }, height: { min: 200, max: 400 } },
            })
            .then((stream) => {
                localStreamRef.current = stream;
                const videoElement = document.createElement("video");
                videoElement.srcObject = stream;
                videoElement.autoplay = true;
                videoElement.muted = true;
                videoElement.classList.add("w-full", "h-full", "object-cover", "rounded-lg");
                videoContainerRef.current?.appendChild(videoElement);

                joinRoom({
                    audioParams: { track: stream.getAudioTracks()[0] },
                    videoParams: { ...params, track: stream.getVideoTracks()[0] },
                });
            })
            .catch((error) => {
                if (error instanceof DOMException) {
                    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                        showNotification("Media permissions denied. Please allow camera and microphone access.", "error");
                    } else {
                        showNotification(`Media error: ${error.message}`, "error");
                    }
                } else {
                    showNotification("Failed to access media devices", "error");
                }
            });
    }, [params]);

    const joinRoom = ({ audioParams, videoParams }: any) => {
        socket.current.emit("joinRoom", { roomName }, (data: any) => {
            createDevice(audioParams, videoParams, data.rtpCapabilities);
        });
    };

    const createDevice = async (audioParams: any, videoParams: any, rtpCapabilities: any) => {
        try {
            const newDevice = new mediasoupClient.Device();
            await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
            device.current = newDevice;
            createSendTransport(audioParams, videoParams);
        } catch (error) {
            console.error("Device error:", error);
            showNotification("Failed to initialize media device", "error");
        }
    };

    const createSendTransport = (audioParams: any, videoParams: any) => {
        socket.current.emit("createWebRtcTransport", { consumer: false }, async ({ params }: any) => {
            if (params.error) {
                console.error("Transport error:", params.error);
                showNotification("Connection error", "error");
                return;
            }

            const transport = device.current?.createSendTransport(params);
            if (transport) {
                GlobalTransport.current = transport;
            }

            transport?.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
                try {
                    await socket.current.emit("transport-connect", { dtlsParameters });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            transport?.on("produce", async (parameters: any, callback: any, errback: any) => {
                try {
                    socket.current.emit(
                        "transport-produce",
                        { kind: parameters.kind, rtpParameters: parameters.rtpParameters },
                        ({ id, producersExist }: any) => {
                            setProducers((prev) => ({ ...prev, [parameters.appData.type]: id }));
                            callback({ id });
                            if (producersExist) getProducers();
                        }
                    );
                } catch (error) {
                    errback(error);
                }
            });

            await transport?.produce({ ...audioParams, appData: { type: "audio" } });
            await transport?.produce({ ...videoParams, appData: { type: "video" } });
        });
    };

    const getProducers = () => {
        socket.current.emit("getProducers", (producerIds: string[]) => {
            producerIds.forEach(signalNewConsumerTransport);
        });
    };

    const signalNewConsumerTransport = (remoteProducerId: string) => {
        if (consumerTransports.current.some((ct) => ct.producerId === remoteProducerId)) return;

        socket.current.emit("createWebRtcTransport", { consumer: true }, async ({ params }: any) => {
            const consumerTransport = device.current?.createRecvTransport(params);
            consumerTransport?.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
                try {
                    socket.current.emit("transport-recv-connect", { dtlsParameters, serverConsumerTransportId: params.id });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            connectRecvTransport(consumerTransport, remoteProducerId, params.id);
        });
    };

    const connectRecvTransport = async (
        consumerTransport: any,
        remoteProducerId: string,
        serverConsumerTransportId: string
    ) => {
        socket.current.emit(
            "consume",
            { rtpCapabilities: device.current?.rtpCapabilities, remoteProducerId, serverConsumerTransportId },
            async ({ params }: any) => {
                const consumer = await consumerTransport.consume({
                    id: params.id,
                    producerId: params.producerId,
                    kind: params.kind,
                    rtpParameters: params.rtpParameters,
                });

                consumerTransports.current.push({
                    consumerTransport,
                    producerId: remoteProducerId,
                    consumer,
                });

                let existingElem = document.getElementById(`td-${remoteProducerId}`);
                
                if (!existingElem) {
                    const newElem = document.createElement("div");
                    newElem.setAttribute("id", `td-${remoteProducerId}`);
                    newElem.classList.add("relative", "overflow-hidden");

                    if (params.kind === "audio") {
                        newElem.innerHTML = `<audio id="${remoteProducerId}" autoplay></audio>`;
                    } else {
                        newElem.classList.add("aspect-video", "bg-gray-800");
                        newElem.innerHTML = `
                            <video id="${remoteProducerId}" autoplay class="w-full h-full object-cover rounded-lg"></video>
                            <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">Participant</div>
                        `;
                    }

                    if (params.kind === "video") {
                        const wrapper = document.createElement("div");
                       
                        wrapper.appendChild(newElem);
                        remoteVideoContainerRef.current?.appendChild(wrapper);
                    } else {
                        remoteVideoContainerRef.current?.appendChild(newElem);
                    }

                    existingElem = newElem;
                }

                const { track } = consumer;
                const mediaElement = document.getElementById(remoteProducerId) as HTMLMediaElement;

                if (mediaElement) {
                    mediaElement.srcObject = new MediaStream([track]);
                }

                socket.current.emit("consumer-resume", { serverConsumerId: params.serverConsumerId });
            }
        );
    };

    // When starting screen share:
    const startScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
            });

            localScreenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];
            const producer = await GlobalTransport.current?.produce({ track: screenTrack, appData: { type: 'screen' } });

            // Clear the container first
            if (localScreenVideoContainerRef.current) {
                localScreenVideoContainerRef.current.innerHTML = '';

                // Create a wrapper for the video
                const videoContainer = document.createElement("div");
                videoContainer.setAttribute("id", `td-${producer?.id}`);
                videoContainer.classList.add("w-full", "h-full", "relative");

                // Create and configure the video element
                const videoElement = document.createElement("video");
                videoElement.srcObject = screenStream;
                videoElement.autoplay = true;
                videoElement.classList.add("object-contain");

                // Add the elements to the DOM
                videoContainer.appendChild(videoElement);
                localScreenVideoContainerRef.current.appendChild(videoContainer);

                // Log for debugging
                console.log("Screen sharing element created:", videoElement);
            } else {
                console.error("Screen container reference is null");
            }

            setIsScreenSharing(true);
            screenTrack.onended = () => stopScreenShare();
        } catch (error) {
           console.error("Failes to share screeen: "+error)
        }
    };

    const stopScreenShare = async () => {
        if (!producers.screen) {
            return;
        }

        socket.current.emit("close-producer", { producerId: producers.screen }, ({ result }: { result: boolean }) => {
            if (result) {
                if (localScreenStreamRef.current) {
                    const videoTrack = localScreenStreamRef.current.getVideoTracks()[0];
                    videoTrack.stop();
                    localScreenStreamRef.current = null;
                }

                setProducers((prev) => ({ ...prev, screen: null }));
                setIsScreenSharing(false);

                const statusElement = document.getElementById(`td-${producers.screen}`);
                if (statusElement) statusElement.remove();

                if (localScreenVideoContainerRef.current) {
                    localScreenVideoContainerRef.current.innerHTML = '';
                }

                showNotification("Screen sharing stopped", "info");
            }
        });
    };

    const toggleAudio = () => {
        if (!producers.audio || !localStreamRef.current) return;

        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
            const newState = !isAudioMuted;
            audioTrack.enabled = !newState;
            setIsAudioMuted(newState);

            socket.current.emit(
                newState ? "producer-pause" : "producer-resume",
                { producerId: producers.audio }
            );

            showNotification(`Microphone ${newState ? 'muted' : 'unmuted'}`, "info");
        }
    };

    const toggleVideo = () => {
        if (!producers.video || !localStreamRef.current) return;

        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
            const newState = !isVideoMuted;
            videoTrack.enabled = !newState;
            setIsVideoMuted(newState);

            socket.current.emit(
                newState ? "producer-pause" : "producer-resume",
                { producerId: producers.video }
            );

            showNotification(`Camera ${newState ? 'turned off' : 'turned on'}`, "info");
        }
    };

    const endCall = () => {
        if (window.confirm("Are you sure you want to leave the call?")) {
            router.push('/home');
        }
    };

    useEffect(() => {
        const newSocket = io(URL);
        socket.current = newSocket;

        newSocket.on("connection-success", ({ socketId }: any) => {
            console.log("Connected to WebSocket:", socketId);
            getLocalStream();
        });

        newSocket.on("newuser", () => {
            showNotification("New participant joined the call", "info");
        });

        newSocket.on("new-producer", ({ producerId }: any) => signalNewConsumerTransport(producerId));

        newSocket.on('producer-closed', ({ remoteProducerId }: { remoteProducerId: string }) => {
            const producerToClose = consumerTransports.current.find(
                (transportData) => transportData.producerId === remoteProducerId
            );

            if (producerToClose) {
                producerToClose.consumerTransport.close();
                producerToClose.consumer.close();
                consumerTransports.current = consumerTransports.current.filter(
                    (transportData) => transportData.producerId !== remoteProducerId
                );
            }

            const mediaElement = document.getElementById(`td-${remoteProducerId}`);
            if (mediaElement) {
                // If the element is in a wrapper, remove the wrapper
                const wrapper = mediaElement.closest('.remote-video-wrapper');
                if (wrapper) {
                    wrapper.remove();
                } else {
                    mediaElement.remove();
                }
            }
        });

        newSocket.on("producer-paused", ({ producerId }: { producerId: string }) => {
            const videoElement = document.getElementById(`${producerId}`) as HTMLElement;
            if (videoElement) {
                // Check if the muted indicator already exists
                let muteIndicator = document.getElementById(`muted-${producerId}`);

                if (!muteIndicator) {
                    muteIndicator = document.createElement("div");
                    muteIndicator.setAttribute("id", `muted-${producerId}`);
                    muteIndicator.classList.add("absolute", "inset-0", "flex", "items-center", "justify-center", "bg-black", "bg-opacity-40", "text-white", "z-10");

                    const iconContainer = document.createElement("div");
                    iconContainer.classList.add("bg-red-500", "rounded-full", "p-3");
                    iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

                    muteIndicator.appendChild(iconContainer);
                    videoElement.parentElement?.appendChild(muteIndicator);
                }
            }
        });

        newSocket.on("producer-resumed", ({ producerId }: { producerId: string }) => {
            const statusElement = document.getElementById(`muted-${producerId}`);
            if (statusElement) statusElement.remove();
        });

        return () => {
            newSocket.close();

            if (localStreamRef.current) {
                const tracks = localStreamRef.current.getTracks();
                tracks.forEach(track => track.stop());
            }

            if (localScreenStreamRef.current) {
                const screenTracks = localScreenStreamRef.current.getTracks();
                screenTracks.forEach(track => track.stop());
            }

            if (GlobalTransport.current) {
                GlobalTransport.current.close();
            }

            consumerTransports.current.forEach(({ consumerTransport }) => {
                consumerTransport.close();
            });
        };
    }, [getLocalStream]);

    return (
        <div className="bg-gradient-to-br from-gray-900 to-black min-h-screen w-full text-white overflow-hidden">
            {/* Notification system */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${notification.type === 'error' ? 'bg-red-500'
                            : notification.type === 'success' ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                    >
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>


            <div className="flex flex-col md:flex-row gap-4 p-4 min-h-screen w-full">
                {/* Left side - Local video */}
                <div className="w-full md:w-1/6">
                    <div className="rounded-lg p-2 mb-4">
                        <div className="relative aspect-video rounded-lg overflow-hidden">
                            <div ref={videoContainerRef} className="w-full h-full"></div>
                            {isVideoMuted && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                    <div className="bg-red-500 rounded-full p-3">
                                        <VideoOff size={24} />
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm flex justify-center items-center gap-1">
                                You {isAudioMuted && <AiOutlineAudioMuted />}
                            </div>
                        </div>
                    </div>


                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: showControls ? 1 : 0.3 }}
                        transition={{ duration: 0.3 }}
                        className="p-2 md:p-4 fixed left-0 md:left-4 -bottom-1 md:bottom-0"
                    >
                        <div className="flex justify-center space-x-4 ">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleAudio}
                                className={`p-3 rounded-full ${isAudioMuted ? 'bg-red-500' : 'bg-blue-500'}`}
                                title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
                            >
                                {isAudioMuted ? 
                                    <MicOff  className="h-5 w-5 md:h-6 md:w-6" /> : 
                                    <Mic  className="h-5 w-5 md:h-6 md:w-6" />
                                }
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleVideo}
                                className={`p-3 rounded-full ${isVideoMuted ? 'bg-red-500' : 'bg-blue-500'}`}
                                title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
                            >
                                {isVideoMuted ? <VideoOff  className="h-5 w-5 md:h-6 md:w-6"/> : <Video   className="h-5 w-5 md:h-6 md:w-6"/>}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                                className={`p-3 rounded-full ${isScreenSharing ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                title={isScreenSharing ? "Stop screen sharing" : "Share screen"}
                            >
                                {isScreenSharing ? <X className="h-5 w-5 md:h-6 md:w-6"/> : <Monitor  className="h-5 w-5 md:h-6 md:w-6"/>}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={endCall}
                                className="p-3 rounded-full bg-red-500"
                                title="End call"
                            >
                                <Phone className="transform rotate-135 h-5 w-5 md:h-6 md:w-6"  />
                            </motion.button>
                        </div>
                        
                    </motion.div>
                    {/* Screen share section */}
                    <div className="mt-5">
                        <div ref={localScreenVideoContainerRef} className="localStreams flex flex-wrap gap-2"></div>
                    </div>
                </div>
                {/* Right side - Remote videos */}
                <div
                    ref={remoteVideoContainerRef}
                    className="flex flex-wrap gap-2 w-full md:w-5/6"
                >
                    {/* Remote videos will be added here dynamically */}
                </div>

            </div>
           
        </div>
    );
};