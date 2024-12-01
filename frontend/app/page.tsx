import { StreamMedia } from "@/components/StreamMedia";
import { Stream } from "@/components/Stream";
import { Videocall } from "@/components/Videocall";


export default function Home() {
  return (
    <div className="h-full w-full">
      {/* <Videocall roomName="sagar" /> */}
      {/* <Stream roomName="sujoy"/> */}
      <StreamMedia roomName="mee"/>
    </div>
  );
}
