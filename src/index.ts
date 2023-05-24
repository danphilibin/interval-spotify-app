import "dotenv/config";
import Interval from "@interval/sdk";
import path from "path";
import express from "express";
import consoleStamp from "console-stamp";

consoleStamp(console);

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Heartbeat");
});

app.listen(port, () => console.log(`Spotify app listening on port ${port}!`));

const interval = new Interval({
  apiKey: process.env.INTERVAL_KEY,
  routesDirectory: path.join(__dirname, "routes"),
  pingIntervalMs: 30_000,
  pingTimeoutMs: 5_000,
});

interval.listen();
