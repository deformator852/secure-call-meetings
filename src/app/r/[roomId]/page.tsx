import { isUuid } from "@/shared/signaling/protocol";
import { CallEndedState } from "@/widgets/call-stage/call-ended-state";
import { CallStage } from "@/widgets/call-stage/call-stage";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  if (!isUuid(roomId)) {
    return (
      <CallEndedState
        title="Invalid link"
        description="A room requires a UUID in the URL. Create a new call from the home page."
      />
    );
  }

  return <CallStage roomId={roomId} />;
}
