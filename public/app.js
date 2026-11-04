// const $ = (id) => document.getElementById(id);
// let jsession = "",
//   vehicles = [],
//   selected = "all",
//   player = null,
//   cameraList = [];
// const mediaHost = "127.0.0.1";
// const mediaPort = 3000; // Set to the port of your existing working CMSV6 media proxy.
// const status = (message, type = "") => {
//   $("status").textContent = message;
//   $("status").className = "status " + type;
// };
// const post = async (url, body) => {
//   const r = await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   const data = await r.json();
//   if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
//   return data;
// };
// function extractCameras() {
//   return vehicles.flatMap((v) =>
//     v.devices.flatMap((d) =>
//       Array.from(
//         { length: Math.min(64, Math.max(0, d.channelCount)) },
//         (_, channel) => ({
//           vehicleId: v.id,
//           vehicle: v.name,
//           devIdno: d.devIdno,
//           did: d.did,
//           channel,
//           label:
//             d.channelNames.split(",")[channel]?.trim() || `CH${channel + 1}`,
//         }),
//       ).filter((c) => c.devIdno),
//     ),
//   );
// }
// function updateFleet() {
//   const all = extractCameras();
//   $("vehicleCount").textContent = vehicles.length;
//   $("deviceCount").textContent = vehicles.reduce(
//     (n, v) => n + v.devices.length,
//     0,
//   );
//   $("cameraCount").textContent = all.length;
//   $("vehicles").replaceChildren();
//   for (const v of vehicles) {
//     const btn = document.createElement("button");
//     btn.className =
//       "vehicle" + (String(selected) === String(v.id) ? " active" : "");
//     btn.textContent = v.name;
//     const small = document.createElement("small");
//     small.textContent = `${v.devices.length} device(s) · ${all.filter((c) => String(c.vehicleId) === String(v.id)).length} camera(s)`;
//     btn.append(small);
//     btn.onclick = () => {
//       selected = v.id;
//       updateFleet();
//       play();
//     };
//     $("vehicles").append(btn);
//   }
//   if (!vehicles.length)
//     $("vehicles").textContent = "No authorized vehicles returned.";
//   $("allBtn").disabled = !vehicles.length;
//   $("refreshBtn").disabled = !jsession;
//   $("playBtn").disabled = !all.length;
//   $("logoutBtn").disabled = !jsession;
// }
// function stop() {
//   if (player) {
//     try {
//       player.stopVideo?.();
//     } catch {}
//     try {
//       player.destroy?.();
//     } catch {}
//     player = null;
//   }
//   $("cameraGrid").replaceChildren();
// }
// function play() {
//   stop();
//   cameraList = extractCameras().filter(
//     (c) => selected === "all" || String(c.vehicleId) === String(selected),
//   );
//   $("subtitle").textContent =
//     `${cameraList.length} camera channel(s) · ${selected === "all" ? "All vehicles" : "Selected vehicle"}`;
//   if (!cameraList.length) {
//     $("cameraGrid").textContent =
//       "No camera channels available for this selection.";
//     return;
//   }
//   const grid = $("cameraGrid");
//   grid.className = "grid cols" + $("gridSize").value;
//   for (const [i, c] of cameraList.entries()) {
//     const card = document.createElement("article");
//     card.className = "camera";
//     const head = document.createElement("div");
//     head.className = "camera-head";
//     const name = document.createElement("strong");
//     name.textContent = `${c.vehicle} · ${c.label}`;
//     const live = document.createElement("span");
//     live.className = "live";
//     live.textContent = "CONNECTING";
//     head.append(name, live);
//     const screen = document.createElement("div");
//     screen.className = "screen";
//     const target = document.createElement("div");
//     target.className = "player-target";
//     target.id = "camera-" + i;
//     screen.append(target);
//     const foot = document.createElement("div");
//     foot.className = "camera-foot";
//     foot.textContent = `Device ${c.devIdno} · DID ${c.did ?? "—"} · Channel ${c.channel + 1}`;
//     card.append(head, screen, foot);
//     grid.append(card);
//   }
//   if (typeof Cmsv6Player !== "function") {
//     status("cmsv6player.min.js missing or failed to load", "error");
//     return;
//   }
//   try {
//     player = new Cmsv6Player({
//       domId: "cameraGrid",
//       isVodMode: false,
//       width: 800,
//       height: 450,
//       lang: "en",
//     });
//     player.setWindowNum(cameraList.length);
//     player.setServerInfo(mediaHost, mediaPort);
//     player.addEventListener("onTtxVideoMsg", (...args) =>
//       console.log("CMS player:", ...args),
//     );
//     cameraList.forEach((c, i) =>
//       player.startVideo(
//         i,
//         jsession,
//         String(c.devIdno),
//         c.channel,
//         Number($("streamType").value),
//         true,
//       ),
//     );
//     status(`Requested ${cameraList.length} camera streams`, "success");
//   } catch (err) {
//     status(`Playback initialization: ${err.message}`, "error");
//     console.error(err);
//   }
// }
// async function loadVehicles() {
//   status("Loading authorized vehicles...");
//   const data = await post("/api/vehicles", { jsession });
//   vehicles = data.vehicles;
//   selected = "all";
//   updateFleet();
//   play();
// }
// $("loginForm").addEventListener("submit", async (e) => {
//   e.preventDefault();
//   $("loginBtn").disabled = true;
//   status("Authenticating...");
//   try {
//     const result = await post("/api/login", {
//       account: $("account").value.trim(),
//       password: $("password").value,
//     });
//     console.log(result);

