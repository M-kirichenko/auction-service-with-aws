const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.getEndedAuctions = async () => {
  const now = new Date();
  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    IndexName: "statusAndEndDate",
    KeyConditionExpression: "#status = :status AND endingAt <= :now",
    ExpressionAttributeValues: {
      ":status": "OPEN",
      ":now": now.toISOString()
    },
    ExpressionAttributeNames: {
      "#status": "status"
    }
  };

  const { Items: auctionsToClose } = await dynamodb.query(params).promise();
  return auctionsToClose;
};

exports.closeAuction = async (auction) => {
  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id: auction.id },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeValues: {
      ":status": "CLOSED"
    },
    ExpressionAttributeNames: {
      "#status": "status"
    }
  };
  const result = await dynamodb.update(params).promise();
  return result;
};
