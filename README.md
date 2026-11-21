# Multiplayer

Run many HLS / DASH players side by side on one page: hls.js, Shaka, dash.js and native `<video>`, each at any version you pick.

## Run

Serve the folder over HTTP (opening the file directly via `file://` breaks the Play/Pause/Mute/Sync buttons):

```sh
python3 -m http.server 8765
# open http://localhost:8765
```

No build and no dependencies. Player libraries load from jsdelivr on demand.

## Use

- Paste a manifest URL, pick a player (or **Auto**: `.m3u8` → hls.js, `.mpd` → Shaka, anything else → native) and optionally a version, then press **Add**.
- Columns adjust automatically to the number of tiles (1, 2×2, 3×3, …).
- Hover a tile to reload or remove it.
- **Play all / Pause all / Mute all** act on every tile.
- **Sync** aligns the tiles:
  - Live tiles of the same content (even across HLS / DASH and different players) align on the wall-clock time of the playhead, matched to the tile furthest behind. HLS needs `EXT-X-PROGRAM-DATE-TIME`.
  - VOD tiles align on `currentTime` to the first VOD tile.
- The page URL holds the whole layout, so it can be shared or bookmarked:
  `#s=hlsjs@1.7.4|https://…/master.m3u8&s=shaka@4.12.0|https://…/manifest.mpd`

Each tile runs in its own iframe (`player.html`), so different versions of the same library and Shaka's polyfills never interfere with each other. Inside a tile, the player instance is available as `window.player` for console debugging (pick the tile's frame in the devtools console).

## Add a player

Add one entry to `players.js`:

```js
myplayer: {
  label: 'My Player',          // shown in the UI
  npm: 'my-player',            // npm package served from jsdelivr (omit for no library)
  version: '1.0.0',            // default version; any npm version/tag can be picked in the UI
  global: 'MyPlayer',          // window global the build defines
  file: v => 'dist/my-player.min.js',   // browser build path, may depend on version
  match: /\.m3u8(\?|$)/i,      // optional, used by Auto
  attach({ lib, version, video, url, onError }) {
    const p = new lib.Player(video);
    p.load(url);
    return p;                  // exposed as window.player in the tile
  },
  date: p => p.getPlayheadDate(), // optional: wall-clock Date of the playhead, used by Sync for live
},
```

## Limitations

- No per-tile config yet (DRM license servers, license keys, ABR settings).
- Players that don't come from npm (e.g. Akamai AMP's hosted script, Redge's SDK) need a custom script URL, which the registry doesn't support yet.
- Sync is a one-time alignment; there is no continuous drift correction.
