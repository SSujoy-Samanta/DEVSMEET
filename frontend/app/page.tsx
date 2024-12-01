import { Streamnew } from "@/components/Smaple";
import { Stream } from "@/components/Stream";
import { Videocall } from "@/components/Videocall";


export default function Home() {
  return (
    <div className="h-full w-full">
      {/* <Videocall roomName="sagar" /> */}
      {/* <Stream roomName="sujoy"/> */}
      <Streamnew roomName="mee"/>
    </div>
  );
}
