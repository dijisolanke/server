const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const courtJester = require("./courtJester");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://confession-lake-five.vercel.app",
      "https://server-0w31.onrender.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let waitingUsers = new Map();
const activeRooms = new Map();

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  socket.on("setAlias", (alias) => {
    console.log(`User ${socket.id} set alias to ${alias}`);
    socket.alias = alias;
    waitingUsers.set(socket.id, { socket, alias });
    io.emit(
      "waitingUsersUpdate",
      Array.from(waitingUsers.values()).map((u) => u.alias)
    );

    if (waitingUsers.size >= 2) {
      const [currentUser, partner] = Array.from(waitingUsers.values()).slice(
        0,
        2
      );
      const roomId = `${currentUser.socket.id}-${partner.socket.id}`;

      waitingUsers.delete(currentUser.socket.id);
      waitingUsers.delete(partner.socket.id);

      activeRooms.set(roomId, {
        users: [currentUser.socket.id, partner.socket.id],
        readyState: new Set(),
      });

      currentUser.socket.join(roomId);
      partner.socket.join(roomId);

      io.to(currentUser.socket.id).emit("paired", {
        partnerAlias: partner.alias,
        roomId,
      });
      io.to(partner.socket.id).emit("paired", {
        partnerAlias: currentUser.alias,
        roomId,
      });
    }
  });

  socket.on("ready", ({ roomId }) => {
    const room = activeRooms.get(roomId);
    console.log(`Active rooms ${room} `);
    if (room) {
      room.readyState.add(socket.id);
      if (room.readyState.size === 2) {
        io.to(roomId).emit("begin", { roomId });
      }
      console.log(`Room ready state ${room.readyState.size} `);
    }
  });

  socket.on("disconnect", () => {
    waitingUsers.delete(socket.id);
    io.emit(
      "waitingUsersUpdate",
      Array.from(waitingUsers.values()).map((u) => u.alias)
    );

    for (const [roomId, room] of activeRooms) {
      if (room.users.includes(socket.id)) {
        io.to(roomId).emit("partnerLeft");
        activeRooms.delete(roomId);
        break;
      }
    }
  });

  socket.on("offer", (data) => {
    socket.to(data.to).emit("offer", { offer: data.offer, from: socket.id });
    console.log(`Offer from ${socket.id} to ${data.to}`);
  });

  socket.on("answer", (data) => {
    socket.to(data.to).emit("answer", { answer: data.answer, from: socket.id });
    console.log(`Answer from ${socket.id} to ${data.to}`);
  });

  socket.on("ice-candidate", (data) => {
    socket
      .to(data.to)
      .emit("ice-candidate", { candidate: data.candidate, from: socket.id });
    console.log(`Ice candidate from ${socket.id} to ${data.to}`);
  });

  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("leaveRoom", ({ roomId }) => {
    socket.to(roomId).emit("partnerLeft");
    activeRooms.delete(roomId);
    socket.leave(roomId);
  });

  socket.on("error", (error) => {
    courtJester.handleError(socket, "generalError", error.message);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
