/**
 * Created by xujian1 on 2018/10/5.
 */

const { BrowserWindow, ipcMain, globalShortcut } = require('electron')
const os = require('os')
const path = require('path')

let captureWin = null

const captureScreen = (e, args) => {
    if (captureWin) {
        return
    }
    const { screen } = require('electron')
    let { width, height } = screen.getPrimaryDisplay().bounds
    captureWin = new BrowserWindow({
        // window 使用 fullscreen,  mac 设置为 undefined, 不可为 false
        fullscreen: os.platform() === 'win32' || undefined,
        width,
        height,
        x: 0,
        y: 0,
        transparent: true,
        frame: false,
        skipTaskbar: true,
        autoHideMenuBar: true,
        movable: false,
        resizable: false,
        enableLargerThanScreen: true,
        hasShadow: false,
    })
    captureWin.setAlwaysOnTop(true, 'screen-saver')
    captureWin.setVisibleOnAllWorkspaces(true)
    captureWin.setFullScreenable(false)

    captureWin.loadFile(path.join(__dirname, 'capture.html'))

    // 调试用
    // captureWin.openDevTools()

    captureWin.on('closed', () => {
        captureWin = null
    })

}

const useCapture = () => {

    globalShortcut.register('Esc', () => {
        if (captureWin) {
            captureWin.close()
            captureWin = null
        }
    })

    globalShortcut.register('CmdOrCtrl+Shift+A', captureScreen)

    ipcMain.on('capture-screen', captureScreen)
}

exports.useCapture = useCapture
exports.captureSceen = captureScreen
