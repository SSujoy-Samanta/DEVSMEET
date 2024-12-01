'use client';
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { AudioToggle } from "./AudioToggle";
import { VideoToggle } from "./VideoToggle";

const URL = process.env.NEXT_PUBLIC_WS_URL || "";

export const StreamMedia = ({ roomName = "sujoy" }: { roomName: string }) => {
    const socket = useRef<any>(null);
    const device = useRef<mediasoupClient.Device | null>(null);
    const consumerTransports = useRef<any[]>([]);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const [producers, setProducers] = useState({
        audio: null as string | null,
        video: null as string | null,
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
                videoElement.classList.add("stream");
                videoContainerRef.current?.appendChild(videoElement);

                joinRoom({
                    audioParams: { track: stream.getAudioTracks()[0] },
                    videoParams: { ...params, track: stream.getVideoTracks()[0] },
                });
            })
            .catch((error) => console.error("Stream error:", error));
    }, [params]);

    const joinRoom = ({ audioParams, videoParams }: any) => {
        socket.current?.emit("joinRoom", { roomName }, (data: any) => {
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
        }
    };

    const createSendTransport = (audioParams: any, videoParams: any) => {
        socket.current?.emit("createWebRtcTransport", { consumer: false }, async ({ params }: any) => {
            if (params.error) {
                console.error("Transport error:", params.error);
                return;
            }

            const transport = device.current?.createSendTransport(params);
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
                    socket.current?.emit(
                        "transport-produce",
                        { kind: parameters.kind, rtpParameters: parameters.rtpParameters },
                        ({ id ,producersExist}: any) => {
                            setProducers((prev) => ({ ...prev, [parameters.kind]: id }));
                            callback({ id });
                            if (producersExist) getProducers();
                        }
                    );
                } catch (error) {
                    errback(error);
                }
            });

            await transport?.produce(audioParams);
            await transport?.produce(videoParams);
        });
    };
    const getProducers = () => {
        socket.current?.emit("getProducers", (producerIds: string[]) => {
            // console.log(producerIds)
            producerIds.forEach(signalNewConsumerTransport);
        });
    };

    const signalNewConsumerTransport = (remoteProducerId: string) => {
        if (consumerTransports.current.some((ct) => ct.producerId === remoteProducerId)) return;

        socket.current?.emit("createWebRtcTransport", { consumer: true }, async ({ params }: any) => {
            const consumerTransport = device.current?.createRecvTransport(params);
            consumerTransport?.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
                try {
                    await socket.current.emit("transport-recv-connect", { dtlsParameters, serverConsumerTransportId: params.id });
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
        socket.current?.emit(
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
                    // Create a new HTML element for the consumer's media if it doesn't exist
                    const newElem = document.createElement("div");
                    newElem.setAttribute("id", `td-${remoteProducerId}`);

                    if (params.kind === "audio") {
                        // Append to the audio container
                        newElem.innerHTML = `<audio id="${remoteProducerId}" autoplay></audio>`;
                    } else {
                        // Append to the video container
                        newElem.setAttribute("class", `remoteVideo`);
                        newElem.innerHTML = `<video id="${remoteProducerId}" autoplay class="video stream"></video>`;
                    }

                    // Append the element to the video container
                    remoteVideoContainerRef.current?.appendChild(newElem);
                    existingElem = newElem; // Assign new element as the existing element
                }
            
                // Set the media stream to the appropriate element
                const { track } = consumer;
               // console.log(track)
                const mediaElement = document.getElementById(remoteProducerId) as HTMLMediaElement;
                //console.log("Track"+JSON.stringify(consumer))
                if (mediaElement) {
                    mediaElement.srcObject = new MediaStream([track]);
                }

                socket.current?.emit("consumer-resume", { serverConsumerId: params.serverConsumerId });
            }
        );
    };

    useEffect(() => {
        const newSocket = io(URL);
        socket.current = newSocket;

        newSocket.on("connection-success", ({ socketId }: any) => {
            console.log("Connected to WebSocket:", socketId);
            getLocalStream();
        });
        newSocket.on("newuser",()=>{
            alert("new user joined")
        })

        newSocket.on("new-producer", ({ producerId }: any) => signalNewConsumerTransport(producerId));

        newSocket.on('producer-closed', ({ remoteProducerId }: { remoteProducerId: string }) => {
            // Server notification is received when a producer is closed
            // We need to close the client-side consumer and associated transport
        
            const producerToClose = consumerTransports.current.find(
                (transportData) => transportData.producerId === remoteProducerId
            );
        
            if (producerToClose) {
                producerToClose.consumerTransport.close(); // Close the consumer transport
                producerToClose.consumer.close(); // Close the consumer
                consumerTransports.current = consumerTransports.current.filter(
                    (transportData) => transportData.producerId !== remoteProducerId
                ); // Remove the consumer transport from the list
            }
        
            // Safely remove the associated video/audio element
            const mediaElement = document.getElementById(`td-${remoteProducerId}`);
            if (mediaElement) {
                mediaElement.remove(); // Remove the media element from the DOM
            } else {
                console.warn(`No media element found for producer ID: ${remoteProducerId}`);
            }
        });

        newSocket.on("producer-paused", ({ producerId }:{producerId:string}) => {
            console.log(`Producer ${producerId} is paused`);
            // Update UI to indicate paused state
            const statusElement = document.getElementById(`${producerId}`);
            if (statusElement){
                const newDiv=document.createElement("div");
                newDiv.setAttribute("id", `muted-${producerId}`);
                newDiv.innerText = `Paused`
                statusElement.appendChild(newDiv);   
            }
        });
          
        newSocket.on("producer-resumed", ({ producerId }:{producerId:string}) => {
            console.log(`Producer ${producerId} is resumed`);
            // Update UI to indicate resumed state
            const statusElement = document.getElementById(`muted-${producerId}`);
            if (statusElement) statusElement.remove();
        });

        return () => {
            newSocket.close();
        };
    }, [getLocalStream]);

    return (
        <div className="bg-black min-h-screen w-full text-sky-600 grid grid-cols-5">
            <div className="flex flex-col gap-2 col-span-1 ">
                <div>Local Stream</div>
                <div ref={videoContainerRef} className="localStream"></div>
                <div>
                    <div className="flex gap-2">
                        {producers.audio && <AudioToggle socket={socket.current} producerId={producers.audio}  localStreamRef={ localStreamRef} />}
                        {producers.video && <VideoToggle socket={socket.current} producerId={producers.video} localStreamRef={localStreamRef} />}
                    </div>
                </div>
            </div>
            <div className="col-span-4">
                <div>Remote Streams</div>
                <div ref={remoteVideoContainerRef} className="remoteStreams flex flex-wrap gap-2"></div>
            </div>
        </div>
    );
};
