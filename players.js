// Player registry. To add a player, add one entry:
//   label    shown in the UI
//   npm      npm package name (served from jsdelivr); omit for no library
//   version  default version (any npm version/tag can be picked in the UI)
//   file(v)  path of the browser build inside the package, may depend on version
//   global   window global the build defines
//   match    optional regex for "Auto" detection
//   attach({ lib, version, video, url, onError }) -> player instance (may be async)
//   date(instance, video) optional -> wall-clock Date of the playhead (live streams), used by Sync
// Each tile runs in its own iframe (player.html), so versions and polyfills never clash.
// The returned instance is exposed as `window.player` inside the tile for console debugging.
window.PLAYERS = {
  hlsjs: {
    label: 'hls.js', npm: 'hls.js', version: '1.7.4', global: 'Hls',
    file: () => 'dist/hls.min.js',
    match: /\.m3u8(\?|$)/i,
    attach({ lib: Hls, video, url, onError }) {
      if (!Hls.isSupported()) throw new Error('MSE not supported');
      const hls = new Hls();
      hls.on(Hls.Events.ERROR, (_, d) => d.fatal && onError(`${d.type} / ${d.details}`));
      hls.loadSource(url);
      hls.attachMedia(video);
      return hls;
    },
    date: hls => hls.playingDate, // needs EXT-X-PROGRAM-DATE-TIME
  },

  shaka: {
    label: 'Shaka', npm: 'shaka-player', version: '5.3.6', global: 'shaka',
    file: () => 'dist/shaka-player.compiled.js',
    match: /\.mpd(\?|$)/i,
    async attach({ lib: shaka, video, url, onError }) {
      shaka.polyfill.installAll();
      const p = new shaka.Player();
      p.addEventListener('error', e => onError(`code ${e.detail.code}`));
      await p.attach(video);
      p.load(url).catch(e => onError(`code ${e.code}`));
      return p;
    },
    date: p => p.isLive() ? p.getPlayheadTimeAsDate() : null,
  },

  dashjs: {
    label: 'dash.js', npm: 'dashjs', version: '5.3.0', global: 'dashjs',
    file: v => parseInt(v) >= 5 ? 'dist/modern/umd/dash.all.min.js' : 'dist/dash.all.min.js',
    attach({ lib: dashjs, video, url, onError }) {
      const p = dashjs.MediaPlayer().create();
      p.on(dashjs.MediaPlayer.events.ERROR, e => onError(e.error?.message ?? `code ${e.error?.code}`));
      p.initialize(video, url, true);
      return p;
    },
    date: p => p.isDynamic() ? new Date(p.timeAsUTC() * 1000) : null,
  },

  native: {
    label: 'Native',
    attach({ video, url, onError }) {
      video.onerror = () => onError(video.error?.message || `media error ${video.error?.code}`);
      video.src = url;
      return video;
    },
    date: (_, v) => { const d = v.getStartDate?.(); return d && !isNaN(d) ? new Date(+d + v.currentTime * 1000) : null; }, // Safari
  },
};
