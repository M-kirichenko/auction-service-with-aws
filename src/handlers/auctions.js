const uuid = require("uuid");
const AWS = require("aws-sdk");
const createError = require("http-errors");
const commonMiddleware = require("../lib/commonMiddleware");

const dynamodb = new AWS.DynamoDB.DocumentClient();

const createAuction = async (event) => {
  const { title } = event.body;
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(now.getHours() + 1);

  if (!title)
    throw new createError(
      422,
      JSON.stringify({ message: "Title is required" })
    );

  const auction = {
    id: uuid.v4(),
    title,
    status: "OPEN",
    createdAt: now.toISOString(),
    endingAt: endDate.toISOString(),
    highestBid: {
      amount: 0,
    },
  };

  try {
    await dynamodb
      .put({
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Item: auction,
      })
      .promise();
  } catch (err) {
    throw new createError(400, JSON.stringify({ message: err.message }));
  }

  return {
    statusCode: 201,
    body: JSON.stringify(auction),
  };
};

const getAuctions = async (event) => {
  let auctions;
  let status = "OPEN";

  if (event.queryStringParameters) {
    status = event.queryStringParameters.status;
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    IndexName: "statusAndEndDate",
    KeyConditionExpression: "#status = :status",
    ExpressionAttributeValues: {
      ":status": status ? status : "OPEN",
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  try {
    const { Items } = await dynamodb.query(params).promise();
    auctions = Items;
  } catch (err) {
    throw new createError(400, JSON.stringify({ message: err.message }));
  }

  return {
    statusCode: 200,
    body: JSON.stringify(auctions),
  };
};

const getAuction = async (event) => {
  let auction;
  const { id } = event.pathParameters;
  try {
    const { Item } = await dynamodb
      .get({
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id },
      })
      .promise();
    auction = Item;
  } catch (err) {
    throw new createError(400, JSON.stringify({ message: err.message }));
  }

  if (!auction)
    throw new createError.NotFound(
      JSON.stringify({ message: "Auction's not found" })
    );

  return {
    statusCode: 200,
    body: JSON.stringify(auction),
  };
};

const placeBid = async (event) => {
  let updatedAuction;
  const { id } = event.pathParameters;
  const { amount } = event.body;
  let existedAuction;
  try {
    existedAuction = await getAuction(event);
  } catch (err) {
    throw new createError(400, JSON.stringify({ message: err.message }));
  }

  if (existedAuction.statusCode === 200) {
    const { highestBid, status: existedAuctionStatus } = JSON.parse(
      existedAuction.body
    );

    if (amount <= highestBid.amount) {
      throw new createError(
        422,
        JSON.stringify({
          message: `Your bid must be higher than ${highestBid.amount}`,
        })
      );
    }

    if (existedAuctionStatus === "CLOSED") {
      throw new createError(
        422,
        JSON.stringify({ message: "You can't bid on closed auction" })
      );
    }

    if (!amount || isNaN(amount)) {
      throw new createError(422, "No amount or ivalid amount passed");
    }

    const params = {
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Key: { id },
      UpdateExpression: "set highestBid.amount = :amount",
      ExpressionAttributeValues: {
        ":amount": amount,
      },
      ReturnValues: "ALL_NEW",
    };

    try {
      const { Attributes } = await dynamodb.update(params).promise();
      updatedAuction = Attributes;
    } catch (err) {
      throw new createError(400, JSON.stringify({ message: err.message }));
    }
  } else {
    throw new createError.NotFound(
      JSON.stringify({ message: "Auction's not found" })
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
};

module.exports = {
  getAuctions: commonMiddleware(getAuctions),
  createAuction: commonMiddleware(createAuction),
  getAuction: commonMiddleware(getAuction),
  placeBid: commonMiddleware(placeBid),
};
