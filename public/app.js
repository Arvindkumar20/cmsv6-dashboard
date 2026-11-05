
// "use strict";

// // ======================================================
// // CMSV6 CAMERA DASHBOARD
// // Separate CMSV6 player instance for each camera
// // ======================================================

// // DOM helper
// const getElement = (id) => document.getElementById(id);

// // Application state
// let jsession = "";
// let vehicles = [];
// let selected = "all";
// let cameraList = [];
// let players = [];
// let playbackGeneration = 0;
// let videoWidth = 1000;
// let videoHeight = 360;

// // CMSV6 media proxy configuration
// const mediaHost = "127.0.0.1";
// const mediaPort = 3000;

// // Limit simultaneous streams to protect browser resources.
// // Set to Infinity only after performance testing.
// const MAX_ACTIVE_CAMERAS = 16;

// // ======================================================
// // STATUS
// // ======================================================

// function setStatus(message, type = "") {
//   const element = getElement("status");

//   if (!element) return;

//   element.textContent = message;
//   element.className = `status ${type}`;
// }

// function updateMonitorCount(count) {
//   const element = getElement("monitorCount");

//   if (element) {
//     element.textContent = `${count} camera channel(s)`;
//   }
// }

// // ======================================================
// // API REQUEST
// // ======================================================

// async function post(url, body) {
//   const response = await fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(body),
//   });

//   let data;

//   try {
//     data = await response.json();
//   } catch {
//     throw new Error(`Invalid API response (HTTP ${response.status})`);
//   }

//   if (!response.ok) {
//     throw new Error(data.error || data.message || `HTTP ${response.status}`);
//   }

//   return data;
// }

// // ======================================================
// // EXTRACT CAMERAS FROM VEHICLES
// // ======================================================

// function extractCameras() {
//   return vehicles.flatMap((vehicle) => {
//     const devices = Array.isArray(vehicle.devices) ? vehicle.devices : [];

//     return devices.flatMap((device) => {
//       const channelCount = Math.min(
//         64,
//         Math.max(0, Number(device.channelCount) || 0),
//       );

//       const channelNames = String(device.channelNames || "").split(",");

//       return Array.from({ length: channelCount }, (_, channel) => ({
//         vehicleId: vehicle.id,
//         vehicle: vehicle.name || "Unknown Vehicle",
//         devIdno: device.devIdno,
//         did: device.did,
//         channel,
//         label: channelNames[channel]?.trim() || `CH${channel + 1}`,
//       })).filter((camera) => camera.devIdno);
//     });
//   });
// }

// // ======================================================
// // UPDATE VEHICLE SIDEBAR
// // ======================================================

// function updateFleet() {
//   const allCameras = extractCameras();

//   getElement("vehicleCount").textContent = vehicles.length;

//   getElement("deviceCount").textContent = vehicles.reduce(
//     (total, vehicle) => total + (vehicle.devices?.length || 0),
//     0,
//   );

//   getElement("cameraCount").textContent = allCameras.length;

//   const vehicleContainer = getElement("vehicles");
//   vehicleContainer.replaceChildren();

//   if (!vehicles.length) {
//     vehicleContainer.textContent = "No authorized vehicles returned.";
//   }

//   vehicles.forEach((vehicle) => {
//     const button = document.createElement("button");

//     button.type = "button";

//     button.className =
//       "vehicle" + (String(selected) === String(vehicle.id) ? " active" : "");

//     button.textContent = vehicle.name || `Vehicle ${vehicle.id}`;

//     const small = document.createElement("small");

//     const count = allCameras.filter(
//       (camera) => String(camera.vehicleId) === String(vehicle.id),
//     ).length;

//     small.textContent =
//       `${vehicle.devices?.length || 0} device(s) · ` + `${count} camera(s)`;

//     button.appendChild(small);

//     button.addEventListener("click", () => {
//       selected = vehicle.id;
//       updateFleet();
//       play();
//     });

//     vehicleContainer.appendChild(button);
//   });

//   getElement("allBtn").disabled = !vehicles.length;

//   getElement("refreshBtn").disabled = !jsession;

//   getElement("playBtn").disabled = !allCameras.length;

//   getElement("logoutBtn").disabled = !jsession;
// }

// // ======================================================
// // DESTROY EXISTING PLAYERS
// // ======================================================

// function stop() {
//   playbackGeneration++;

//   players.forEach(({ instance, index }) => {
//     try {
//       instance.stopVideo?.(0);
//     } catch (error) {
//       console.warn(`Camera ${index + 1} stop error:`, error);
//     }

