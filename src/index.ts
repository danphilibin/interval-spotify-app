import "dotenv/config";
import Interval from "@interval/sdk";
import path from "path";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Heartbeat");
});

app.listen(port, () => console.log(`Spotify app listening on port ${port}!`));

const interval = new Interval({
  apiKey: process.env.INTERVAL_KEY,
  routesDirectory: path.join(__dirname, "routes"),
});

interval.listen();
