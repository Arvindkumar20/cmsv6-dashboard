const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const httpProxyServer = require("./http-proxy").default;
const startTCPProxy = require("./tcp-proxy").default;

dotenv.config();
httpProxyServer();
startTCPProxy();
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
const API = process.env.CMS_API_BASE;
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});
const endpoint = async (action, params) => {
  const url = new URL(`${API}/${action}`);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, String(value));
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`CMS HTTP ${response.status}`);
  return response.json();
};

app.post("/api/login", async (req, res) => {
  const { account, password } = req.body || {};
  if (
    typeof account !== "string" ||
    typeof password !== "string" ||
    !account.trim() ||
    !password
  )
    return res.status(400).json({ error: "Account and password required" });
  try {
    const result = await endpoint("StandardApiAction_login.action", {
      account,
      password,
    });
    console.log(account, password);
    console.log(result);
    if (result.result !== 0 || !result.jsession)
      return res.status(401).json({
        error: `CMS login failed (code ${result.result ?? "unknown"})`,
      });
    res.set("Cache-Control", "no-store").json({
      jsession: result.jsession,
      account_name: result.account_name || account,
    });
  } catch (err) {
    console.log(err);
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/vehicles", async (req, res) => {
  const { jsession } = req.body || {};
  if (typeof jsession !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(jsession))
    return res.status(400).json({ error: "Invalid session" });
  try {

    const result = await endpoint("StandardApiAction_queryUserVehicle.action", {
      jsession,
    });
    if (result.result !== 0)
      return res.status(502).json({
        error: `CMS vehicle query failed (code ${result.result ?? "unknown"})`,
      });
    const vehicles = (
      Array.isArray(result.vehicles) ? result.vehicles : []
    ).map((v) => ({
      id: v.id,
      name: v.nm || String(v.id),
      devices: (Array.isArray(v.dl) ? v.dl : []).map((d) => ({
        did: d.did,
        devIdno: d.id,
        channelCount: Number(d.cc) || Number(v.chnCount) || 0,
        channelNames: d.cn || v.chnName || "",
      })),
    }));
    res.set("Cache-Control", "no-store").json({ vehicles });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/video-list", async (req, res) => {
  const {
    jsession,
    didn,
    year,
    chanel,
    month,
    day,
    recordingType,
    fileAtt,
    startSeconds,
    endSeconds,
  } = req.body || {};
  if (typeof jsession !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(jsession))
    return res.status(400).json({ error: "Invalid session" });
  try {
    const result = await endpoint("StandardApiAction_getVideoFileInfo.action", {
      jsession,
      DevIDNO: didn,
      LOC: 1,
      CHN: chanel,
      YEAR: year,
      MON: month,
      DAY: day,
      RECTYPE: recordingType,
      FILEATTR: fileAtt,
      BEG: startSeconds,
      END: endSeconds,
      ARM1: 0,
      ARM2: 0,
      RES: 0,
      STREAM: 0,
      STORE: 0,
    });
    console.log(result);
    if (result.result !== 0)
      return res.status(502).json({
        error: `CMS video query failed (code ${result.result ?? "unknown"})`,
      });
    const videos = (Array.isArray(result.videos) ? result.videos : []).map(
      (v) => ({
        id: v.id,
        name: v.nm || String(v.id),
        duration: Number(v.duration) || 0,
        resolution: v.res || "unknown",
      }),
    );
    res.set("Cache-Control", "no-store").json({ videos: result.files });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.listen(process.env.PORT || 3001, () =>
  console.log(
    `CMS dashboard running on http://localhost:${process.env.PORT || 3001}`,
  ),
);