//     try {
//       instance.destroy?.();
//     } catch (error) {
//       console.warn(`Camera ${index + 1} destroy error:`, error);
//     }
//   });

//   players = [];

//   const grid = getElement("cameraGrid");

//   if (grid) {
//     grid.replaceChildren();
//   }

//   updateMonitorCount(0);
// }

// // ======================================================
// // CREATE CAMERA CARD
// // ======================================================

// function createCameraCard(camera, index) {
//   const card = document.createElement("article");
//   card.className = "camera";

//   // Camera header
//   const header = document.createElement("div");
//   header.className = "camera-head";

//   const title = document.createElement("strong");
//   title.textContent = `${camera.vehicle} · ${camera.label}`;

//   const indicator = document.createElement("span");
//   indicator.className = "live";
//   indicator.textContent = "CONNECTING";

//   header.append(title, indicator);

//   // Video screen
//   const screen = document.createElement("div");
//   screen.className = "screen";

//   const videoTarget = document.createElement("div");
//   videoTarget.className = "player-target";
//   videoTarget.id = `camera-player-${index}`;

//   screen.appendChild(videoTarget);

//   // Camera footer
//   // const footer = document.createElement("div");
//   // footer.className = "camera-foot";

//   // footer.textContent =
//   //   `Device: ${camera.devIdno} · ` +
//   //   `DID: ${camera.did ?? "N/A"} · ` +
//   //   `Channel: ${camera.channel + 1}`;

//   card.append(header, screen);

//   return {
//     card,
//     videoTarget,
//     indicator,
//   };
// }

// // ======================================================
// // START INDIVIDUAL CAMERA
// // ======================================================

// function startCamera(camera, index, generation) {
//   const { card, videoTarget, indicator } = createCameraCard(camera, index);

//   getElement("cameraGrid").appendChild(card);

//   try {
//     // One CMSV6 instance per camera
//     const cameraPlayer = new Cmsv6Player({
//       domId: videoTarget.id,
//       isVodMode: false,
//       width: videoWidth,
//       height: videoHeight,
//       lang: "en",
//     });

//     // Exactly one window per player
//     cameraPlayer.setWindowNum(1);

//     // Existing HTTP media proxy
//     cameraPlayer.setServerInfo(mediaHost, mediaPort);

//     cameraPlayer.addEventListener("onTtxVideoMsg", (...args) => {
//       if (generation !== playbackGeneration) {
//         return;
//       }

//       console.log(`[CAMERA ${index + 1}]`, ...args);

//       // SDK events are logged here.
//       // Do not mark LIVE without verifying
//       // the actual event semantics.
//     });

//     const streamType = Number(getElement("streamType").value);

//     // Window index is always 0.
//     // Channel is the real device channel.
//     cameraPlayer.startVideo(
//       0,
//       jsession,
//       String(camera.devIdno),
//       camera.channel,
//       streamType,
//       true,
//     );

//     players.push({
//       instance: cameraPlayer,
//       index,
//       camera,
//       indicator,
//     });
//   } catch (error) {
//     console.error(`Camera ${index + 1} initialization failed:`, error);

//     indicator.textContent = "ERROR";
//     indicator.classList.add("error");

//     const errorMessage = document.createElement("div");
//     errorMessage.className = "camera-error";
//     errorMessage.textContent = "Unable to initialize camera player";

//     videoTarget.appendChild(errorMessage);
//   }
// }

// // ======================================================
// // PLAY CAMERAS
// // ======================================================

// function play() {
//   stop();

//   const generation = playbackGeneration;

//   cameraList = extractCameras().filter(
//     (camera) =>
//       selected === "all" || String(camera.vehicleId) === String(selected),
//   );

//   const grid = getElement("cameraGrid");

//   const columns = Number(getElement("gridSize").value);

//   grid.className = `grid cols${columns}`;

//   getElement("subtitle").textContent =
//     `${cameraList.length} camera channel(s) · ` +
//     (selected === "all" ? "All vehicles" : "Selected vehicle");

//   if (!cameraList.length) {
//     const empty = document.createElement("div");
//     empty.className = "monitor-empty";

//     const heading = document.createElement("h3");
//     heading.textContent = "No cameras available";

//     const description = document.createElement("p");
//     description.textContent = "No authorized camera channels were found.";

//     empty.append(heading, description);
//     grid.appendChild(empty);

//     setStatus("No camera channels available");
//     return;
//   }

