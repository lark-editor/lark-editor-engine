import { getCardRoot } from '../utils/card'
import { getDocument } from '../utils/node'
/**
 * @fileOverview 编辑态
 * @author huangtonger@aliyun.com
 */
const CARD_CURSOR_WIDTH = 2

class DragoverHelper{
    _getCurrentCardRoot() {
        return getCardRoot(this.target);
    } 
    // 获取逼近的插入区间
    _getCaretRange() {
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/caretRangeFromPoint
        const doc = this.doc,
            x = this.x,
            y = this.y
        const { event } = window
        if (doc.caretRangeFromPoint && doc.caretRangeFromPoint(x, y)) {
            return doc.caretRangeFromPoint(x, y)
        } else if (event.rangeParent) {
            const range = doc.createRange()
            range.setStart(event.rangeParent, event.rangeOffset)
            range.collapse(true)
            return range
        }
    }

    _getCardRoot() {
        return this.currentCardRoot ? this.currentCardRoot : this.caretCardRoot
    }

    parseEvent(e) {
        // 文件从 Finder 拖进来，不触发 dragstart 事件
        // 卡片拖动，禁止浏览器行为
        // 禁止拖图进浏览器，浏览器默认打开图片文件
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        this.rangeParent = e.rangeParent
        this.rangeOffset = e.rangeOffset
        this.x = e.clientX
        this.y = e.clientY
        this.target = e.target
        this.doc = getDocument(e.target)
        this.currentCardRoot = this._getCurrentCardRoot() 
        // 当前鼠标精确击中的卡片
        this.caretRange = this._getCaretRange()
        this.caretCardRoot = getCardRoot(this.caretRange.commonAncestorContainer)
        
    }
    // 有逼近选区获得的逼近卡片
    getRange() {
        const caretRange = this.caretRange,
            doc = this.doc,
            x = this.x
  
        const cardRoot = this._getCardRoot()
  
        let cardCaretRange
  
        if (cardRoot) {
            cardCaretRange = doc.createRange()
            const rect = cardRoot.getBoundingClientRect()
            const centerX = (rect.left + rect.right) / 2
            cardCaretRange.selectNode(cardRoot[0])
            // 以卡中点为中心为分割线，逼近两侧可插入的区间
            if (centerX < x) {
                cardCaretRange.collapse(false)
                this.isCardLeftRange = false
            } else {
                cardCaretRange.collapse(true)
                this.isCardLeftRange = true
            }
        }
  
        this.range = cardCaretRange || caretRange
        return this.range
    }

    getCursor() {
        const isCardLeftRange = this.isCardLeftRange,
            range = this.range
  
        const cardRoot = this._getCardRoot()
  
        if (cardRoot && range) {
            if (isCardLeftRange) {
                // 如果选区在卡片左侧，则向后选取一个元素，选中卡片区域
                range.setEnd(range.commonAncestorContainer, range.endOffset + 1)
                const _rect2 = range.getBoundingClientRect()
                range.setEnd(range.commonAncestorContainer, range.endOffset - 1)
                return {
                    x: _rect2.left - CARD_CURSOR_WIDTH,
                    y: _rect2.top,
                    height: _rect2.bottom - _rect2.top
                }
            } 
            // 如果选区在卡片右侧，则向前选取一个元素，选中卡片区域
            range.setStart(range.commonAncestorContainer, range.startOffset - 1)
            const _rect = range.getBoundingClientRect()
            range.setStart(range.commonAncestorContainer, range.startOffset + 1)
            return {
                x: _rect.right - CARD_CURSOR_WIDTH,
                y: _rect.top,
                height: _rect.bottom - _rect.top
            }
        } 
        // 如果卡片根节点不存在，则原逻辑不变
        let rect = this.range.getBoundingClientRect()
  
        if (rect.height === 0) {
            const node = this.range.startContainer
            rect = node.getBoundingClientRect()
        }
  
        return {
          x: rect.left,
          y: rect.top,
          height: rect.bottom - rect.top
        }
    }
}

export default DragoverHelper