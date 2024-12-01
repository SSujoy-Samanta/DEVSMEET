'use client'
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { AudioToggle } from "./AudioToggle";
const URL=process.env.NEXT_PUBLIC_WS_URL


export const Stream= ({roomName="sujoy"}:{
    roomName:string
}) => {
    let socket:any;
    let device:mediasoupClient.Device;
    let consumerTransports:any[] = [];
    // let producedAudioId:string;
    // let producedVideoId:string;
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const videoContainerconsumerRef = useRef<HTMLDivElement>(null);
    const [producedAudioId,setproducedAudioId]=useState<string|null>(null);
    const [producedVideoId,setproducedVideoId]=useState<string|null>(null);
    const params = {
        encodings: [
            { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" },
            { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" },
            { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" },
        ],
        codecOptions: { videoGoogleStartBitrate: 1000 },
    };

    const streamSuccess = (stream: MediaStream) => {
        const videoElement = document.createElement("video");
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.setAttribute('class','stream');
        videoContainerRef.current?.appendChild(videoElement);

        const audioParams = { track: stream.getAudioTracks()[0] };
        const videoParams = { ...params, track: stream.getVideoTracks()[0] };

        joinRoom(audioParams, videoParams);
    };

    const getLocalStream = () => {
        navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: { width: { min: 100, max: 300 }, height: { min: 200, max: 400 } },
        })
        .then(streamSuccess)
        .catch((error) => console.error("Stream error:", error));
    };

    const joinRoom = (audioParams: any, videoParams: any) => {
        console.log(socket)
        socket?.emit("joinRoom", { roomName }, (data: any) => {
            const rtpCapabilities=data.rtpCapabilities;
            createDevice(audioParams, videoParams,rtpCapabilities);
        });
    };

    const createDevice = async (audioParams: any, videoParams: any,rtpCapabilities:any) => {
        try {
          
            const newDevice = new mediasoupClient.Device();
            await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
            device=newDevice;
            createSendTransport(device, audioParams, videoParams);
            
            
        } catch (error) {
            console.error("Device error:", error);
        }
    };

    const createSendTransport = (
        device: mediasoupClient.Device,
        audioParams: any,
        videoParams: any
    ) => {
        socket?.emit("createWebRtcTransport", { consumer: false }, async ({ params }: any) => {
            if (params.error) {
                console.error("Transport error:", params.error);
                return;
            }

            const transport = device.createSendTransport(params);
            transport.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
                try {
                    await socket.emit("transport-connect", { dtlsParameters });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            transport.on("produce", async (parameters: any, callback: any, errback: any) => {
                try {
                    socket?.emit(
                        "transport-produce",
                        { kind: parameters.kind, rtpParameters: parameters.rtpParameters, appData: parameters.appData },
                        ({ id, kind,producersExist }: any) => {
                           try {
                                if(kind==='audio'){
                                    // producedAudioId=id
                                    setproducedAudioId(id)
                                }
                                if(kind==='video'){
                                    //producedVideoId=id
                                    setproducedVideoId(id)
                                }
                            } catch (error:any) {
                                console.log("Error produced kind")
                            }
                            callback({ id });
                            if (producersExist) getProducers();
                        }
                    );
                } catch (error:any) {
                    errback(error);
                }
            });

            const audioProducer = await transport.produce(audioParams);
            const videoProducer = await transport.produce(videoParams);
        
            //producerTransport=transport;

            audioProducer.on('trackended', () => {
                console.log('audio track ended')
                // close audio track
            })
            
            audioProducer.on('transportclose', () => {
                console.log('audio transport ended')
                // close audio track
            })
              
            videoProducer.on('trackended', () => {
                console.log('video track ended')
                // close video track
            })

            videoProducer.on('transportclose', () => {
                console.log('video transport ended')
                // close video track
            })
        });
    };

    const getProducers = () => {
        socket?.emit("getProducers", (producerIds: string[]) => {
            console.log(producerIds)
            producerIds.forEach(signalNewConsumerTransport);
        });
    };

    const signalNewConsumerTransport = (remoteProducerId: string) => {
        //console.log(consumerTransports)
        if (consumerTransports.some((ct) => ct.producerId === remoteProducerId)) return;

        socket?.emit("createWebRtcTransport", { consumer: true }, async ({ params }: any) => {
            const consumerTransport = device?.createRecvTransport(params);
            consumerTransport?.on("connect", async ({ dtlsParameters }: any, callback: any, errback: any) => {
                try {
                    await socket.emit("transport-recv-connect", { dtlsParameters, serverConsumerTransportId: params.id });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            //console.log("PAramsTrans:"+JSON.stringify(params))

            connectRecvTransport(consumerTransport, remoteProducerId, params.id);
        });
    };

    const connectRecvTransport = async (
        consumerTransport: any,
        remoteProducerId: string,
        serverConsumerTransportId: string
    ) => {
        socket?.emit(
            "consume",
            { rtpCapabilities: device?.rtpCapabilities, remoteProducerId, serverConsumerTransportId },
            async ({ params }: any) => {
                // console.log("Params ID:", JSON.stringify(params));
                // console.log("Server Consumer ID:", params.serverConsumerId);

                const consumer = await consumerTransport.consume({
                    id: params.id,
                    producerId: params.producerId,
                    kind: params.kind,
                    rtpParameters: params.rtpParameters,
                });
    
                // Update state using setConsumerTransports
                consumerTransports = [
                    ...consumerTransports,
                    {
                      consumerTransport,
                      serverConsumerTransportId: params.id,
                      producerId: remoteProducerId,
                      consumer,
                    },
                ]
                // Create a new HTML element for the consumer's media
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
                        newElem.setAttribute("class", "remoteVideo");
                        newElem.innerHTML = `<video id="${remoteProducerId}" autoplay class="video stream"></video>`;
                    }

                    // Append the element to the video container
                    videoContainerconsumerRef.current?.appendChild(newElem);
                    existingElem = newElem; // Assign new element as the existing element
                }
            
                // Set the media stream to the appropriate element
                const { track } = consumer;
                console.log(track)
                const mediaElement = document.getElementById(remoteProducerId) as HTMLMediaElement;
                //console.log("Track"+JSON.stringify(consumer))
                if (mediaElement) {
                    mediaElement.srcObject = new MediaStream([track]);
                }
    
                // Resume the consumer
                socket.emit("consumer-resume", { serverConsumerId: params.serverConsumerId });
            }
        );
    };
    function pauseProducer(producerId:string) {
        socket.emit("producer-pause", { producerId });
    }
    
    function resumeProducer(producerId:string) {
        socket.emit("producer-resume", { producerId });
    }

    useEffect(() => {
        const newSocket = io(URL);
        socket=newSocket;

        newSocket.on("connection-success", ({ socketId }: any) => {
            console.log("Connected to Websocket server:", socketId);
            getLocalStream();
        });

        newSocket.on("new-producer", ({ producerId }: any) => {
            console.log("heeebdshbfhdbdsjbfwjsfcwefdjewnfjn")
            signalNewConsumerTransport(producerId);
        });
        newSocket.on('producer-closed', ({ remoteProducerId}:{remoteProducerId:string}) => {
            // server notification is received when a producer is closed
            // we need to close the client-side consumer and associated transport
            const producerToClose = consumerTransports.find(transportData => transportData.producerId === remoteProducerId)
           
            if(producerToClose){
                producerToClose.consumerTransport.close()
                producerToClose.consumer.close()
            
                // remove the consumer transport from the list
                consumerTransports = consumerTransports.filter(transportData => transportData.producerId !== remoteProducerId)
            }
          
            // remove the video div element
            // Safely remove the associated video/audio element
            const mediaElement = document.getElementById(`td-${remoteProducerId}`);
            if (mediaElement) {
                mediaElement.remove(); // Use the remove method for safe DOM removal
            } else {
                console.warn(`No media element found for producer ID: ${remoteProducerId}`);
            }
        })
        newSocket.on("producer-paused", ({ producerId }:{producerId:string}) => {
            console.log(`Producer ${producerId} is paused`);
            // Update UI to indicate paused state
            const statusElement = document.getElementById(`td-${producerId}`);
            if (statusElement) statusElement.innerText = `Producer ${producerId} is paused`;
        });
          
        newSocket.on("producer-resumed", ({ producerId }:{producerId:string}) => {
            console.log(`Producer ${producerId} is resumed`);
            // Update UI to indicate resumed state
            const statusElement = document.getElementById(`td-${producerId}`);
            if (statusElement) statusElement.innerText = `Producer ${producerId} is resumed`;
        });

        // Cleanup function to close the socket connection when the component unmounts
        return () => {
            newSocket.close();
        };
    }, []);
    
    return <div>
        <div ref={videoContainerRef} id="video-container" className="">
            <div>local</div>
        </div>
        {/* <button className="p-2 border border-red-500 m-2" onClick={()=>{pauseProducer(producedVideoId)}}>PAUSE</button> */}
        {/* {producedAudioId && socket && <AudioToggle socket={socket} producerId={producedAudioId}/>} */}
        {/* <button className="p-2 border border-red-500 m-2" onClick={()=>{resumeProducer(producedVideoId)}}>Resume</button> */}
        <div id="videoContainer" ref={videoContainerconsumerRef } className=" flex justify-start items-center gap-2">
            <div>remote</div>
        </div>

       
    </div>;
};