//   if (typeof Cmsv6Player !== "function") {
//     setStatus("cmsv6player.min.js is missing or failed to load", "error");
//     return;
//   }

//   const activeCameras = cameraList.slice(0, MAX_ACTIVE_CAMERAS);

//   activeCameras.forEach((camera, index) => {
//     startCamera(camera, index, generation);
//   });

//   updateMonitorCount(activeCameras.length);

//   const requested = players.length;

//   setStatus(
//     `Requested ${requested} of ${cameraList.length} camera streams`,
//     requested ? "success" : "error",
//   );

//   // "Requested" means playback was initiated,
//   // not that video frames have been received.
// }

// // ======================================================
// // LOAD VEHICLES
// // ======================================================

// async function loadVehicles() {
//   setStatus("Loading authorized vehicles...");

//   const data = await post("/api/vehicles", {
//     jsession,
//   });

//   if (!Array.isArray(data.vehicles)) {
//     throw new Error("Invalid vehicle list returned by API");
//   }

//   vehicles = data.vehicles;
//   selected = "all";

//   updateFleet();
//   play();
// }

// // ======================================================
// // LOGIN
// // ======================================================

// getElement("loginForm").addEventListener("submit", async (event) => {
//   event.preventDefault();

//   const loginButton = getElement("loginBtn");
//   loginButton.disabled = true;

//   setStatus("Authenticating...");

//   try {
//     const account = getElement("account").value.trim();
//     const password = getElement("password").value;

//     const result = await post("/api/login", {
//       account,
//       password,
//     });

//     if (!result.jsession) {
//       throw new Error("Login succeeded without a valid jsession");
//     }

//     stop();

//     jsession = result.jsession;
//     vehicles = [];
//     selected = "all";

//     getElement("password").value = "";

//     getElement("accountTag").textContent =
//       "● " + (result.account_name || "Connected");

//     await loadVehicles();
//   } catch (error) {
//     console.error("Login/load error:", error);

//     setStatus(error.message || "Login failed", "error");
//   } finally {
//     loginButton.disabled = false;
//   }
// });

// // ======================================================
// // ALL CAMERAS BUTTON
// // ======================================================

// getElement("allBtn").addEventListener("click", () => {
//   selected = "all";
//   updateFleet();
//   play();
// });

// // ======================================================
// // PLAY BUTTON
// // ======================================================

// getElement("playBtn").addEventListener("click", () => {
//   if (!jsession) {
//     setStatus("Please sign in first", "error");
//     return;
//   }

//   play();
// });

// // ======================================================
// // REFRESH VEHICLES
// // ======================================================

// getElement("refreshBtn").addEventListener("click", async () => {
//   try {
//     await loadVehicles();
//   } catch (error) {
//     console.error("Refresh error:", error);
//     setStatus(error.message, "error");
//   }
// });

// // ======================================================
// // CHANGE STREAM QUALITY
// // ======================================================

// getElement("streamType").addEventListener("change", () => {
//   if (jsession) {
//     play();
//   }
// });

// // ======================================================
// // CHANGE GRID COLUMNS
// // ======================================================

// getElement("gridSize").addEventListener("change", () => {
//   const columns = Number(getElement("gridSize").value);
//   videoWidth = videoWidth / columns;
//   videoHeight = videoHeight / columns;
//   getElement("cameraGrid").className = `grid cols${columns}`;
// });

// // ======================================================
// // LOGOUT
// // ======================================================

// getElement("logoutBtn").addEventListener("click", () => {
//   stop();

//   jsession = "";
//   vehicles = [];
//   selected = "all";
//   cameraList = [];

//   getElement("accountTag").textContent = "● Not connected";

//   getElement("subtitle").textContent = "Sign in to view cameras";

//   updateFleet();

//   setStatus("Disconnected");
// });

// // ======================================================
// // FULLSCREEN
// // ======================================================

// const fullscreenBtn = getElement("fullscreenBtn");
// const monitorPanel = getElement("monitorPanel");

// if (fullscreenBtn && monitorPanel) {
//   fullscreenBtn.addEventListener("click", async () => {
//     try {
//       if (document.fullscreenElement) {
//         await document.exitFullscreen();
//       } else {
//         await monitorPanel.requestFullscreen();
//       }
//     } catch (error) {
//       console.error("Fullscreen failed:", error);

//       setStatus("Unable to enter fullscreen", "error");
//     }
//   });

//   document.addEventListener("fullscreenchange", () => {
//     fullscreenBtn.textContent = document.fullscreenElement
//       ? "⛶ Exit fullscreen"
//       : "⛶ Fullscreen";
//   });
// }

