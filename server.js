const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const courtJester = require("./courtJester");
const { iceServers } = require("./magicConfig");
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

let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("A new guest has arrived at the castle");

  socket.on("setAlias", (alias) => {
    socket.alias = alias;
    waitingUsers.push(socket);
    io.emit(
      "waitingUsersUpdate",
      waitingUsers.map((user) => user.alias)
    );

    if (waitingUsers.length >= 2) {
      const currentUser = waitingUsers.shift();
      const partner = waitingUsers.shift();

      const roomId = `${currentUser.id}-${partner.id}`;
      currentUser.join(roomId);
      partner.join(roomId);

      io.to(currentUser.id).emit("paired", {
        partnerAlias: partner.alias,
        roomId,
      });
      io.to(partner.id).emit("paired", {
        partnerAlias: currentUser.alias,
        roomId,
      });
    }

    console.log(`${alias} has joined`);
  });

  socket.on("disconnect", () => {
    waitingUsers = waitingUsers.filter((user) => user.id !== socket.id);
    io.emit(
      "waitingUsersUpdate",
      waitingUsers.map((user) => user.alias)
    );
    console.log(`${socket.alias} has left`);
  });

  // WebRTC signaling
  socket.on("offer", (data) => {
    socket.to(data.to).emit("offer", {
      offer: data.offer,
      from: socket.id,
    });
  });

  socket.on("answer", (data) => {
    socket.to(data.to).emit("answer", {
      answer: data.answer,
      from: socket.id,
    });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.to).emit("ice-candidate", {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  socket.on("joinRoom", ({ roomId }) => {
    console.log(`User ${socket.id} joining room ${roomId}`);
    socket.join(roomId);
  });

  socket.on("leaveRoom", () => {
    const roomId = [...socket.rooms].find((room) => room !== socket.id);
    if (roomId) {
      socket.to(roomId).emit("partnerLeft");
      socket.leave(roomId);
    }
  });

  socket.on("error", (error) => {
    courtJester.handleError(socket, "generalError", error.message);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`The castle gates are open on port ${PORT}`)
);
