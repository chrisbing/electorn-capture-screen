/**
 * Created by xujian1 on 2018/10/4.
 */

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const os = require('os')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
    globalShortcut.register('Esc', () => {
        if (captureWin) {
            captureWin.close()
            captureWin = null
        }
    })

    globalShortcut.register('CmdOrCtrl+A', captureScreen)


    // 创建浏览器窗口。
    win = new BrowserWindow({ width: 800, height: 600 })

    // 然后加载应用的 index.html。
    win.loadFile('index.html')

    // 打开开发者工具
    win.webContents.openDevTools()

    // 当 window 被关闭，这个事件会被触发。
    win.on('closed', () => {
        // 取消引用 window 对象，如果你的应用支持多窗口的话，
        // 通常会把多个 window 对象存放在一个数组里面，
        // 与此同时，你应该删除相应的元素。
        win = null
    })
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', createWindow)

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (win === null) {
        createWindow()
    }
})


let captureWin = null

let captureScreen = (e, args) => {
    if (captureWin) {
        return
    }
    const { screen } = require('electron')
    let { width, height } = screen.getPrimaryDisplay().bounds
    captureWin = new BrowserWindow({
        [os.platform() === 'win32' ? 'fullscreen' : undefined]: true,
        width,
        height,
        x: 0,
        y: 0,
        transparent: true, /* new add line */
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

    captureWin.loadFile('capture.html')

    // captureWin.openDevTools()

    captureWin.on('closed', () => {
        captureWin = null
    })


};
ipcMain.on('capture-screen', captureScreen)

