const {
  getEndedAuctions,
  closeAuction
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
    return {
      statusCode: 400,
      body: JSON.stringify(err.message)
    };
  }
};
