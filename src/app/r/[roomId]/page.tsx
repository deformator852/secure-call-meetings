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
        title="Неверная ссылка"
        description="Комната задаётся UUID в адресе. Создайте новый звонок с главной."
      />
    );
  }

  return <CallStage roomId={roomId} />;
}
