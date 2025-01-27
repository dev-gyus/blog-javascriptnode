export interface RoomHandler {
    // 특정 방에 유저를 등록
    saveRoomId(userId: string, roomId: string): Promise<void>;
    getRoomIdBy(userId: string): Promise<string|undefined>;
}