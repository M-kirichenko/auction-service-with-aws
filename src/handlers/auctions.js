const uuid = require("uuid");
const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.createAuction = async (event, context) => {
  const { title } = JSON.parse(event.body);
  const now = new Date();

  if (!title) {
    return {
      statusCode: 422,
      body: JSON.stringify({ message: "Title is required" }),
    };
  }

  const auction = {
    id: uuid.v4(),
    title,
    status: "OPEN",
    createdAt: now.toISOString(),
  };

  try {
    await dynamodb
      .put({
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Item: auction,
      })
      .promise();
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: err.message }),
    };
  }

  return {
    statusCode: 201,
    body: JSON.stringify(auction),
  };
};

exports.getAuctions = async (event, context) => {
  let auctions;
  try {
    const result = await dynamodb
      .scan({ TableName: process.env.AUCTIONS_TABLE_NAME })
      .promise();
    auctions = result.Items;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: err.message }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(auctions),
  };
};
