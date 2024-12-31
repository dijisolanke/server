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

// //summon the magic powres
// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const fairPlaySpell = require("./fairPlaySpell");
// const courtJester = require("./courtJester");
// const { iceServers } = require("./magicConfig");
// require("dotenv").config();

// //create the castle foundation
// const app = express();
// const server = require("http").createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: [
//       "http://localhost:5173",
//       "https://confession-box.vercel.app", //change to vercel app
//       "https://confession-box-server.onrender.com", //change to server on render
//     ], // Adjust this to allow requests only from your front-end origin
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// let guests = new Map();
// let waitingUsers = [];

// io.on("connection", (socket) => {
//   console.log("a new guest has arrived at the castle");

//   // Handle anonymous alias
//   socket.on("setAlias", (alias) => {
//     socket.alias = alias; //store alias in socket object
//     waitingUsers.push(socket); //add guest to waiting list

//     // Notify all clients about the updated waiting users list
//     io.emit("waitingUsersUpdate", waitingUsers.map(user => user.alias));

//     if (waitingUsers.length >= 2) {
//       const currentUser = waitingUsers.shift();
//       const partner = waitingUsers.shift();

//       io.to(currentUser.id).emit("paired", {partnerAlias: partner.alias});
//       io.to(partner.id).emit("paired", { partnerAlias: currentUser.alias });

//       //setup WebRTC connection here
//       const peerConnection = new RTCPeerConnection({ iceServers });
//     }

//     console.log(`${alias} has joined`);
//   });
//   //guest enters the Great Hall
//   socket.on("enter", (guestName) => {
//     waitingUsers.push(guestName);
//     io.emit("guestList", waitingUsers);
//   });

//   // Guest leaves the Castle
//   socket.on("disconnect", () => {
//     waitingUsers = waitingUsers.filter((user) => user.id !== socket.id);
//     //might now be "waitingUsersUpdate"
//     io.emit("guestListUpdate", waitingUsers.map(user => user.alias));
//   });

//   // Matchmaking Wizard's magic
//   socket.on("callGuest", (targetGuestId) => {
//     const caller = guests.get(socket.id);
//     const targetGuest = Array.from(guests.entries()).find(
//       ([_, guest]) => guest.name === targetGuestId
//     );
//     if (targetGuest && targetGuest[1].available) {
//       io.to(targetGuest[0].emit("incomingCall", { from: caller.name }));
//     } else {
//       courtJester.handleError(
//         socket,
//         "callFailed",
//         "The guest is unavailable for a magical conversation"
//       );
//     }
//   });

//   socket.on("acceptCall", (callerName) => {
//     const caller = Array.from(guests.entries()).find(
//       ([_, guest]) => guest.name === callerName
//     );
//     if (caller) {
//       io.to(caller[0]).emit("callAccepted", guests.get(socket.id).name);
//       guests.get(socket.id).available = false;
//       guests.get(caller[0]).available = false;
//       io.emit("guestList", Array.from(guests.values()));
//     }
//   });

//   //create private chamber(video chat room)
//   socket.on("joinPrivateChamber", (chamberName) => {
//     socket.join(chamberName);
//   });

//   socket.on("sendMagicSignal", ({ signal, to }) => {
//     io.to(to).emit("receiveMagicSignal", { signal, from: socket.id });
//   });

//   //matching algorithm in use
//   socket.on("seekMagicalPartner", () => {
//     const match = fairPlaySpell.findMatch(socket.id);
//     if (match) {
//       //notify both guests of the match
//       io.to(socket.id).emit("magical partner found", { partnerId: match });
//       io.to(match).emit("magicalPartnerFound", { partnerId: socket.id });
//     } else {
//       fairPlaySpell.addToWaitingList(socket.id);
//       socket.emit("waitingForMagicalPartner");
//     }
//   });

//   socket.on("cancelSeekingPartner", () => {
//     fairPlaySpell.removeFromWaitingList(socket.id);
//   });

//   socket.on("error", (error) => {
//     courtJester.handleError(socket, "generalError", error.message);
//   });
// });

// //set the castle address and open the gates
// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () =>
//   console.log(`The castle gates are open on port ${PORT}`)
// );
