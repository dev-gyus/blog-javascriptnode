import {RoomHandler} from "../RoomHandler";

export class LocalRoomHandler implements RoomHandler {
    private readonly userRoomInfo: Map<string, string>

    constructor() {
        this.userRoomInfo = new Map<string, string>();
    }

    public async saveRoomId(userId: string, roomId: string): Promise<void> {
        this.userRoomInfo.set(userId, roomId);
    }

    public async getRoomIdBy(userId: string): Promise<string|undefined> {
        return this.userRoomInfo.get(userId);
    }
}