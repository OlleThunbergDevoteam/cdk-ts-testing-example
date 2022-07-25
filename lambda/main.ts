import GetPlayer from "./GetPlayer";
import { Player } from "./PlayerType";
import WhoAmI from "./WhoAmI";

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: any;
  identity: {
    username: string;
    claims: {
      [key: string]: string[];
    };
  };
};

exports.handler = async (event: AppSyncEvent) => {
  console.log("TMP TEST");
  switch (event.info.fieldName) {
    case "player":
      return await GetPlayer({ ...event.arguments, ...event.identity });
    case "whoAmI":
      return await WhoAmI(event.identity);
    // if no cases found. return error
    default:
      return {
        error: "No such field",
      };
  }
};
