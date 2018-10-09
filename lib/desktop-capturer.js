/**
 * Created by xujian1 on 2018/10/8.
 */


const { desktopCapturer } = require('electron')
const { getCurrentScreen } = require('./utils')

const curScreen = getCurrentScreen()

function getScreen(callback) {
    this.callback = callback

    document.body.style.opacity = '0'
    let oldCursor = document.body.style.cursor
    document.body.style.cursor = 'none'

    this.handleStream = (stream) => {

        // Create hidden video tag
        let video = document.createElement('video')
        video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;'
        // Event connected to stream
        video.onloadedmetadata = () => {
            // Set video ORIGINAL height (screenshot)
            video.style.height = video.videoHeight + 'px' // videoHeight
            video.style.width = video.videoWidth + 'px' // videoWidth

            // Create canvas
            let canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            let ctx = canvas.getContext('2d')
            // Draw video on canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            if (this.callback) {
                // Save screenshot to png - base64
                this.callback(canvas.toDataURL('image/png'))
            } else {
                // console.log('Need callback!')
            }

            // Remove hidden video tag
            video.remove()
            try {
                stream.getTracks()[0].stop()
            } catch (e) {
                // nothing
            }
        }
        video.srcObject = stream
        document.body.appendChild(video)
    }

    this.handleError = (e) => {
        // console.log(e)
    }

    desktopCapturer.getSources({ types: ['screen'] }, (error, sources) => {
        if (error) throw error
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
                        },
                    },
                }, (e) => {
                    document.body.style.cursor = oldCursor
                    document.body.style.opacity = '1'
                    this.handleStream(e)
                }, this.handleError)
                return
            }
        }
    })
}

exports.getScreenSources = ({ types = ['screen'] } = {}, callback) => {
    getScreen(callback)
}
