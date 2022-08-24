const createError = require("http-errors");
const {
  getEndedAuctions,
  closeAuction,
} = require("../lib/auctionProcessTriggers");

module.exports.handler = async () => {
  try {
    const auctionsToClose = await getEndedAuctions();
    const closePromises = auctionsToClose.map((auction) =>
      closeAuction(auction)
    );
    await Promise.all(closePromises);
    return { closed: closePromises.length };
  } catch (err) {
    throw new createError(400, JSON.stringify({ message: err.message }));
  }
};
