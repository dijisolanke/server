module.exports = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credentials: process.env.TURN_CREDENTIAL,
    },
  ],
};
