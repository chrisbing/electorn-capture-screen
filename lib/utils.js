/**
 * Created by xujian1 on 2018/10/8.
 */

const { remote, screen } = require('electron')


let currentWindow = remote.getCurrentWindow()

exports.getCurrentScreen = () => {
    let { x, y } = currentWindow.getBounds()
    return screen.getAllDisplays().filter(d => d.bounds.x === x && d.bounds.y === y)[0]
}

exports.isCursorInCurrentWindow = () => {
    let { x, y } = screen.getCursorScreenPoint()
    let {
        x: winX, y: winY, width, height,
    } = currentWindow.getBounds()
    return x >= winX && x <= winX + width && y >= winY && y <= winY + height
}
