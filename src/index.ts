import "dotenv/config";
import Interval from "@interval/sdk";
import path from "path";

const interval = new Interval({
  apiKey: process.env.INTERVAL_KEY,
  routesDirectory: path.join(__dirname, "routes"),
});

interval.listen();
