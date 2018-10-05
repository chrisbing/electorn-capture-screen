/**
 * Created by xujian1 on 2018/10/4.
 */

const { ipcRenderer, clipboard, nativeImage, remote, desktopCapturer, screen } = require('electron')
const Event = require('events')
const fs = require('fs')

const { bounds: { width, height }, scaleFactor } = screen.getPrimaryDisplay()

const $canvas = document.getElementById('js-canvas')
const $bg = document.getElementById('js-bg')
const $sizeInfo = document.getElementById('js-size-info')
const $toolbar = document.getElementById('js-toolbar')

const $btnClose = document.getElementById('js-tool-close')
const $btnOk = document.getElementById('js-tool-ok')
const $btnSave = document.getElementById('js-tool-save')
const $btnReset = document.getElementById('js-tool-reset')

const audio = new Audio()
audio.src = './assets/audio/capture.mp3'

const ANCHORS = [
    { row: 'x', col: 'y', cursor: 'nwse-resize' },
    { row: '', col: 'y', cursor: 'ns-resize' },
    { row: 'r', col: 'y', cursor: 'nesw-resize' },

    { row: 'x', col: '', cursor: 'ew-resize' },
    { row: 'r', col: '', cursor: 'ew-resize' },

    { row: 'x', col: 'b', cursor: 'nesw-resize' },
    { row: '', col: 'b', cursor: 'ns-resize' },
    { row: 'r', col: 'b', cursor: 'nwse-resize' },

]

console.time('capture')
desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
        width: width * scaleFactor,
        height: height * scaleFactor,
    }
}, (error, sources) => {
    console.timeEnd('capture')
    let imgSrc = sources[0].thumbnail.toDataURL()

    let capture = new CaptureRenderer($canvas, $bg, imgSrc, scaleFactor)

    let onDrag = (selectRect) => {
        $toolbar.style.display = 'none'
        $sizeInfo.style.display = 'block'
        $sizeInfo.innerText = `${selectRect.w} * ${selectRect.h}`
        if (selectRect.y > 35) {
            $sizeInfo.style.top = `${selectRect.y - 30}px`
        } else {
            $sizeInfo.style.top = `${selectRect.y + 10}px`
        }
        $sizeInfo.style.left = `${selectRect.x}px`
    }
    capture.on('start-dragging', onDrag)
    capture.on('dragging', onDrag)

    let onDragEnd = () => {
        if (capture.selectRect) {
            const { x, r, b, y } = capture.selectRect
            $toolbar.style.display = 'flex'
            $toolbar.style.top = `${b + 15}px`
            $toolbar.style.right = `${window.screen.width - r}px`
        }
    }
    capture.on('end-dragging', onDragEnd)

    capture.on('reset', () => {
        $toolbar.style.display = 'none'
        $sizeInfo.style.display = 'none'
    })

    $btnClose.addEventListener('click', () => {
        ipcRenderer.send('capture-screen', {
            type: 'close',
        })
        window.close()
    })

    $btnReset.addEventListener('click', () => {
        capture.reset()
    })

    let selectCapture = () => {
        if (!capture.selectRect) {
            return
        }
        let url = capture.getImageUrl()
        remote.getCurrentWindow().hide()

        audio.play()
        audio.onended = () => {
            window.close()
        }
        clipboard.writeImage(nativeImage.createFromDataURL(url))
        ipcRenderer.send('capture-screen', {
            type: 'complete',
            url,
        })

    };
    $btnOk.addEventListener('click', selectCapture)

    $btnSave.addEventListener('click', () => {
        let url = capture.getImageUrl()

        remote.getCurrentWindow().hide()
        remote.dialog.showSaveDialog({
            filters: [{
                name: 'Images',
                extensions: ['png', 'jpg', 'gif']
            }]
        }, function (path) {
            if (path) {
                fs.writeFile(path, new Buffer(url.replace('data:image/png;base64,', ''), 'base64'), function () {
                    ipcRenderer.send('capture-screen', {
                        type: 'complete',
                        url,
                        path,
                    })
                    window.close()
                })
            } else {
                ipcRenderer.send('capture-screen', {
                    type: 'cancel',
                    url,
                })
                window.close()
            }
        })
    })

    window.addEventListener('keypress', (e) => {
        if (e.code === 'Enter') {
            selectCapture()
        }
    })
})

const CREATE_RECT = 1
const MOVING_RECT = 2
const RESIZE = 3

class CaptureRenderer extends Event {

    constructor($canvas, $bg, imageSrc, scaleFactor) {
        super()
        this.$canvas = $canvas
        this.imageSrc = imageSrc
        this.scaleFactor = scaleFactor
        this.$bg = $bg
        this.ctx = $canvas.getContext('2d')

        this.onMouseDown = this.onMouseDown.bind(this)
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)