// // ======================================================
// // INITIAL STATE
// // ======================================================

// updateFleet();

// console.log("[CMSV6] Camera dashboard initialized");






"use strict";

// ======================================================
// CMSV6 CAMERA DASHBOARD
// One CMSV6 player instance per camera
// ======================================================

// ======================================================
// DOM HELPER
// ======================================================

function getElement(id) {
  return document.getElementById(id);
}

// ======================================================
// APPLICATION STATE
// ======================================================

let jsession = "";
let vehicles = [];
let selected = "all";
let cameraList = [];
let players = [];
let playbackGeneration = 0;

// ======================================================
// VIDEO SIZE
// ======================================================

// Fallback size used before the grid can be measured.
const BASE_VIDEO_WIDTH = 1000;
const BASE_VIDEO_HEIGHT = 562;

// Current CMSV6 player dimensions.
let videoWidth = BASE_VIDEO_WIDTH;
let videoHeight = BASE_VIDEO_HEIGHT;

// Gap must match your CSS .grid gap.
const GRID_GAP = 12;

// Minimum size so CMSV6 never receives tiny dimensions.
const MIN_VIDEO_WIDTH = 240;
const MIN_VIDEO_HEIGHT = 135;

// ======================================================
// CMSV6 MEDIA PROXY
// ======================================================

const mediaHost = "127.0.0.1";
const mediaPort = 3000;

// Maximum simultaneous camera streams.
//
// Increase only after testing CPU / memory / network usage.
const MAX_ACTIVE_CAMERAS = 16;

// ======================================================
// STATUS
// ======================================================

function setStatus(message, type = "") {
  const element = getElement("status");

  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `status ${type}`;
}

function updateMonitorCount(count) {
  const element = getElement("monitorCount");

  if (!element) {
    return;
  }

  element.textContent = `${count} camera channel(s)`;
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
    throw new Error(
      `Invalid API response (HTTP ${response.status})`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        `HTTP ${response.status}`,
    );
  }

  return data;
}

// ======================================================
// EXTRACT CAMERAS
// ======================================================

function extractCameras() {
  return vehicles.flatMap((vehicle) => {
    const devices = Array.isArray(vehicle.devices)
      ? vehicle.devices
      : [];

    return devices.flatMap((device) => {
      const channelCount = Math.min(
        64,
        Math.max(
          0,
          Number(device.channelCount) || 0,
        ),
      );

      const channelNames = String(
        device.channelNames || "",
      ).split(",");

      return Array.from(
        {
          length: channelCount,
        },

        (_, channel) => {
          return {
            vehicleId: vehicle.id,

            vehicle:
              vehicle.name ||
              "Unknown Vehicle",

            // IMPORTANT:
            // CMSV6 needs DevIDNO, not numeric DID.
            devIdno: device.devIdno,

            did: device.did,

            channel,

            label:
              channelNames[channel]?.trim() ||
              `CH${channel + 1}`,
          };
        },
      ).filter((camera) => camera.devIdno);
    });
  });
}

// ======================================================
// UPDATE VEHICLE SIDEBAR
// ======================================================

function updateFleet() {
  const allCameras = extractCameras();

  // ----------------------------------------------------
  // Statistics
  // ----------------------------------------------------

  const vehicleCount =
    getElement("vehicleCount");

  const deviceCount =
    getElement("deviceCount");

  const cameraCount =
    getElement("cameraCount");

  if (vehicleCount) {
    vehicleCount.textContent =
      vehicles.length;
  }

  if (deviceCount) {
    deviceCount.textContent =
      vehicles.reduce(
        (total, vehicle) => {
          return (
            total +
            (vehicle.devices?.length || 0)
          );
        },
        0,
      );
  }

  if (cameraCount) {
    cameraCount.textContent =
      allCameras.length;
  }

  // ----------------------------------------------------
  // Vehicle list
  // ----------------------------------------------------

  const vehicleContainer =
    getElement("vehicles");

  if (!vehicleContainer) {
    return;
  }

  vehicleContainer.replaceChildren();

  if (!vehicles.length) {
    const empty =
      document.createElement("span");

    empty.className = "muted";

    empty.textContent =
      "No authorized vehicles returned.";

    vehicleContainer.appendChild(empty);
  }

  vehicles.forEach((vehicle) => {
    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "vehicle" +
      (String(selected) ===
      String(vehicle.id)
        ? " active"
        : "");

    const vehicleName =
      document.createElement("span");

    vehicleName.textContent =
      vehicle.name ||
      `Vehicle ${vehicle.id}`;

    const small =
      document.createElement("small");

    const count = allCameras.filter(
      (camera) =>
        String(camera.vehicleId) ===
        String(vehicle.id),
    ).length;

    small.textContent =
      `${vehicle.devices?.length || 0} device(s)` +
      ` · ${count} camera(s)`;

    button.append(
      vehicleName,
      small,
    );

    button.addEventListener(
      "click",
      () => {
        selected = vehicle.id;

        updateFleet();

        play();
      },
    );

    vehicleContainer.appendChild(
      button,
    );
  });

  // ----------------------------------------------------
  // Buttons
  // ----------------------------------------------------

  const allButton =
    getElement("allBtn");

  const refreshButton =
    getElement("refreshBtn");

  const playButton =
    getElement("playBtn");

  const logoutButton =
    getElement("logoutBtn");

  if (allButton) {
    allButton.disabled =
      !vehicles.length;
  }

  if (refreshButton) {
    refreshButton.disabled =
      !jsession;
  }

  if (playButton) {
    playButton.disabled =
      !allCameras.length;
  }

  if (logoutButton) {
    logoutButton.disabled =
      !jsession;
  }
}

