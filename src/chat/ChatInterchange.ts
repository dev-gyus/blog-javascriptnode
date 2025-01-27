import {Server, Socket} from "socket.io";
import {LocalRoomHandler} from "./room/impl/LocalRoomHandler";
import {RoomHandler} from "./room/RoomHandler";
import {EntireMsg} from "./message/dto/MessageDto";

export class ChatInterchange {
    private readonly roomHandler: RoomHandler;

    constructor() {
        this.roomHandler = new LocalRoomHandler();
    }

    /**
     * Adapter의 라이프사이클 이벤트 핸들러 등록
     * @param socketServer  소켓서버
     */
    public setAdapterEvents(socketServer: Server): void {
        // 해당 소켓 서버의 모든 Path(endPoint)로 접근하는 소켓이 방에 처음 입장하여 방이 생성된 경우 핸들러 등록
        socketServer.of("/").adapter.on('create-room', (room) => {
            console.log(`room ${room} was created`);
        });
        // 해당 소켓 서버의 모든 Path(endPoint)로 접근하는 소켓이 방에 입장할때 핸들러 등록
        socketServer.of("/").adapter.on('join-room', (room, id) => {
            console.log(`socketId:${id} has joined room ${room}`);
        });
        // 해당 소켓 서버의 모든 Path(endPoint)로 접근하는 소켓이 방에 퇴장할때 핸들러 등록
        socketServer.of("/").adapter.on('leave-room', (room, id) => {
            console.log(`socketId:${id} has leaved room ${room}`);
        });
        // 해당 소켓 서버의 모든 Path(endPoint)로 접근하는 소켓이 방에서 퇴장하면서 방에 입장한 소켓이 없는 경우 방을 삭제할때 핸들러 등록
        socketServer.of("/").adapter.on('delete-room', (room) => {
            console.log(`room ${room} was deleted`);
        });
    }

    public setAuthorizeHandler(socketServer: Server): void {
        socketServer.use((socket, next) => {
            // 클라이언트에서 받은 roomId로 해당 소켓을 입장시키기 위해 조회
            const roomId = socket.handshake.query.roomId;
            // 해당 소켓의 유저가 누구인지 알기위해 조회
            const userId = socket.handshake.query.userId;
            if (!roomId || !userId) {
                next(new Error('roomId, userId는 필수 값 입니다.'));
            }
            // socket.data 객체에 데이터를 저장 (이벤트 핸들러에서 사용)
            socket.data.roomId = roomId;
            socket.data.userId = userId;
            // 접속한 소켓이 클라이언트에서 접속한건지 여부 판단을 위한 토큰 조회
            const token: string = socket.handshake.auth.token;
            // 원래 암호화를 해야하지만, 테스트 목적으로 간단하게 PlainText로 판단합니다.
            if (token == 'token-for-client') {
                next();
            } else {
                // 인증 예외가 발생하면 커넥션 예외 발생
                next(new Error('Not authorized'));
            }
        })
    }

    /**
     * 이벤트 핸들러 등록
     * @param socketServer  소켓서버
     */
    public setEventHandlers(socketServer: Server): void {
        // 소켓 연결 이벤트 발생시 각종 핸들러 등록
        socketServer.on('connection', async (socket: Socket) => {
            console.log(`socket connected. socket id = ${socket.id}`);
            await this.joinRoom(socket);
            await this.setEntireMsgHandler(socketServer, socket);
            await this.disconnectHandler(socket);
        })
    }

    /**
     * 소켓 연결시 query에 담긴 roomId에 해당하는 방에 소켓을 입장시킴
     * @param socket    소켓
     */
    private async joinRoom(socket: Socket): Promise<void> {
        const roomId = socket.data.roomId;
        const userId = socket.data.userId;
        // 해당 소켓을 roomId에 입장시킴
        socket.join(roomId);
        // userId로 현재 입장한 roomId를 얻기위해 저장
        await this.roomHandler.saveRoomId(userId, roomId);
    }

    /**
     * 클라이언트로부터 전체 메시지 전송 이벤트가 들어올 경우 이를 처리할 핸들러 등록
     * @param socketServer  소켓 서버
     * @param socket        소켓
     */
    private async setEntireMsgHandler(socketServer: Server, socket: Socket): Promise<void> {
        socket.on('entireMsg', async (dataJsonStr: string) => {
            try {
                console.log(dataJsonStr);
                // Json 데이터 -> Object 변환
                const objData = JSON.parse(dataJsonStr);
                // msg 값 없으면 예외
                if (!objData.msg) {
                    throw new Error("메시지는 필수 값 입니다.");
                }
                // 메시지를 보낸 유저의 id값으로 현재 접속중인 방 아이디 구하기
                const roomId = await this.roomHandler.getRoomIdBy(socket.data.userId);
                // 접속한 방 정보가 없으면 메시지 안보냄
                if (!roomId) {
                    return;
                }
                // 클라이언트에 이벤트를 보낼 메시지 데이터 객체 생성
                const data: EntireMsg = {
                    msg: objData.msg,
                }
                // 해당 방에 메시지 전체 전송
                socketServer.in(roomId).emit('entireMsg', JSON.stringify(data))
            } catch (error: any) {
                console.error(`entireMsg 예외발생`);
                await this.handleError(socket, error);
            }
        })
    }

    /**
     * 예외 발생시 에러 이벤트를 처리하는 핸들러
     * @param socket    소켓
     * @param err       발생한 에러
     */
    private async handleError(socket: Socket, err: any): Promise<void> {
        if (!(err instanceof Error)) {
            console.error('Error 타입의 매개 변수를 할당 해 주세요.');
        }
        socket.emit('error', err);
    }

    /**
     * 소켓 연결이 끊어질 경우 이벤트 핸들러
     * @param socket    소켓
     */
    private async disconnectHandler(socket: Socket) {
        socket.on('disconnect', (reason) => {
            console.log(`socket disconnected. socket id = ${reason}`);
        })
    }
}