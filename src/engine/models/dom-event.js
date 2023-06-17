import DragoverHelper from '../helper/dragover'
import getNodeModel from './node'
import { CARD_ELEMENT_KEY } from '../constants/card'
import { isHotkey } from '../utils/is-hotkey'
import {  getClipboardData } from '../utils/clipboard'

class DOMEvent {
    constructor(change){
        this.data = []
        this.change = change
        this.engine = change.engine
        this.editArea = change.editArea
        this.card = change.card
        // 中文输入状态
        this.isComposing = false
        // 选择范围状态
        this.isSelecting = false
        this.dragoverHelper = new DragoverHelper()
    }
    // return true：焦点在卡片里的其它输入框
    // return false：焦点在编辑区域，触发 change、select 事件
    isCardInput(e) {
        let node = getNodeModel(e.target)
        while (node) {
            if (node.isRoot()) {
                return false
            }
            if (node.attr(CARD_ELEMENT_KEY) === 'center') {
                return true
            }
            if (node.hasClass('lake-embed-toolbar')) {
                return true
            }
            node = node.parent()
        }
        return false
    }

    onInput(callback) {
        // 处理中文输入法状态
        // https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
        this.editArea.on('compositionstart', () => {
            if (this.engine && this.engine.isReadonly) {
                return
            }
            this.isComposing = true
        })
        this.editArea.on('compositionend', () => {
            if (this.engine && this.engine.isReadonly) {
                return
            }
            this.isComposing = false
        })
        this.editArea.on('input', e => {
            if (this.engine && this.engine.isReadonly) {
                return
            }
    
            if (this.isCardInput(e)) {
                return
            }
    
            window.setTimeout(() => {
                if(!this.isComposing){
                    callback(e)
                }
            }, 10)
        })
    }

    onSelect(callback) {
        // 模拟 selection change 事件
        this.editArea.on('mousedown', e => {
            if (this.isCardInput(e)) {
                return
            }
            this.isSelecting = true
        })
        this.onDocument('mouseup', e => {
            if (!this.isSelecting) {
                return
            }
            this.isSelecting = false 
            // mouseup 瞬间选择状态不会马上被取消，需要延迟
            window.setTimeout(() => {
                return callback(e)
            }, 10)
        }); 
        // 补齐通过键盘选中的情况
        this.editArea.on('keyup', e => {
            if (this.engine && this.engine.isReadonly) {
                return
            }
    
            if (this.isCardInput(e)) {
                return
            } 
            // command + 方向键不会触发 keyup 事件，所以先用 e.key === 'Meta' 代替 isHotkey('mod+方向键',e)
            // https://riddle.alibaba-inc.com/riddles/5dd58be1
            if (isHotkey('left',e) || isHotkey('right',e) || isHotkey('up',e) || isHotkey('down',e) || e.key === 'Meta' || isHotkey('shift+left',e) || isHotkey('shift+right',e) || isHotkey('shift+up',e) || isHotkey('shift+down',e) || isHotkey('ctrl+b',e) || isHotkey('ctrl+f',e) || isHotkey('ctrl+n',e) || isHotkey('ctrl+p',e) || isHotkey('ctrl+a',e) || isHotkey('ctrl+e',e) || isHotkey('home',e) || isHotkey('end',e)) {
                if(!this.isComposing){
                    callback(e)
                }
            }
        })
    }

    onPaste(callback) {
        let isPasteText = false
        this.editArea.on('keydown', e => {
            if (this.engine && this.engine.isReadonly) {
                return
            }
    
            if (!isHotkey('mod',e) || !isHotkey('shift',e) || !isHotkey('v',e)) {
                isPasteText = false
            }
    
            if (isHotkey('mod+shift+v',e) || isHotkey('mod+alt+shift+v',e)) {
                isPasteText = true
            }
        })
        // https://developer.mozilla.org/en-US/docs/Web/Events/paste
        this.editArea.on('paste', e => {
            if (this.engine && this.engine.isReadonly) {
                return
            }
    
            if (this.isCardInput(e)) {
                return
            }
    
            e.preventDefault()
            const data = getClipboardData(e)
            data.isPasteText = isPasteText
            isPasteText = false
            callback(data)
        })
    }