// ======================================================
// CALCULATE VIDEO SIZE
// ======================================================

function calculateVideoSize(columns) {
  const grid =
    getElement("cameraGrid");

  if (!grid) {
    return {
      width: BASE_VIDEO_WIDTH,
      height: BASE_VIDEO_HEIGHT,
    };
  }

  // Actual available grid width.
  let gridWidth =
    grid.clientWidth;

  // Fallback if browser has not calculated layout yet.
  if (!gridWidth) {
    gridWidth =
      grid.parentElement?.clientWidth ||
      BASE_VIDEO_WIDTH;
  }

  // Total gaps between columns.
  const totalGap =
    GRID_GAP * (columns - 1);

  // Width available for each camera card.
  const availableWidth =
    (gridWidth - totalGap) /
    columns;

  let calculatedWidth =
    Math.floor(availableWidth);

  // Maintain 16:9 aspect ratio.
  let calculatedHeight =
    Math.floor(
      calculatedWidth * (9 / 16),
    );

  // Never send extremely small dimensions
  // to Cmsv6Player.
  calculatedWidth = Math.max(
    MIN_VIDEO_WIDTH,
    calculatedWidth,
  );

  calculatedHeight = Math.max(
    MIN_VIDEO_HEIGHT,
    calculatedHeight,
  );

  return {
    width: calculatedWidth,
    height: calculatedHeight,
  };
}

// ======================================================
// DESTROY EXISTING PLAYERS
// ======================================================

function stop() {
  // Invalidate callbacks belonging to previous players.
  playbackGeneration++;

  players.forEach(
    ({ instance, index }) => {
      try {
        instance.stopVideo?.(0);
      } catch (error) {
        console.warn(
          `Camera ${index + 1} stop error:`,
          error,
        );
      }

      try {
        instance.destroy?.();
      } catch (error) {
        console.warn(
          `Camera ${index + 1} destroy error:`,
          error,
        );
      }
    },
  );

  players = [];

  const grid =
    getElement("cameraGrid");

  if (grid) {
    grid.replaceChildren();
  }

  updateMonitorCount(0);
}

// ======================================================
// CREATE CAMERA CARD
// ======================================================

function createCameraCard(
  camera,
  index,
) {
  const card =
    document.createElement("article");

  card.className = "camera";

  card.id =
    `camera-card-${index}`;

  // ----------------------------------------------------
  // HEADER
  // ----------------------------------------------------

  const header =
    document.createElement("div");

  header.className =
    "camera-head";

  const title =
    document.createElement("strong");

  title.textContent =
    `${camera.vehicle} · ${camera.label}`;

  const indicator =
    document.createElement("span");

  indicator.className = "live";

  indicator.textContent =
    "CONNECTING";

  header.append(
    title,
    indicator,
  );

  // ----------------------------------------------------
  // VIDEO SCREEN
  // ----------------------------------------------------

  const screen =
    document.createElement("div");

  screen.className = "screen";

  // Give the screen the same dimensions
  // being passed to Cmsv6Player.
  screen.style.height =
    `${videoHeight}px`;

  const videoTarget =
    document.createElement("div");

  videoTarget.className =
    "player-target";

  videoTarget.id =
    `camera-player-${index}`;

  videoTarget.style.width =
    `${videoWidth}px`;

  videoTarget.style.height =
    `${videoHeight}px`;

  // Do not let target overflow the card width.
  videoTarget.style.maxWidth =
    "100%";

  screen.appendChild(
    videoTarget,
  );

  // ----------------------------------------------------
  // FOOTER
  // ----------------------------------------------------

  const footer =
    document.createElement("div");

  footer.className =
    "camera-foot";

  footer.textContent =
    `Device: ${camera.devIdno}` +
    ` · Channel: ${camera.channel + 1}` +
    ` · ${videoWidth}×${videoHeight}`;

  // ----------------------------------------------------
  // CARD
  // ----------------------------------------------------

  card.append(
    header,
    screen,
    footer,
  );

  return {
    card,
    videoTarget,
    indicator,
  };
}

