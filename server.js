const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const courtJester = require("./courtJester");
// const { iceServers } = require("./magicConfig");
const axios = require("axios");
require("dotenv").config();

let activeRooms = new Map();
let endedRooms = new Set();

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

function attemptPairing() {
  while (waitingUsers.length >= 2 && activeRooms.size <= 30) {
    const currentUser = waitingUsers.shift();
    const partner = waitingUsers.shift();

    const roomId = `${currentUser.id}-${partner.id}`;

    activeRooms.set(roomId, {
      participants: new Set([currentUser.id, partner.id]),
      createdAt: Date.now(),
    });

    currentUser.join(roomId);
    partner.join(roomId);

    activeRooms.add(roomId);

    io.to(currentUser.id).emit("paired", {
      partnerAlias: partner.alias,
      roomId,
      isInitiator: true,
    });
    io.to(partner.id).emit("paired", {
      partnerAlias: currentUser.alias,
      roomId,
      isInitiator: false,
    });
  }
}

async function getTurnCredentials() {
  try {
    const response = await axios.get(
      `https://confessions.metered.live/api/v1/turn/credentials?apiKey=${process.env.TURN_API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching TURN credentials:", error);
    return [{ urls: "stun:stun.relay.metered.ca:80" }];
  }
}

function handleRoomEnd(roomId) {
  if (activeRooms.has(roomId)) {
    io.to(roomId).emit("roomEnded", { permanent: true });
    endedRooms.add(roomId);
    activeRooms.delete(roomId);

    setTimeout(() => {
      endedRooms.delete(roomId);
    }, 60 * 60 * 1000);
  }
}

function isValidParticipant(socket, roomId) {
  const room = activeRooms.get(roomId);
  return room && room.participants.has(socket.id);
}

let waitingUsers = [];

io.on("connection", (socket) => {
  console.log("A new guest has arrived at the castle");

  // Store socket's current room for validation
  let currentRoomId = null;

  socket.on("setAlias", (alias) => {
    socket.alias = alias;
    waitingUsers.push(socket);
    io.emit(
      "waitingUsersUpdate",
      waitingUsers.map((user) => user.alias)
    );

    attemptPairing();

    console.log(`${alias} has joined`);
  });

  socket.on("requestWaitingUsers", () => {
    socket.emit(
      "waitingUsersUpdate",
      waitingUsers.map((user) => user.alias)
    );
  });

  socket.on("requestTurnCredentials", async () => {
    const credentials = await getTurnCredentials();
    // console.log("credentials", credentials);
    socket.emit("turnCredentials", credentials);
  });

  // WebRTC Signaling
  socket.on("offer", (data) => {
    // console.log("offer received", data);
    if (isValidParticipant(socket, data.to)) {
      socket.to(data.to).emit("offer", {
        offer: data.offer,
        from: socket.id,
      });
    }
  });

  socket.on("answer", (data) => {
    // console.log("Answer received:", data);
    if (isValidParticipant(socket, data.to)) {
      socket.to(data.to).emit("answer", {
        answer: data.answer,
        from: socket.id,
      });
    }
  });

  socket.on("ice-candidate", (data) => {
    // console.log("ICE candidate received:", data);
    if (isValidParticipant(socket, data.to)) {
      socket.to(data.to).emit("ice-candidate", {
        candidate: data.candidate,
        from: socket.id,
      });
    }
  });

  socket.on("joinRoom", ({ roomId }) => {
    console.log(`User ${socket.id} joining room ${roomId}`);

    // Check if room is ended
    if (endedRooms.has(roomId)) {
      socket.emit("roomEnded", { permanent: true });
      return;
    }

    // Check if room exists and socket is a valid participant
    if (!isValidParticipant(socket, roomId)) {
      socket.emit("roomEnded", { permanent: true });
      return;
    }

    currentRoomId = roomId;
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("leaveRoom", () => {
    if (currentRoomId) {
      socket.to(currentRoomId).emit("partnerLeft");
      socket.leave(currentRoomId);
      handleRoomEnd(currentRoomId);
      currentRoomId = null;
      attemptPairing();
    }
  });

  socket.on("mediaPermissionDenied", ({ roomId }) => {
    if (isValidParticipant(socket, roomId)) {
      socket.to(roomId).emit("mediaPermissionDenied");
    }
  });

  socket.on("disconnect", () => {
    waitingUsers = waitingUsers.filter((user) => user.id !== socket.id);
    io.emit(
      "waitingUsersUpdate",
      waitingUsers.map((user) => user.alias)
    );
    if (currentRoomId) {
      handleRoomEnd(currentRoomId);
      attemptPairing();
    }
    console.log(`${socket.alias} has left`);
  });

  socket.on("error", (error) => {
    courtJester.handleError(socket, "generalError", error.message);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`The castle gates are open on port ${PORT}`)
);
