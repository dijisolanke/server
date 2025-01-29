const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const courtJester = require("./courtJester");
// const { iceServers } = require("./magicConfig");
const axios = require("axios");
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

// Add room tracking and cleanup
const rooms = new Map();
const ROOM_TIMEOUT = 1000 * 10; // 10 seconds in milliseconds
// const ROOM_TIMEOUT = 1000 * 60 * 15;

const MAX_CONCURRENT_ROOMS = 30; // 60 users max
const MAX_WAITING_USERS = 20;

// Add basic monitoring
const metrics = {
  activeRooms: 0,
  waitingUsers: 0,
  totalConnections: 0,
  failedConnections: 0,
};

function checkRoomTimeout(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const now = Date.now();
  const roomAge = now - room.createdAt;

  if (roomAge >= ROOM_TIMEOUT) {
    // Room has exceeded 15 minutes
    console.log(`Room ${roomId} has timed out`);

    // Notify users in the room
    io.to(roomId).emit("roomTimeout", {
      message: "Chat session has ended due to time limit",
    });

    // Clean up the room
    rooms.delete(roomId);

    // Force disconnect users from the room
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(roomId);
        }
      }
    }
  }
}

setInterval(() => {
  for (const roomId of rooms.keys()) {
    checkRoomTimeout(roomId);
  }
}, 1000 * 60); // Check every minute

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
      rooms.set(roomId, {
        users: [currentUser.id, partner.id],
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });

      currentUser.join(roomId);
      partner.join(roomId);

      io.to(currentUser.id).emit("paired", {
        partnerAlias: partner.alias,
        roomId,
        isInitiator: true, // Add this
      });
      io.to(partner.id).emit("paired", {
        partnerAlias: currentUser.alias,
        roomId,
        isInitiator: false, // Add this
      });
    }
    console.log(`${alias} has joined`);
  });

  socket.on("requestTurnCredentials", async () => {
    const credentials = await getTurnCredentials();
    console.log("credentials", credentials); // remove later
    socket.emit("turnCredentials", credentials);
  });

  // WebRTC Signaling
  socket.on("offer", (data) => {
    console.log("offer received", data);
    socket.to(data.to).emit("offer", {
      offer: data.offer,
      from: socket.id,
    });
  });

  socket.on("answer", (data) => {
    console.log("Answer received:", data);
    socket.to(data.to).emit("answer", {
      answer: data.answer,
      from: socket.id,
    });
  });

  socket.on("ice-candidate", (data) => {
    const room = rooms.get(data.to);
    if (room) {
      room.lastActivity = Date.now();
    }

    console.log("ICE candidate received:", data);
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
      rooms.delete(roomId); // Clean up room when someone leaves
      socket.to(roomId).emit("partnerLeft");
      socket.leave(roomId);
    }
  });
  socket.on("disconnect", () => {
    waitingUsers = waitingUsers.filter((user) => user.id !== socket.id);
    io.emit(
      "waitingUsersUpdate",
      waitingUsers.map((user) => user.alias)
    );
    console.log(`${socket.alias} has left`);

    for (const [roomId, room] of rooms.entries()) {
      if (room.users.includes(socket.id)) {
        rooms.delete(roomId);
      }
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