// ======================================================
// START ONE CAMERA
// ======================================================

function startCamera(
  camera,
  index,
  generation,
) {
  const {
    card,
    videoTarget,
    indicator,
  } = createCameraCard(
    camera,
    index,
  );

  const grid =
    getElement("cameraGrid");

  grid.appendChild(card);

  try {
    console.log(
      `[CAMERA ${index + 1}] Starting`,
      {
        devIdno:
          camera.devIdno,

        channel:
          camera.channel,

        width:
          videoWidth,

        height:
          videoHeight,
      },
    );

    // --------------------------------------------------
    // ONE CMSV6 INSTANCE PER CAMERA
    // --------------------------------------------------

    const cameraPlayer =
      new Cmsv6Player({
        domId:
          videoTarget.id,

        isVodMode:
          false,

        width:
          videoWidth,

        height:
          videoHeight,

        lang:
          "en",
      });

    // --------------------------------------------------
    // EXACTLY ONE WINDOW
    // --------------------------------------------------

    cameraPlayer.setWindowNum(1);

    // --------------------------------------------------
    // MEDIA PROXY
    // --------------------------------------------------

    cameraPlayer.setServerInfo(
      mediaHost,
      mediaPort,
    );

    // --------------------------------------------------
    // EVENTS
    // --------------------------------------------------

    cameraPlayer.addEventListener(
      "onTtxVideoMsg",

      (...args) => {
        if (
          generation !==
          playbackGeneration
        ) {
          return;
        }

        console.log(
          `[CAMERA ${index + 1}]`,
          ...args,
        );
      },
    );

    // --------------------------------------------------
    // STREAM TYPE
    // --------------------------------------------------

    const streamType =
      Number(
        getElement(
          "streamType",
        ).value,
      );

    // --------------------------------------------------
    // START VIDEO
    // --------------------------------------------------

    cameraPlayer.startVideo(
      // Player window index.
      0,

      // CMSV6 session.
      jsession,

      // Device ID.
      String(
        camera.devIdno,
      ),

      // Actual device channel.
      camera.channel,

      // 0 = main stream
      // 1 = sub stream
      streamType,

      true,
    );

    // --------------------------------------------------
    // SAVE INSTANCE
    // --------------------------------------------------

    players.push({
      instance:
        cameraPlayer,

      index,

      camera,

      indicator,

      card,
    });
  } catch (error) {
    console.error(
      `Camera ${index + 1} initialization failed:`,
      error,
    );

    indicator.textContent =
      "ERROR";

    indicator.classList.add(
      "error",
    );

    const errorMessage =
      document.createElement("div");

    errorMessage.className =
      "camera-error";

    errorMessage.textContent =
      "Unable to initialize camera player";

    videoTarget.appendChild(
      errorMessage,
    );
  }
}

// ======================================================
// PLAY ALL FILTERED CAMERAS
// ======================================================

