"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
            path: "/api/socket/io",
            addTrailingSlash: false,
        });
    }
    return socket;
};
