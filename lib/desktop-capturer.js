/**
 * Created by xujian1 on 2018/10/8.
 */

const { desktopCapturer } = require("electron");
const { getCurrentScreen } = require("./utils");

const curScreen = getCurrentScreen();

async function getScreenSources() {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1, height: 1 },
  });

  const selectSource = sources.filter(
    (source) => source.display_id + "" === curScreen.id + ""
  )[0];

  const media = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: selectSource.id,
        minWidth: curScreen.bounds.width,
        minHeight: curScreen.bounds.height,
        maxWidth: curScreen.bounds.width * curScreen.scaleFactor,
        maxHeight: curScreen.bounds.height * curScreen.scaleFactor,
      },
    },
  });

  return media;
}

exports.getScreenSources = getScreenSources;