//     jsession = result.jsession;
//     $("password").value = "";
//     $("accountTag").textContent = "● " + (result.account_name || "Connected");
//     await loadVehicles();
//   } catch (err) {
//     console.log(err.response.message);
//     status(err.message, "error");
//   } finally {
//     $("loginBtn").disabled = false;
//   }
// });
// $("allBtn").onclick = () => {
//   selected = "all";
//   updateFleet();
//   play();
// };
// $("playBtn").onclick = play;
// $("refreshBtn").onclick = async () => {
//   try {
//     await loadVehicles();
//   } catch (err) {
//     status(err.message, "error");
//   }
// };
// $("streamType").onchange = () => {
//   if (jsession) play();
// };
// $("gridSize").onchange = () => {
//   $("cameraGrid").className = "grid cols" + $("gridSize").value;
// };
// $("logoutBtn").onclick = () => {
//   stop();
//   jsession = "";
//   vehicles = [];
//   selected = "all";
//   $("accountTag").textContent = "● Not connected";
//   updateFleet();
//   $("playBtn").disabled = true;
//   $("subtitle").textContent = "Sign in to view cameras";
//   status("Disconnected");
// };

"use strict";

// ======================================================
// CMSV6 CAMERA DASHBOARD
// Separate CMSV6 player instance for each camera
// ======================================================

// DOM helper
const getElement = (id) => document.getElementById(id);

// Application state
let jsession = "";
let vehicles = [];
let selected = "all";
let cameraList = [];
let players = [];
let playbackGeneration = 0;

// CMSV6 media proxy configuration
const mediaHost = "127.0.0.1";
const mediaPort = 3000;

// Limit simultaneous streams to protect browser resources.
// Set to Infinity only after performance testing.
const MAX_ACTIVE_CAMERAS = 16;

// ======================================================
// STATUS
// ======================================================

function setStatus(message, type = "") {
  const element = getElement("status");

  if (!element) return;

  element.textContent = message;
  element.className = `status ${type}`;
}

function updateMonitorCount(count) {
  const element = getElement("monitorCount");

  if (element) {
    element.textContent = `${count} camera channel(s)`;
  }
}

// ======================================================
// API REQUEST
// ======================================================

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Invalid API response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }

  return data;
}

// ======================================================
// EXTRACT CAMERAS FROM VEHICLES
// ======================================================

function extractCameras() {
  return vehicles.flatMap((vehicle) => {
    const devices = Array.isArray(vehicle.devices) ? vehicle.devices : [];

    return devices.flatMap((device) => {
      const channelCount = Math.min(
        64,
        Math.max(0, Number(device.channelCount) || 0),
      );

      const channelNames = String(device.channelNames || "").split(",");

      return Array.from({ length: channelCount }, (_, channel) => ({
        vehicleId: vehicle.id,
        vehicle: vehicle.name || "Unknown Vehicle",
        devIdno: device.devIdno,
        did: device.did,
        channel,
        label: channelNames[channel]?.trim() || `CH${channel + 1}`,
      })).filter((camera) => camera.devIdno);
    });
  });
}

// ======================================================
// UPDATE VEHICLE SIDEBAR
// ======================================================

