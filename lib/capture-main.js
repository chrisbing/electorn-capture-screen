/**
 * Created by xujian1 on 2018/10/5.
 */

const { BrowserWindow, ipcMain, globalShortcut } = require('electron')
const os = require('os')
const path = require('path')

let captureWins = []

const captureScreen = (e, args) => {
    if (captureWins.length) {
        return
    }
    const { screen } = require('electron')

    let displays = screen.getAllDisplays()
    captureWins = displays.map((display) => {
        let captureWin = new BrowserWindow({
            // window 使用 fullscreen,  mac 设置为 undefined, 不可为 false
            fullscreen: os.platform() === 'win32' || undefined,
            width: display.bounds.width,
            height: display.bounds.height,
            x: display.bounds.x,
            y: display.bounds.y,
            transparent: true,
            frame: false,
            // skipTaskbar: true,
            // autoHideMenuBar: true,
            movable: false,
            // resizable: false,
            enableLargerThanScreen: true,
            hasShadow: false,
            webPreferences: {
              nodeIntegration: true,
            },
        })
        captureWin.setAlwaysOnTop(true, 'screen-saver')
        captureWin.setVisibleOnAllWorkspaces(true)
        captureWin.setFullScreenable(false)

        captureWin.loadFile(path.join(__dirname, 'capture.html'))

        let { x, y } = screen.getCursorScreenPoint()
        if (x >= display.bounds.x && x <= display.bounds.x + display.bounds.width && y >= display.bounds.y && y <= display.bounds.y + display.bounds.height) {
            captureWin.focus()
        } else {
            captureWin.blur()
        }
        // 调试用
        captureWin.openDevTools()

        captureWin.on('closed', () => {
            let index = captureWins.indexOf(captureWin)
            if (index !== -1) {
                captureWins.splice(index, 1)
            }
            captureWins.forEach(win => win.close())
        })
        return captureWin
    })

}

const useCapture = () => {
    globalShortcut.register('Esc', () => {
        if (captureWins) {
            captureWins.forEach(win => win.close())
            captureWins = []
        }
    })

    globalShortcut.register('CmdOrCtrl+Shift+A', captureScreen)

    ipcMain.on('capture-screen', (e, { type = 'start', screenId } = {}) => {
        if (type === 'start') {
            captureScreen()
        } else if (type === 'complete') {
            // nothing
        } else if (type === 'select') {
            captureWins.forEach(win => win.webContents.send('capture-screen', { type: 'select', screenId }))
        }
    })


}

exports.useCapture = useCapture
exports.captureSceen = captureScreen
