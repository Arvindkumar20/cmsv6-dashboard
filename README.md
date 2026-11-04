# CMSV6 Camera Dashboard

## Start

```bash
npm install
npm start
```

Open http://localhost:3000 and log in with your CMSV6 credentials.

## SDK and media proxy

Copy your licensed `cmsv6player.min.js` to `public/cmsv6player.min.js`.

**Important:** The bundled UI expects the CMSV6 player to render its windows within the `cameraGrid` element. The SDK may replace the generated card DOM when initialized. Depending on your SDK version, custom per-camera card headers may not survive. For reliable playback, use the SDK's own grid/window layout, or implement a separate player instance per card if supported.

`setServerInfo('127.0.0.1', 3000)` must target your *working CMSV6 media proxy*. This example Express server also defaults to port 3000; **you cannot run both servers on the same port**. If your media proxy already uses 3000, start this dashboard on another port (`PORT=3100 npm start`). Change `mediaHost` and `mediaPort` in `public/app.js` to match the proxy. The browser must be able to reach that host. For remote deployment, localhost means the viewer's own computer.

The login and vehicle API requests are made by the Express backend to avoid browser CORS issues. This is a development example, not a hardened production authentication implementation. It forwards the session from the browser for vehicle discovery; protect endpoints, use HTTPS, enforce rate limiting, and store CMS credentials/sessions securely on the server for production.

The numeric `vehicles[].dl[].did` is not the string `DevIDNO`: playback uses `vehicles[].dl[].id` as the device number and `dl[].cc` for the number of channels. Channels are zero-indexed.

Do not patch `MediaSource.prototype.addSourceBuffer` globally to force timestamps. Such changes can desynchronize playback; fix timestamp issues in the source/media pipeline or the SDK integration.