function updateFleet() {
  const allCameras = extractCameras();

  getElement("vehicleCount").textContent = vehicles.length;

  getElement("deviceCount").textContent = vehicles.reduce(
    (total, vehicle) => total + (vehicle.devices?.length || 0),
    0,
  );

  getElement("cameraCount").textContent = allCameras.length;

  const vehicleContainer = getElement("vehicles");
  vehicleContainer.replaceChildren();

  if (!vehicles.length) {
    vehicleContainer.textContent = "No authorized vehicles returned.";
  }

  vehicles.forEach((vehicle) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className =
      "vehicle" + (String(selected) === String(vehicle.id) ? " active" : "");

    button.textContent = vehicle.name || `Vehicle ${vehicle.id}`;

    const small = document.createElement("small");

    const count = allCameras.filter(
      (camera) => String(camera.vehicleId) === String(vehicle.id),
    ).length;

    small.textContent =
      `${vehicle.devices?.length || 0} device(s) · ` + `${count} camera(s)`;

    button.appendChild(small);

    button.addEventListener("click", () => {
      selected = vehicle.id;
      updateFleet();
      play();
    });

    vehicleContainer.appendChild(button);
  });

  getElement("allBtn").disabled = !vehicles.length;

  getElement("refreshBtn").disabled = !jsession;

  getElement("playBtn").disabled = !allCameras.length;

  getElement("logoutBtn").disabled = !jsession;
}

// ======================================================
// DESTROY EXISTING PLAYERS
// ======================================================

function stop() {
  playbackGeneration++;

  players.forEach(({ instance, index }) => {
    try {
      instance.stopVideo?.(0);
    } catch (error) {
      console.warn(`Camera ${index + 1} stop error:`, error);
    }

    try {
      instance.destroy?.();
    } catch (error) {
      console.warn(`Camera ${index + 1} destroy error:`, error);
    }
  });

  players = [];

  const grid = getElement("cameraGrid");

  if (grid) {
    grid.replaceChildren();
  }

  updateMonitorCount(0);
}

// ======================================================
// CREATE CAMERA CARD
// ======================================================

function createCameraCard(camera, index) {
  const card = document.createElement("article");
  card.className = "camera";

  // Camera header
  const header = document.createElement("div");
  header.className = "camera-head";

  const title = document.createElement("strong");
  title.textContent = `${camera.vehicle} · ${camera.label}`;

  const indicator = document.createElement("span");
  indicator.className = "live";
  indicator.textContent = "CONNECTING";

  header.append(title, indicator);

  // Video screen
  const screen = document.createElement("div");
  screen.className = "screen";

  const videoTarget = document.createElement("div");
  videoTarget.className = "player-target";
  videoTarget.id = `camera-player-${index}`;

  screen.appendChild(videoTarget);

  // Camera footer
  // const footer = document.createElement("div");
  // footer.className = "camera-foot";

  // footer.textContent =
  //   `Device: ${camera.devIdno} · ` +
  //   `DID: ${camera.did ?? "N/A"} · ` +
  //   `Channel: ${camera.channel + 1}`;

  card.append(header, screen);

  return {
    card,
    videoTarget,
    indicator,
  };
}

// ======================================================
// START INDIVIDUAL CAMERA
// ======================================================

function startCamera(camera, index, generation) {
  const { card, videoTarget, indicator } = createCameraCard(camera, index);

  getElement("cameraGrid").appendChild(card);

  try {
    // One CMSV6 instance per camera
    const cameraPlayer = new Cmsv6Player({
      domId: videoTarget.id,
      isVodMode: false,
      width: 500,
      height: 360,
      lang: "en",
    });

    // Exactly one window per player
    cameraPlayer.setWindowNum(1);

    // Existing HTTP media proxy
    cameraPlayer.setServerInfo(mediaHost, mediaPort);

    cameraPlayer.addEventListener("onTtxVideoMsg", (...args) => {
      if (generation !== playbackGeneration) {
        return;
      }

      console.log(`[CAMERA ${index + 1}]`, ...args);

      // SDK events are logged here.
      // Do not mark LIVE without verifying
      // the actual event semantics.
    });

    const streamType = Number(getElement("streamType").value);

    // Window index is always 0.
    // Channel is the real device channel.
    cameraPlayer.startVideo(
      0,
      jsession,
      String(camera.devIdno),
      camera.channel,
      streamType,
      true,
    );

    players.push({
      instance: cameraPlayer,
      index,
      camera,
      indicator,
    });
  } catch (error) {
    console.error(`Camera ${index + 1} initialization failed:`, error);

    indicator.textContent = "ERROR";
    indicator.classList.add("error");

    const errorMessage = document.createElement("div");
    errorMessage.className = "camera-error";
    errorMessage.textContent = "Unable to initialize camera player";

    videoTarget.appendChild(errorMessage);
  }
}

// ======================================================
// PLAY CAMERAS
// ======================================================

