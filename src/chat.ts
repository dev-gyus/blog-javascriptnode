import { Server } from 'socket.io';
import {ChatInterchange} from "./chat/ChatInterchange";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-streams-adapter";


// Redis client 생성 (Redis Client는 한 채널의 Stream을 열면 다른 용도로는 못 쓰기 때문에 채팅서버에서만 사용하는 고유 클라이언트로 생성합니다)
const redisClient = createClient({url: process.env.REDIS_URL});
const createSocketServer = async () => {
    try {
        // redis 접속
        const connectedRedis = await redisClient.connect();
        console.log(`redis 접속완료 url:${connectedRedis.options?.url}`)
        // socket server setup
        const chatSocketServer = new Server(Number(process.env.SOCKET_PORT || '5500'), {
            adapter: createAdapter(redisClient)
        });
        // 이벤트 핸들러 등록 객체 생성
        const chatEventHandler = new ChatInterchange();
        // 어댑터 이벤트 핸들러 등록
        chatEventHandler.setAdapterEvents(chatSocketServer);
        // 인증 관련 핸들러 등록
        chatEventHandler.setAuthorizeHandler(chatSocketServer);
        // 다른 각종 이벤트 핸들러 등록
        chatEventHandler.setEventHandlers(chatSocketServer);
    } catch (error) {
        console.error(`socket server 생성중 예외 발생. ${error}`);
    }
}
createSocketServer();
