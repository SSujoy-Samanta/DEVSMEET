'use client'
import { useState } from "react"
import { Socket } from "socket.io-client";

export const VideoToggle=({socket,producerId,localStreamRef}:{
    socket:Socket;
    producerId:string 
    localStreamRef:any;

})=>{
    const [videoMuted,setVideoMuted]=useState<boolean>(false);
    function pauseProducer() {
        socket.emit("producer-pause", { producerId });
    }
    function resumeProducer() {
        socket.emit("producer-resume", { producerId });
    } 
   
    const toggleVideo = () => {
        if(producerId && localStreamRef.current){
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            if(videoMuted){
                resumeProducer();
                setVideoMuted(x=>!x);
            }else{
                pauseProducer();
                setVideoMuted(x=>!x);
            }
        }
    }
    return <div>
        <button
          className="p-2 rounded-full bg-gray-500 hover:bg-gray-700 transition"
          onClick={toggleVideo}
        >
          {videoMuted ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="black"
              className="size-6"
            >
              <path d="M.97 3.97a.75.75 0 0 1 1.06 0l15 15a.75.75 0 1 1-1.06 1.06l-15-15a.75.75 0 0 1 0-1.06ZM17.25 16.06l2.69 2.69c.944.945 2.56.276 2.56-1.06V6.31c0-1.336-1.616-2.005-2.56-1.06l-2.69 2.69v8.12ZM15.75 7.5v8.068L4.682 4.5h8.068a3 3 0 0 1 3 3ZM1.5 16.5V7.682l11.773 11.773c-.17.03-.345.045-.523.045H4.5a3 3 0 0 1-3-3Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="black"
              className="size-6"
            >
              <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
            </svg>
          )}
        </button>
    </div>
}