function play() {
  // ----------------------------------------------------
  // Stop previous streams
  // ----------------------------------------------------

  stop();

  // stop() increments playbackGeneration.
  const generation =
    playbackGeneration;

  // ----------------------------------------------------
  // Get cameras
  // ----------------------------------------------------

  cameraList =
    extractCameras().filter(
      (camera) => {
        return (
          selected === "all" ||
          String(
            camera.vehicleId,
          ) ===
            String(selected)
        );
      },
    );

  const grid =
    getElement("cameraGrid");

  if (!grid) {
    console.error(
      "cameraGrid element not found",
    );

    return;
  }

  // ----------------------------------------------------
  // GET SELECTED GRID SIZE
  // ----------------------------------------------------

  const columns =
    Number(
      getElement(
        "gridSize",
      ).value,
    ) || 2;

  // ----------------------------------------------------
  // SET GRID CLASS FIRST
  // ----------------------------------------------------

  grid.className =
    `grid cols${columns}`;

  // ----------------------------------------------------
  // CALCULATE PLAYER DIMENSIONS
  // ----------------------------------------------------

  const size =
    calculateVideoSize(
      columns,
    );

  videoWidth =
    size.width;

  videoHeight =
    size.height;

  console.log(
    "[CMSV6 GRID]",
    {
      columns,

      gridWidth:
        grid.clientWidth,

      videoWidth,

      videoHeight,

      cameras:
        cameraList.length,
    },
  );

  // ----------------------------------------------------
  // SUBTITLE
  // ----------------------------------------------------

  const subtitle =
    getElement("subtitle");

  if (subtitle) {
    subtitle.textContent =
      `${cameraList.length} camera channel(s)` +
      " · " +
      (selected === "all"
        ? "All vehicles"
        : "Selected vehicle");
  }

  // ----------------------------------------------------
  // NO CAMERAS
  // ----------------------------------------------------

  if (!cameraList.length) {
    const empty =
      document.createElement("div");

    empty.className =
      "monitor-empty";

    const heading =
      document.createElement("h3");

    heading.textContent =
      "No cameras available";

    const description =
      document.createElement("p");

    description.textContent =
      "No authorized camera channels were found.";

    empty.append(
      heading,
      description,
    );

    grid.appendChild(
      empty,
    );

    setStatus(
      "No camera channels available",
    );

    return;
  }

  // ----------------------------------------------------
  // CHECK CMSV6 SDK
  // ----------------------------------------------------

  if (
    typeof Cmsv6Player !==
    "function"
  ) {
    setStatus(
      "cmsv6player.min.js is missing or failed to load",
      "error",
    );

    return;
  }

  // ----------------------------------------------------
  // ACTIVE CAMERAS
  // ----------------------------------------------------

  const activeCameras =
    cameraList.slice(
      0,
      MAX_ACTIVE_CAMERAS,
    );

  // ----------------------------------------------------
  // START ALL CAMERAS
  // ----------------------------------------------------

  activeCameras.forEach(
    (camera, index) => {
      startCamera(
        camera,
        index,
        generation,
      );
    },
  );

  // ----------------------------------------------------
  // UPDATE MONITOR COUNT
  // ----------------------------------------------------

  updateMonitorCount(
    activeCameras.length,
  );

  // ----------------------------------------------------
  // STATUS
  // ----------------------------------------------------

  const requested =
    players.length;

  setStatus(
    `Requested ${requested} of ${cameraList.length} streams · ` +
      `${columns} column grid · ` +
      `${videoWidth}×${videoHeight}`,
    requested
      ? "success"
      : "error",
  );
}

// ======================================================
// LOAD VEHICLES
// ======================================================

async function loadVehicles() {
  setStatus(
    "Loading authorized vehicles...",
  );

  const data =
    await post(
      "/api/vehicles",
      {
        jsession,
      },
    );

  if (
    !Array.isArray(
      data.vehicles,
    )
  ) {
    throw new Error(
      "Invalid vehicle list returned by API",
    );
  }

  vehicles =
    data.vehicles;

  selected =
    "all";

  updateFleet();

  // Wait for browser layout before
  // measuring cameraGrid width.
  requestAnimationFrame(() => {
    play();
  });
}

// ======================================================
// LOGIN
// ======================================================

const loginForm =
  getElement("loginForm");

if (loginForm) {
  loginForm.addEventListener(
    "submit",

    async (event) => {
      event.preventDefault();

      const loginButton =
        getElement("loginBtn");

      loginButton.disabled =
        true;

      setStatus(
        "Authenticating...",
      );

      try {
        const account =
          getElement(
            "account",
          ).value.trim();

        const password =
          getElement(
            "password",
          ).value;

        const result =
          await post(
            "/api/login",
            {
              account,
              password,
            },
          );

        if (!result.jsession) {
          throw new Error(
            "Login succeeded without a valid jsession",
          );
        }

        stop();

        jsession =
          result.jsession;

        vehicles =
          [];

        selected =
          "all";

        getElement(
          "password",
        ).value = "";

        getElement(
          "accountTag",
        ).textContent =
          "● " +
          (result.account_name ||
            "Connected");

        await loadVehicles();
      } catch (error) {
        console.error(
          "Login/load error:",
          error,
        );

        setStatus(
          error.message ||
            "Login failed",
          "error",
        );
      } finally {
        loginButton.disabled =
          false;
      }
    },
  );
}

