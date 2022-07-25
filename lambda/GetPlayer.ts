const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
import { Player } from "./PlayerType";

async function GetPlayer({ playerId }: { playerId: string }) {
  const params = {
    TableName: process.env.PLAYER_TABLE_NAME,
    Key: {
      playerId: playerId,
    },
  };
  const data = await docClient.get(params).promise();
  return (data.Item as Player) || null;
}
export default GetPlayer;