    onDrop(callback) {
  
        // 表格里的单元格编辑器不做拖动定制
        if (this.engine && this.engine.isSub()) {
            return
        }
        const removeCursor = () => {
            getNodeModel("body > div.lake-drop-cursor").remove()
        }
        const setCursor = () => {
            removeCursor()
            const targetCursor = getNodeModel('<div class="lake-drop-cursor" />')
            getNodeModel(document.body).append(targetCursor)
        }
  
        let cardRoot
        let dragImage
        let dropRange
        this.editArea.on('dragstart', e => {
            setCursor()
            // 拖动卡片
            cardRoot = this.card.closest(e.target)
            if (cardRoot) {
                this.card.hideCardToolbar(cardRoot) 
                // https://kryogenix.org/code/browser/custom-drag-image.html
                dragImage = cardRoot.find('img.lake-drag-image')
    
                if (dragImage.length > 0) {
                    dragImage = dragImage.clone()
                } else {
                    dragImage = getNodeModel('<div class="lake-drag-image" />')
                    dragImage.css({
                        width: cardRoot[0].clientWidth + 'px',
                        height: cardRoot[0].clientHeight + 'px'
                    })
                }
    
                dragImage.css({
                    position: 'absolute',
                    top: '-10000px',
                    right: '-10000px'
                })
                getNodeModel(document.body).append(dragImage)
                e.dataTransfer.setDragImage(dragImage[0], 0, 0)
            }
        })
        this.editArea.on('dragover', e => {
            const dragoverHelper = this.dragoverHelper
            const targetCursor = getNodeModel("body > div.lake-drop-cursor")
            if(targetCursor.length !== 0){
                dragoverHelper.parseEvent(e)
                dropRange = dragoverHelper.getRange()
                const cursor = dragoverHelper.getCursor()
                targetCursor.css({
                    height: cursor.height + 'px',
                    top: Math.round(window.pageYOffset + cursor.y) + 'px',
                    left: Math.round(window.pageXOffset + cursor.x) + 'px'
                })
            }else
                setCursor()
        })
        this.editArea.on('dragleave', () => {
            removeCursor()
        })
        this.editArea.on('dragend', () => {
            removeCursor()
            if (dragImage) {
                dragImage.remove()
                dragImage = undefined
            }
        })
        this.editArea.on('drop', e => {
            // 禁止拖图进浏览器，浏览器默认打开图片文件
            e.preventDefault()
    
            if (cardRoot) {
                this.card.showCardToolbar(cardRoot)
            }
    
            removeCursor()
            if (dragImage) {
                dragImage.remove()
                dragImage = undefined
            }

            const transfer = e.dataTransfer
            let files = [] 
            // Edge 兼容性处理
            try {
                if (transfer.items && transfer.items.length > 0) {
                    files = Array.from(transfer.items).map(item => {
                        return item.kind === 'file' ? item.getAsFile() : null
                    }).filter(exists => {
                        return exists
                    });
                } else if (transfer.files && transfer.files.length > 0) {
                    files = Array.from(transfer.files)
                }
            } catch (err) {
                if (transfer.files && transfer.files.length > 0) {
                    files = Array.from(transfer.files)
                }
            }
    
            const data = {
                e,
                dropRange,
                cardRoot,
                files
            }
            callback(data)
            cardRoot = undefined
        })
    }

    onDocument(eventType, listener, useCapture) {
        useCapture = useCapture === undefined ? false : useCapture
        document.addEventListener(eventType, listener, useCapture)
        this.data.push({
            type: 'document',
            eventType,
            listener,
            useCapture
        })
    }

    onWindow(eventType, listener, useCapture) {
        useCapture = useCapture === undefined ? false : useCapture
        window.addEventListener(eventType, listener, useCapture)
        this.data.push({
            type: 'window',
            eventType,
            listener,
            useCapture
        })
    }

    destroy() {
        this.data.forEach(item => {
            if (item.type === 'window') {
                window.removeEventListener(item.eventType, item.listener, item.useCapture)
            }
    
            if (item.type === 'document') {
                document.removeEventListener(item.eventType, item.listener, item.useCapture)
            }
        })
    }
}

export default DOMEvent