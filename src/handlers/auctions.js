const uuid = require("uuid");
const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.createAuction = async (event) => {
  const { title } = JSON.parse(event.body);
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(now.getHours() + 1);

  if (!title) {
    return {
      statusCode: 422,
      body: JSON.stringify({ message: "Title is required" })
    };
  }

  const auction = {
    id: uuid.v4(),
    title,
    status: "OPEN",
    createdAt: now.toISOString(),
    endingAt: endDate.toISOString(),
    highestBid: {
      amount: 0
    }
  };

  try {
    await dynamodb
      .put({
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Item: auction
      })
      .promise();
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: err.message })
    };
  }

  return {
    statusCode: 201,
    body: JSON.stringify(auction)
  };
};

module.exports.getAuctions = async () => {
  let auctions;
  try {
    const { Items } = await dynamodb
      .scan({ TableName: process.env.AUCTIONS_TABLE_NAME })
      .promise();
    auctions = Items;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: err.message })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(auctions)
  };
};

module.exports.getAuction = async (event) => {
  let auction;
  const { id } = event.pathParameters;
  try {
    const { Item } = await dynamodb
      .get({
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id }
      })
      .promise();
    auction = Item;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: err.message })
    };
  }

  if (!auction) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Auction not found" })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(auction)
  };
};

module.exports.placeBid = async (event) => {
  let updatedAuction;
  const { id } = event.pathParameters;
  const { amount } = JSON.parse(event.body);

  const { body: existedAuction, statusCode: existedAuctionStatus } =
    await this.getAuction(event);

  if (existedAuctionStatus === 200) {
    const { highestBid, status: existedAuctionStatus } =
      JSON.parse(existedAuction);

    if (amount <= highestBid.amount) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          message: `Your bid must be higher than ${highestBid.amount}`
        })
      };
    }

    if (existedAuctionStatus === "CLOSED") {
      return {
        statusCode: 422,
        body: JSON.stringify({
          message: "You can't bid on closed auction"
        })
      };
    }

    if (!amount || isNaN(amount)) {
      return {
        statusCode: 422,
        body: JSON.stringify({ message: "No amount or ivalid amount passed" })
      };
    }

    const params = {
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Key: { id },
      UpdateExpression: "set highestBid.amount = :amount",
      ExpressionAttributeValues: {
        ":amount": amount
      },
      ReturnValues: "ALL_NEW"
    };

    try {
      const { Attributes } = await dynamodb.update(params).promise();
      updatedAuction = Attributes;
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: err.message })
      };
    }
  } else {
    return {
      statusCode: existedAuctionStatus,
      body: JSON.stringify({ message: "Auction doesn't exist" })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction)
  };
};
