import { io } from "socket.io-client";
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export function connectSocket(auth) {
    return io(apiBaseUrl, {
        transports: ["websocket"],
        auth: {
            token: auth.token
        }
    });
}
