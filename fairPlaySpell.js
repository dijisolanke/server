class FairPlaySpell {
  constructor() {
    this.waitingGuests = [];
  }

  addToWaitingList(guestId) {
    this.waitingGuests.push(guestId);
  }

  removeFromWaitingList(guestId) {
    this.waitingGuests = this.waitingGuests.filter((id) => id !== guestId);
  }

  findMatch(guestId) {
    if (this.waitingGuests.length > 0 && this.waitingGuests[0] !== guestId) {
      return this.waitingGuests.shift();
    }
    return null;
  }
}

module.exports = new FairPlaySpell();