function play() {
  stop();

  const generation = playbackGeneration;

  cameraList = extractCameras().filter(
    (camera) =>
      selected === "all" || String(camera.vehicleId) === String(selected),
  );

  const grid = getElement("cameraGrid");

  const columns = Number(getElement("gridSize").value);

  grid.className = `grid cols${columns}`;

  getElement("subtitle").textContent =
    `${cameraList.length} camera channel(s) · ` +
    (selected === "all" ? "All vehicles" : "Selected vehicle");

  if (!cameraList.length) {
    const empty = document.createElement("div");
    empty.className = "monitor-empty";

    const heading = document.createElement("h3");
    heading.textContent = "No cameras available";

    const description = document.createElement("p");
    description.textContent = "No authorized camera channels were found.";

    empty.append(heading, description);
    grid.appendChild(empty);

    setStatus("No camera channels available");
    return;
  }

  if (typeof Cmsv6Player !== "function") {
    setStatus("cmsv6player.min.js is missing or failed to load", "error");
    return;
  }

  const activeCameras = cameraList.slice(0, MAX_ACTIVE_CAMERAS);

  activeCameras.forEach((camera, index) => {
    startCamera(camera, index, generation);
  });

  updateMonitorCount(activeCameras.length);

  const requested = players.length;

  setStatus(
    `Requested ${requested} of ${cameraList.length} camera streams`,
    requested ? "success" : "error",
  );

  // "Requested" means playback was initiated,
  // not that video frames have been received.
}

// ======================================================
// LOAD VEHICLES
// ======================================================

async function loadVehicles() {
  setStatus("Loading authorized vehicles...");

  const data = await post("/api/vehicles", {
    jsession,
  });

  if (!Array.isArray(data.vehicles)) {
    throw new Error("Invalid vehicle list returned by API");
  }

  vehicles = data.vehicles;
  selected = "all";

  updateFleet();
  play();
}

// ======================================================
// LOGIN
// ======================================================

getElement("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const loginButton = getElement("loginBtn");
  loginButton.disabled = true;

  setStatus("Authenticating...");

  try {
    const account = getElement("account").value.trim();
    const password = getElement("password").value;

    const result = await post("/api/login", {
      account,
      password,
    });

    if (!result.jsession) {
      throw new Error("Login succeeded without a valid jsession");
    }

    stop();

    jsession = result.jsession;
    vehicles = [];
    selected = "all";

    getElement("password").value = "";

    getElement("accountTag").textContent =
      "● " + (result.account_name || "Connected");

    await loadVehicles();
  } catch (error) {
    console.error("Login/load error:", error);

    setStatus(error.message || "Login failed", "error");
  } finally {
    loginButton.disabled = false;
  }
});

// ======================================================
// ALL CAMERAS BUTTON
// ======================================================

getElement("allBtn").addEventListener("click", () => {
  selected = "all";
  updateFleet();
  play();
});

// ======================================================
// PLAY BUTTON
// ======================================================

getElement("playBtn").addEventListener("click", () => {
  if (!jsession) {
    setStatus("Please sign in first", "error");
    return;
  }

  play();
});

// ======================================================
// REFRESH VEHICLES
// ======================================================

getElement("refreshBtn").addEventListener("click", async () => {
  try {
    await loadVehicles();
  } catch (error) {
    console.error("Refresh error:", error);
    setStatus(error.message, "error");
  }
});

// ======================================================
// CHANGE STREAM QUALITY
// ======================================================

getElement("streamType").addEventListener("change", () => {
  if (jsession) {
    play();
  }
});

// ======================================================
// CHANGE GRID COLUMNS
// ======================================================

getElement("gridSize").addEventListener("change", () => {
  const columns = Number(getElement("gridSize").value);

  getElement("cameraGrid").className = `grid cols${columns}`;
});

// ======================================================
// LOGOUT
// ======================================================

getElement("logoutBtn").addEventListener("click", () => {
  stop();

  jsession = "";
  vehicles = [];
  selected = "all";
  cameraList = [];

  getElement("accountTag").textContent = "● Not connected";

  getElement("subtitle").textContent = "Sign in to view cameras";

  updateFleet();

  setStatus("Disconnected");
});

// ======================================================
// FULLSCREEN
// ======================================================

const fullscreenBtn = getElement("fullscreenBtn");
const monitorPanel = getElement("monitorPanel");

if (fullscreenBtn && monitorPanel) {
  fullscreenBtn.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await monitorPanel.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen failed:", error);

      setStatus("Unable to enter fullscreen", "error");
    }
  });

  document.addEventListener("fullscreenchange", () => {
    fullscreenBtn.textContent = document.fullscreenElement
      ? "⛶ Exit fullscreen"
      : "⛶ Fullscreen";
  });
}

// ======================================================
// INITIAL STATE
// ======================================================

updateFleet();

console.log("[CMSV6] Camera dashboard initialized");
