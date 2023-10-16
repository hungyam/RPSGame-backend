import { Server } from "socket.io";
import * as fs from "fs"
import * as https from "https";
import { instrument } from "@socket.io/admin-ui";
import {toRoom, toHall, setName, leaveRoom, leaveHall} from "./handlers/rooms.js";

const httpsServer = https.createServer({
    key: fs.readFileSync("/root/v2ray.key"),
    cert: fs.readFileSync("/root/v2ray.pem")
})
const io = new Server(httpsServer, {
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {
    socket.emit('newConn')
    socket.on('toRoom', (room) => toRoom(io, socket, room))
    socket.on('leaveRoom', (room) => leaveRoom(io, socket, room))
    socket.on('toHall', () => toHall(io, socket))
    socket.on('leaveHall', () => leaveHall(io, socket))
    socket.on('setName', (name) => setName(io, socket, name))
});


instrument(io, {
    auth: false
})

httpsServer.listen(1100);
