//error handling

class CourtJester {
  handleError(socket, errorType, errorMessage) {
    console.error(`magical mishap: ${errorType} - ${errorMessage})`);
    socket.emit("magicalMishap", { type: errorType, message: errorMessage });
  }
}

module.exports = new CourtJester();
