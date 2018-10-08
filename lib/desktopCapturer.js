/**
 * Created by xujian1 on 2018/10/8.
 */


const { desktopCapturer, screen, remote } = require('electron')
const { getCurrentScreen, isCursorInCurrentWindow } = require('./utils')

const currentWindow = remote.getCurrentWindow()
const curScreen = getCurrentScreen()

function getScreen(callback) {
    var _this = this;
    this.callback = callback;

    document.body.style.opacity = '0'
    if (isCursorInCurrentWindow()) {
        console.log('focus')
    }
    let oldCursor = document.body.style.cursor
    document.body.style.cursor = 'none'

    this.handleStream = (stream) => {

        // console.log('stream',stream);
        // Create hidden video tag
        var video = document.createElement('video');
        video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';
        // Event connected to stream
        video.onloadedmetadata = function () {
            // Set video ORIGINAL height (screenshot)
            video.style.height = this.videoHeight + 'px'; // videoHeight
            video.style.width = this.videoWidth + 'px'; // videoWidth

            // Create canvas
            var canvas = document.createElement('canvas');
            canvas.width = this.videoWidth;
            canvas.height = this.videoHeight;
            var ctx = canvas.getContext('2d');
            // Draw video on canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            if (_this.callback) {
                // Save screenshot to jpg - base64
                _this.callback(canvas.toDataURL('image/png'))
            } else {
                console.log('Need callback!');
            }

            // Remove hidden video tag
            video.remove();
            try {
                // Destroy connect to stream
                stream.getTracks()[0].stop()
            } catch (e) {
            }
        }
        video.srcObject = stream
        document.body.appendChild(video)
    };

    this.handleError = function (e) {
        console.log(e);
    };

    desktopCapturer.getSources({ types: [/*'window',*/ 'screen'] }, (error, sources) => {
        if (error) throw error;
        for (let i = 0; i < sources.length; ++i) {
            if (`screen:${curScreen.id}` === sources[i].id) {
                navigator.webkitGetUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: sources[i].id,
                            minWidth: 1280,
                            minHeight: 720,
                            maxWidth: 8000,
                            maxHeight: 8000,
                        }
                    }
                }, (e) => {
                    document.body.style.cursor = oldCursor
                    document.body.style.opacity = '1'
                    this.handleStream(e)
                }, this.handleError)
                return
            }
        }
    });
}

exports.getScreenSources = ({ types = ['screen'] } = {}, callback) => {
    getScreen(callback)
}