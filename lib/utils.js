/**
 * Created by xujian1 on 2018/10/8.
 */

const { remote, screen } = require('electron')

let currentWindow = remote.getCurrentWindow()


class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }
    contains(x, y) {
        return this.x <= x && x <= this.x + this.width
            && this.y <= y && y <= this.y + this.height;
    }
}


exports.getCurrentScreen = () => {
    let { x, y } = currentWindow.getBounds()
    return screen.getAllDisplays().filter((d) => {
        const rect = new Rectangle(d.bounds.x, d.bounds.y, d.bounds.width, d.bounds.height);
        return rect.contains(x, y);
    })[0]
}

exports.isCursorInCurrentWindow = () => {
    let { x, y } = screen.getCursorScreenPoint()
    let {
        x: winX, y: winY, width, height,
    } = currentWindow.getBounds()
    const rect = new Rectangle(winX, winY, width, height);
    return rect.contains(x, y);
}