        this.init().then(() => {
            console.log('init')
        })
    }

    async init() {
        this.$bg.style.backgroundImage = `url(${this.imageSrc})`
        this.$bg.style.backgroundSize = `${width}px ${height}px`
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let img = await new Promise(resolve => {
            let img = new Image()
            img.src = this.imageSrc
            if (img.complete) {
                resolve(img)
            } else {
                img.onload = () => resolve(img)
            }
        })

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        this.bgCtx = ctx

        document.addEventListener('mousedown', this.onMouseDown)
        document.addEventListener('mousemove', this.onMouseMove)
        document.addEventListener('mouseup', this.onMouseUp)
    }

    onMouseDown(e) {
        this.mouseDown = true
        const { pageX, pageY } = e
        if (this.selectRect) {
            const { w, h, x, y, r, b } = this.selectRect
            if (this.selectAnchorIndex !== -1) {
                this.startPoint = {
                    x: pageX,
                    y: pageY,
                    moved: false,
                    selectRect: { w, h, x, y, r, b },
                    rawRect: { w, h, x, y, r, b },
                }
                this.action = RESIZE
                return
            }
            this.startPoint = {
                x: e.pageX,
                y: e.pageY,
                moved: false,
            }
            if (pageX > x && pageX < r && pageY > y && pageY < b) {
                this.action = MOVING_RECT
                this.startDragRect = {
                    x: pageX,
                    y: pageY,
                    selectRect: {
                        x, y, w, h, r, b
                    }
                }
            } else {
                this.action = CREATE_RECT
            }
        } else {
            this.action = CREATE_RECT
            this.startPoint = {
                x: e.pageX,
                y: e.pageY,
                moved: false,
            }
            e.stopPropagation()
            e.preventDefault()
        }
    }

    onMouseDrag(e) {
        e.stopPropagation()
        e.preventDefault()

        const { pageX, pageY } = e
        let startDragging
        let selectRect = this.selectRect
        if (!this.startPoint.moved) {
            if (Math.abs(this.startPoint.x - pageX) > 10 || Math.abs(this.startPoint.y - pageY) > 10) {
                this.startPoint.moved = true
                startDragging = true
            }
        }
        if (!this.startPoint.moved) {
            return
        }

        if (this.action === MOVING_RECT) {
            // 移动选区
            if (startDragging) {
                this.emit('start-dragging', selectRect)
            }
            this.emit('dragging', selectRect)
            const { w, h, x, y, r, b } = selectRect
            const { x: startX, y: startY } = this.startPoint
            selectRect = this.selectRect = {
                w,
                h,
                x: this.startDragRect.selectRect.x + pageX - startX,
                y: this.startDragRect.selectRect.y + pageY - startY,
                r: x + w,
                b: y + h
            }
            this.drawRect()
        } else if (this.action === RESIZE) {
            this.emit('dragging', selectRect)
            let { row, col } = ANCHORS[this.selectAnchorIndex]
            if (row) {
                this.startPoint.rawRect[row] = this.startPoint.selectRect[row] + pageX - this.startPoint.x
                selectRect.x = this.startPoint.rawRect.x
                selectRect.r = this.startPoint.rawRect.r
                if (selectRect.x > selectRect.r) {
                    let x = selectRect.r
                    selectRect.r = selectRect.x
                    selectRect.x = x
                }
                selectRect.w = selectRect.r - selectRect.x
                this.startPoint.rawRect.w = selectRect.w
            }
            if (col) {
                this.startPoint.rawRect[col] = this.startPoint.selectRect[col] + pageY - this.startPoint.y
                selectRect.y = this.startPoint.rawRect.y
                selectRect.b = this.startPoint.rawRect.b

                if (selectRect.y > selectRect.b) {
                    let y = selectRect.b
                    selectRect.b = selectRect.y
                    selectRect.y = y
                }
                selectRect.h = selectRect.b - selectRect.y
                this.startPoint.rawRect.h = selectRect.h
            }
            this.drawRect()
        } else {
            // 生成选区
            const { pageX, pageY } = e
            let x, y, w, h, r, b
            if (this.startPoint.x > pageX) {
                x = pageX
                r = this.startPoint.x
            } else {
                r = pageX
                x = this.startPoint.x
            }
            if (this.startPoint.y > pageY) {
                y = pageY
                b = this.startPoint.y
            } else {
                b = pageY
                y = this.startPoint.y
            }
            w = r - x
            h = b - y


            this.selectRect = {
                x, y, w, h, r, b
            }
            selectRect = this.selectRect
            if (startDragging) {
                this.emit('start-dragging', selectRect)
            }
            this.emit('dragging', selectRect)
            this.drawRect(x, y, w, h)
        }


    }

    drawRect() {
        if (!this.selectRect) {
            this.$canvas.style.display = 'none'
            return
        }
        const { x, y, w, h } = this.selectRect

        const scaleFactor = this.scaleFactor
        let margin = 7
        let radius = 5
        this.$canvas.style.left = `${x - margin}px`
        this.$canvas.style.top = `${y - margin}px`
        this.$canvas.style.width = `${w + margin * 2}px`
        this.$canvas.style.height = `${h + margin * 2}px`
        this.$canvas.style.display = 'block'
        this.$canvas.width = (w + margin * 2) * scaleFactor
        this.$canvas.height = (h + margin * 2) * scaleFactor

        if (w && h) {
            let imageData = this.bgCtx.getImageData(x * scaleFactor, y * scaleFactor, w * scaleFactor, h * scaleFactor)
            this.ctx.putImageData(imageData, margin * scaleFactor, margin * scaleFactor)
        }
        this.ctx.fillStyle = '#ffffff'
        this.ctx.strokeStyle = '#67bade'
        this.ctx.lineWidth = 2 * this.scaleFactor

        this.ctx.strokeRect(margin * scaleFactor, margin * scaleFactor, w * scaleFactor, h * scaleFactor)
        this.drawAnchors(w, h, margin, scaleFactor, radius)
    }

    drawAnchors(w, h, margin, scaleFactor, radius) {
        if (this.mouseDown && this.action === CREATE_RECT) {
            this.anchors = null
            return
        }
        this.ctx.beginPath()
        let anchors = [
            [0, 0],
            [w * this.scaleFactor / 2, 0],
            [w * this.scaleFactor, 0],

            [0, h * this.scaleFactor / 2],
            [w * this.scaleFactor, h * this.scaleFactor / 2],

            [0, h * this.scaleFactor],
            [w * this.scaleFactor / 2, h * this.scaleFactor],
            [w * this.scaleFactor, h * this.scaleFactor],
        ]
        this.anchors = anchors.map(([x, y]) => [this.selectRect.x + x * 0.5, this.selectRect.y + y * 0.5])
        anchors.forEach(([x, y], i) => {
            this.ctx.arc(x + margin * scaleFactor, y + margin * scaleFactor, radius * scaleFactor, 0, 2 * Math.PI)
            let next = anchors[(i + 1) % anchors.length]
            this.ctx.moveTo(next[0] + margin * scaleFactor + radius * scaleFactor, next[1] + margin * scaleFactor)
        })
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.stroke()
    }

    onMouseMove(e) {
        if (this.mouseDown) {
            this.onMouseDrag(e)
            return
        }
        this.selectAnchorIndex = -1
        if (this.selectRect) {
            const { pageX, pageY } = e
            const { w, h, x, y, r, b } = this.selectRect
            let selectAnchor, selectIndex = -1
            if (this.anchors) {
                this.anchors.forEach(([x, y], i) => {
                    if (Math.abs(pageX - x) <= 10 && Math.abs(pageY - y) <= 10) {
                        selectAnchor = [x, y]
                        selectIndex = i
                    }
                })
            }
            if (selectAnchor) {
                this.selectAnchorIndex = selectIndex
                document.body.style.cursor = ANCHORS[selectIndex].cursor
                this.emit('moving')
                return
            }
            if (pageX > x && pageX < r && pageY > y && pageY < b) {
                document.body.style.cursor = 'move'
            } else {
                document.body.style.cursor = 'auto'
            }
            this.emit('moving')
        }
    }

    onMouseUp(e) {
        if (!this.mouseDown) {
            return
        }
        this.mouseDown = false
        e.stopPropagation()
        e.preventDefault()
        this.emit('mouse-up')
        if (!this.startPoint.moved) {
            this.emit('end-moving')
            return
        }
        this.emit('end-dragging')
        this.drawRect()
        this.startPoint = null
    }

    getImageUrl() {
        const { x, y, w, h } = this.selectRect
        if (w && h) {
            let imageData = this.bgCtx.getImageData(x * scaleFactor, y * scaleFactor, w * scaleFactor, h * scaleFactor)
            let canvas = document.createElement('canvas')
            let ctx = canvas.getContext('2d')
            ctx.putImageData(imageData, 0, 0)
            return canvas.toDataURL()
        }
        return ''
    }

    reset() {
        this.anchors = null
        this.startPoint = null
        this.selectRect = null
        this.startDragRect = null
        this.selectAnchorIndex = -1
        this.drawRect()
        this.emit('reset')
    }
}