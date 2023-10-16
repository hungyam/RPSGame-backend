const gameRoomList = (io) => {
    const res = []
    io.of('/').adapter.rooms.forEach((value, key) => {
        if (/^(room)/.test(key)) {
            const clients = []
            value.forEach((curr) => {
                clients.push(User.get(curr))
            })
            res.push({
                room: key.split('m')[1],
                client: clients
            })
        }
    })
    return res
}

const usersInRoom = (io, roomId) => {
    const users = []
    const userInRoom = io.of('/').adapter.rooms.get("room" + roomId)
    userInRoom && userInRoom.forEach((curr) => {
        users.push({
            id: curr,
            name: User.get(curr)
        })
        GameReady.set(curr, false)
        GameGesture.set(curr, 0)
    })
    return users
}

const onGameReady = (io, socket, roomId) => {
    GameReady.set(socket.id, true)
    const res = []
    const userInRoom = io.of('/').adapter.rooms.get("room" + roomId)
    userInRoom && userInRoom.forEach((curr) => {
        res.push({
            id: curr,
            ready: GameReady.get(curr)
        })
    })
    io.to("room" + roomId).emit('gameReadyRes', res)
}

const User = new Map()
const GameReady = new Map()
const GameGesture = new Map()

const toRoom = (io, socket, roomId) => {
    let userInRoom = io.of('/').adapter.rooms.get("room" + roomId)
    // Room full
    if (userInRoom && userInRoom.size > 1) {
        socket.emit('toRoomRes', false)
        return
    }
    socket.emit('toRoomRes', true)
    socket.join("room" + roomId)

    // Send room list to hall member
    io.to('hall').emit('rooms', gameRoomList(io))

    socket.on('inRoom', () => {
        // Send clients to room member
        io.to("room" + roomId).emit('clients', usersInRoom(io, roomId))
    })

    // Listen the client ready
    socket.on('gameReady', () => onGameReady(io, socket, roomId))

    socket.on('gameGesture', (gesture) => {
        GameGesture.set(socket.id, gesture)
        const res = []
        userInRoom = io.of('/').adapter.rooms.get("room" + roomId)
        userInRoom && userInRoom.forEach((curr) => {
            res.push({
                id: curr,
                gesture: GameGesture.get(curr)
            })
        })
        if (res[0] && res[0].gesture >= 1 && res[0].gesture <= 3 &&
            res[1] && res[1].gesture >= 1 && res[1].gesture <= 3) {
            io.to("room" + roomId).emit('gameGestureRes', res)
            GameGesture.set(res[0].id, 0)
            GameGesture.set(res[1].id, 0)
        } else {
            socket.to("room" + roomId).emit('gameGestureSend')
        }
    })

    socket.on('resetState', () => {
        userInRoom = io.of('/').adapter.rooms.get("room" + roomId)
        userInRoom && userInRoom.forEach((curr) => {
            GameGesture.set(curr, -1)
            GameReady.set(curr, false)
        })
    })

    socket.on('disconnect', () => {
        leaveRoom(io, socket, roomId)
        leaveHall(io, socket)
    })
}

const leaveRoom = (io, socket, roomId) => {
    socket.removeAllListeners('inRoom')
    socket.removeAllListeners('gameReady')
    socket.removeAllListeners('gameGesture')
    socket.removeAllListeners('resetState')
    socket.removeAllListeners('disconnect')

    socket.leave("room" + roomId)
    io.to('hall').emit('rooms', gameRoomList(io))
    io.to('room' + roomId).emit('clients', usersInRoom(io, roomId))
    const userInRoom = io.of('/').adapter.rooms.get("room" + roomId)
    userInRoom && userInRoom.forEach((curr) => {
        GameGesture.set(curr, -1)
        GameReady.set(curr, false)
    })
    GameReady.set(socket.id, false)
    GameGesture.set(socket.id, false)
}

const toHall = (io, socket) => {
    socket.join('hall')
    socket.emit('rooms', gameRoomList(io))
}

const leaveHall = (io, socket) => {
    socket.leave('hall')
}

const setName = (io, socket, name) => {
    User.set(socket.id, name)
    socket.emit('setNameRes', true)
}


export {
    toRoom,
    toHall,
    setName,
    leaveRoom,
    leaveHall
}
