import CollaborationPlatform from "@/components/Meet";
import { redirect } from "next/navigation";

interface Props {
    searchParams: {
        roomName?: string;
    };
}

export default async function Meet({ searchParams }: Props) {
    const roomName = searchParams.roomName;

    if (!roomName || roomName.length === 0) {
        redirect("/home"); 
    }

    return <CollaborationPlatform  roomName={roomName}/>

}
