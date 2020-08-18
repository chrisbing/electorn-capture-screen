/**
 * Created by xujian1 on 2018/10/8.
 */

const { getCurrentScreen } = require("./utils");

const curScreen = getCurrentScreen();

function getScreen(callback) {
  this.callback = callback;

  document.body.style.opacity = "0";
  let oldCursor = document.body.style.cursor;
  document.body.style.cursor = "none";

  this.handleStream = (stream) => {
    document.body.style.cursor = oldCursor;
    document.body.style.opacity = "1";
    // Create hidden video tag
    let video = document.createElement("video");
    video.style.cssText = "position:absolute;top:-10000px;left:-10000px;";
    // Event connected to stream

    let loaded = false;
    video.onloadedmetadata = () => {
      if (loaded) {
        return;
      }
      loaded = true;
      // Set video ORIGINAL height (screenshot)
      video.style.height = video.videoHeight + "px"; // videoHeight
      video.style.width = video.videoWidth + "px"; // videoWidth

      // Create canvas
      let canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      let ctx = canvas.getContext("2d");
      // Draw video on canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (this.callback) {
        // Save screenshot to png - base64
        this.callback(canvas.toDataURL("image/png"));
      } else {
        // console.log('Need callback!')
      }

      // Remove hidden video tag
      video.remove();
      try {
        stream.getTracks()[0].stop();
      } catch (e) {
        // nothing
      }
    };
    video.srcObject = stream;
    document.body.appendChild(video);
  };

  this.handleError = (e) => {
    // console.log(e)
  };

  if (require("os").platform() === "win32") {
    require("electron").desktopCapturer.getSources(
      {
        types: ["screen"],
        thumbnailSize: { width: 1, height: 1 },
      },
      (e, sources) => {
        let selectSource = sources.filter(
          (source) => source.display_id + "" === curScreen.id + ""
        )[0];
        navigator.getUserMedia(
          {
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: selectSource.id + "",
                minWidth: 1280,
                minHeight: 720,
                maxWidth: 8000,
                maxHeight: 8000,
              },
            },
          },
          (e) => {
            this.handleStream(e);
          },
          this.handleError
        );
      }
    );
  } else {
    navigator.getUserMedia(
      {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: `screen:${curScreen.id}`,
            minWidth: 1280,
            minHeight: 720,
            maxWidth: 8000,
            maxHeight: 8000,
          },
        },
      },
      (e) => {
        this.handleStream(e);
      },
      this.handleError
    );
  }
}

exports.getScreenSources = ({ types = ["screen"] } = {}, callback) => {
  getScreen(callback);
};
