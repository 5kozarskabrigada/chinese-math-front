import { io, type Socket } from "socket.io-client";
import type { AuthState } from "./auth";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function connectSocket(auth: AuthState): Socket {
  return io(apiBaseUrl, {
    transports: ["websocket"],
    auth: {
      token: auth.token
    }
  });
}