// ======================================================
// ALL CAMERAS
// ======================================================

const allButton =
  getElement("allBtn");

if (allButton) {
  allButton.addEventListener(
    "click",
    () => {
      selected = "all";

      updateFleet();

      requestAnimationFrame(
        () => {
          play();
        },
      );
    },
  );
}

// ======================================================
// PLAY BUTTON
// ======================================================

const playButton =
  getElement("playBtn");

if (playButton) {
  playButton.addEventListener(
    "click",
    () => {
      if (!jsession) {
        setStatus(
          "Please sign in first",
          "error",
        );

        return;
      }

      play();
    },
  );
}

// ======================================================
// REFRESH VEHICLES
// ======================================================

const refreshButton =
  getElement("refreshBtn");

if (refreshButton) {
  refreshButton.addEventListener(
    "click",

    async () => {
      try {
        await loadVehicles();
      } catch (error) {
        console.error(
          "Refresh error:",
          error,
        );

        setStatus(
          error.message,
          "error",
        );
      }
    },
  );
}

// ======================================================
// CHANGE STREAM QUALITY
// ======================================================

const streamTypeSelect =
  getElement("streamType");

if (streamTypeSelect) {
  streamTypeSelect.addEventListener(
    "change",
    () => {
      if (!jsession) {
        return;
      }

      // Stream quality changed.
      // Recreate every player.
      play();
    },
  );
}

// ======================================================
// CHANGE GRID
// ======================================================

const gridSizeSelect =
  getElement("gridSize");

if (gridSizeSelect) {
  gridSizeSelect.addEventListener(
    "change",
    () => {
      const columns =
        Number(
          gridSizeSelect.value,
        ) || 2;

      console.log(
        `[CMSV6 GRID] Changing to ${columns} column(s)`,
      );

      const grid =
        getElement(
          "cameraGrid",
        );

      if (!grid) {
        return;
      }

      // Set CSS grid immediately.
      grid.className =
        `grid cols${columns}`;

      if (!jsession) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * Cmsv6Player gets width/height during creation.
       *
       * Therefore changing only CSS is not enough.
       *
       * We destroy existing players and recreate
       * every camera using the new calculated size.
       */

      requestAnimationFrame(
        () => {
          play();
        },
      );
    },
  );
}

// ======================================================
// WINDOW RESIZE
// ======================================================

let resizeTimer = null;

window.addEventListener(
  "resize",
  () => {
    if (!jsession) {
      return;
    }

    clearTimeout(
      resizeTimer,
    );

    resizeTimer =
      setTimeout(() => {
        console.log(
          "[CMSV6] Window resized - recalculating players",
        );

        play();
      }, 500);
  },
);

// ======================================================
// LOGOUT
// ======================================================

const logoutButton =
  getElement("logoutBtn");

if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    () => {
      stop();

      jsession = "";
      vehicles = [];
      selected = "all";
      cameraList = [];

      const accountTag =
        getElement(
          "accountTag",
        );

      if (accountTag) {
        accountTag.textContent =
          "● Not connected";
      }

      const subtitle =
        getElement(
          "subtitle",
        );

      if (subtitle) {
        subtitle.textContent =
          "Sign in to view cameras";
      }

      updateFleet();

      setStatus(
        "Disconnected",
      );
    },
  );
}

// ======================================================
// MONITOR FULLSCREEN
// ======================================================

const fullscreenButton =
  getElement(
    "fullscreenBtn",
  );

const monitorPanel =
  getElement(
    "monitorPanel",
  );

if (
  fullscreenButton &&
  monitorPanel
) {
  fullscreenButton.addEventListener(
    "click",

    async () => {
      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
        } else {
          await monitorPanel.requestFullscreen();
        }
      } catch (error) {
        console.error(
          "Fullscreen failed:",
          error,
        );

        setStatus(
          "Unable to enter fullscreen",
          "error",
        );
      }
    },
  );

  document.addEventListener(
    "fullscreenchange",
    () => {
      fullscreenButton.textContent =
        document.fullscreenElement
          ? "⛶ Exit fullscreen"
          : "⛶ Fullscreen";

      /*
       * Fullscreen changes available width.
       *
       * Wait until browser completes fullscreen
       * layout, then recreate the CMSV6 players.
       */

      if (jsession) {
        setTimeout(
          () => {
            play();
          },
          300,
        );
      }
    },
  );
}

// ======================================================
// INITIAL STATE
// ======================================================

updateFleet();

console.log(
  "[CMSV6] Camera dashboard initialized",
);