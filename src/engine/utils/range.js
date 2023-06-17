import { CARD_KEY,CARD_TYPE_KEY,CARD_SELECTOR,CARD_LEFT_SELECTOR,CARD_RIGHT_SELECTOR,READY_CARD_KEY } from '../constants/card'
import { ROOT_SELECTOR } from '../constants/root'
import { ANCHOR_SELECTOR,FOCUS_SELECTOR,CURSOR_SELECTOR,LAKE_ELEMENT,CURSOR,ANCHOR,FOCUS } from '../constants/bookmark'
import getNodeModel from '../models/node'
import { removeZeroWidthSpace, walkTree } from './node'
import { edge, safari, mobile } from './ua'

// 具有 block css 属性的行内卡片
const inlineCardHasBlockStyle = cardRoot => {
    return cardRoot.attr(CARD_TYPE_KEY) === 'inline' && cardRoot.css('display') === 'block';
} 

const getClientRect = node => {
    let item = node.getClientRects().item(0)
    if(!item){
        item = node.getBoundingClientRect()
    }
    return item
}

// 提高 range 的位置标记
// <p><strong><span>123</span>|abc</strong>def</p>
// position("abc", 0) -> position(strong, 1)
// or
// <p><strong>abc|<span>123</span></strong>def</p>
// position("abc", 3) -> position(strong, 1)
const upRange = range => {
    const upPosition = (node, pos, isStart) => {
        if (node.nodeType !== 3) {
            return
        }
        if (pos === 0) {
            if (isStart) {
                range.setStartBefore(node)
            } else {
                range.setEndBefore(node)
            }
        } else if (pos === node.nodeValue.length) {
            if (isStart) {
                range.setStartAfter(node)
            } else {
                range.setEndAfter(node)
            }
        }
    }
    upPosition(range.startContainer, range.startOffset, true);
    upPosition(range.endContainer, range.endOffset, false);
} 

// 降低 range 的位置标记
// <p><strong><span>123</span>|abc</strong>def</p>
// position(strong, 1) -> position("abc", 0)
// or
// <p><strong>abc|<span>123</span></strong>def</p>
// position(strong, 1) -> position("abc", 3)
const downRange = range => {
    const downPosition = (node, pos, isStart) => {
        if (node.nodeType !== 1) {
            return
        }

        const childNodes = node.childNodes
        if (childNodes.length === 0) {
            return
        }

        let left
        let right
        let child
        let offset

        if (pos > 0) {
            left = childNodes[pos - 1]
        }

        if (pos < childNodes.length) {
            right = childNodes[pos]
        }

        if (left && left.nodeType === 3) {
            child = left
            offset = child.nodeValue.length
        }

        if (right && right.nodeType === 3) {
            child = right
            offset = 0
        }

        if (!child) {
            return
        }

        if (isStart) {
            range.setStart(child, offset)
        } else {
            range.setEnd(child, offset)
        }
    }
    downPosition(range.startContainer, range.startOffset, true)
    downPosition(range.endContainer, range.endOffset, false)
} 

// 扩大边界
// <p><strong><span>[123</span>abc]</strong>def</p>
// to
// <p>[<strong><span>123</span>abc</strong>]def</p>
const enlargeRange = (range, toBlock) => {
    upRange(range)

    const enlargePosition = (node, pos, isStart) => {
        node = getNodeModel(node)
        if ((node.type === Node.TEXT_NODE || node.isSolid() || !toBlock && node.isBlock()) || node.isRoot()) {
            return
        }
        let parent
        if (pos === 0) {
            while (!node.prev()) {
                parent = node.parent()
                if (!parent || parent.isSolid() || !toBlock && parent.isBlock()) {
                    break
                }
                if (!parent.isEditable()) {
                    break
                }
                node = parent
            }

            if (isStart) {
                range.setStartBefore(node[0])
            } else {
                range.setEndBefore(node[0])
            }
        } else if (pos === node.children().length) {
            while (!node.next()) {
                parent = node.parent()
                if (!parent || parent.isSolid() || !toBlock && parent.isBlock()) {
                    break
                }
                if (!parent.isEditable()) {
                    break
                }
                node = parent
            }

            if (isStart) {
                range.setStartAfter(node[0])
            } else {
                range.setEndAfter(node[0])
            }
        }
    }
    enlargePosition(range.startContainer, range.startOffset, true)
    enlargePosition(range.endContainer, range.endOffset, false)
} 

// 缩小边界
// <body>[<p><strong>123</strong></p>]</body>
// to
// <body><p><strong>[123]</strong></p></body>
const shrinkRange = range => {
    let child
    while (range.startContainer.nodeType === Node.ELEMENT_NODE && (child = range.startContainer.childNodes[range.startOffset]) && child.nodeType === Node.ELEMENT_NODE && !getNodeModel(child).isVoid() && !getNodeModel(child).attr(CARD_KEY) && !getNodeModel(child).attr(READY_CARD_KEY)) {
        range.setStart(child, 0)
    }
    while (range.endContainer.nodeType === Node.ELEMENT_NODE && range.endOffset > 0 && (child = range.endContainer.childNodes[range.endOffset - 1]) && child.nodeType === Node.ELEMENT_NODE && !getNodeModel(child).isVoid() && !getNodeModel(child).attr(CARD_KEY) && !getNodeModel(child).attr(READY_CARD_KEY)) {
        range.setEnd(child, child.childNodes.length)
    }
} 

// 创建 bookmark，通过插入 span 节点标记位置
const createBookmark = range => {
    const ancestor = getNodeModel(range.commonAncestorContainer) 
    // 超出编辑区域
    if (!ancestor.isRoot() && !ancestor.isEditable()) {
        return
    }

    const doc = ancestor.doc
    // 为了增加容错性，删除已有的标记
    const root = ancestor.closest(ROOT_SELECTOR)
    root.find(ANCHOR_SELECTOR).remove()
    root.find(FOCUS_SELECTOR).remove()
    root.find(CURSOR_SELECTOR).remove() 
    // card
    const startCardRoot = getNodeModel(range.startContainer).closest(CARD_SELECTOR)
    if (startCardRoot.length > 0 && !inlineCardHasBlockStyle(startCardRoot)) {
        const cardLeft = getNodeModel(range.startContainer).closest(CARD_LEFT_SELECTOR)
        if (cardLeft.length > 0) {
            range.setStartBefore(startCardRoot[0])
        }
        const cardRight = getNodeModel(range.startContainer).closest(CARD_RIGHT_SELECTOR)
        if (cardRight.length > 0) {
            range.setStartAfter(startCardRoot[0])
        }
    }

    if (range.startContainer !== range.endContainer) {
        const endCardRoot = getNodeModel(range.endContainer).closest(CARD_SELECTOR)
        // 具有 block css 属性的行内卡片，不调整光标位置
        if (endCardRoot.length > 0 && !inlineCardHasBlockStyle(endCardRoot)) {
            const _cardLeft = getNodeModel(range.endContainer).closest(CARD_LEFT_SELECTOR)
            if (_cardLeft.length > 0) {
                range.setEndBefore(endCardRoot[0])
            }
            const _cardRight = getNodeModel(range.endContainer).closest(CARD_RIGHT_SELECTOR);
            if (_cardRight.length > 0) {
                range.setEndAfter(endCardRoot[0])
            }
        }
    } 
    // cursor
    if (range.collapsed) {
        const cursor = doc.createElement('span')
        getNodeModel(cursor).attr(LAKE_ELEMENT,CURSOR)
        range.insertNode(cursor)
        return {
            anchor: cursor,
            focus: cursor
        }
    } 
    // anchor
    const startRange = range.cloneRange()
    startRange.collapse(true)
    const anchor = doc.createElement('span')
    getNodeModel(anchor).attr(LAKE_ELEMENT, ANCHOR)
    startRange.insertNode(anchor) 
    range.setStartAfter(anchor)
    // focus
    const endRange = range.cloneRange()
    endRange.collapse(false)
    const focus = doc.createElement('span')
    getNodeModel(focus).attr(LAKE_ELEMENT, FOCUS)
    endRange.insertNode(focus)
    return {
        anchor,
        focus
    }
} 

// 根据 bookmark 重新设置 range，并移除 span 节点
const moveToBookmark = (range, bookmark) => {
    if (!bookmark) {
        return
    }
    if (bookmark.anchor === bookmark.focus) {
        const cursor = getNodeModel(bookmark.anchor)
        const _parent = cursor.parent()
        removeZeroWidthSpace(_parent)
        _parent[0].normalize()
        let isCardCursor = false
        const prevNode = cursor.prev()
        const nextNode = cursor.next() 
        // 具有 block css 属性的行内卡片，不调整光标位置
        if (prevNode && prevNode.isCard() && !inlineCardHasBlockStyle(prevNode)) {
            const cardRight = prevNode.find(CARD_RIGHT_SELECTOR)
            if (cardRight.length > 0) {
                range.selectNodeContents(cardRight[0])
                range.collapse(false)
                isCardCursor = true
            }
        } else if (nextNode && nextNode.isCard() && !inlineCardHasBlockStyle(nextNode)) {
            const cardLeft = nextNode.find(CARD_LEFT_SELECTOR)
            if (cardLeft.length > 0) {
                range.selectNodeContents(cardLeft[0])
                range.collapse(false)
                isCardCursor = true
            }
        }

        if (!isCardCursor) {
            range.setStartBefore(cursor[0])
            range.collapse(true)
        }

        if (edge) {
            _parent[0].normalize()
            cursor.remove()
        } else {
            cursor.remove()
            _parent[0].normalize()
        }
        return
    } 
    // collapsed = false
    // range start
    const anchorNode = getNodeModel(bookmark.anchor)
    let parent = anchorNode.parent()
    removeZeroWidthSpace(parent)
    range.setStartBefore(anchorNode[0])
    anchorNode.remove()
    parent[0].normalize() 
    // range end
    const focusNode = getNodeModel(bookmark.focus)
    parent = focusNode.parent()
    removeZeroWidthSpace(parent)
    range.setEndBefore(focusNode[0])
    focusNode.remove()
    parent[0].normalize()
    if(safari){
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
    }
}
  
// 获取开始位置前的节点
// <strong>foo</strong>|bar
const getPrevNode = range => {
    upRange(range)
    const sc = getNodeModel(range.startContainer)
    const so = range.startOffset

    if (sc.isText()) {
        return
    }
    const childNodes = sc.children()
    if (childNodes.length === 0) {
        return
    }
    return childNodes.eq(so - 1)
} 

// 获取结束位置后的节点
// foo|<strong>bar</strong>
const getNextNode = range => {
    upRange(range)
    const ec = getNodeModel(range.endContainer)
    const eo = range.endOffset

    if (ec.isText()) {
        return
    }
    const childNodes = ec.children()
    if (childNodes.length === 0) {
        return
    }
    return childNodes.eq(eo)
}

const deepCut = range =>{
    if(!range.collapsed)
        range.extractContents()
    const startNode = getNodeModel(range.startContainer)
    if (!startNode.isRoot()) {
        let node = getNodeModel(range.startContainer)
        if (!node.isRoot()) {
            let parentNode = node.parent()
            while (!parentNode.isRoot()){
                node = parentNode
                parentNode = parentNode.parent()
            }
            range.setEndAfter(node[0])
            const contents = range.extractContents()
            range.insertNode(contents)
            range.collapse(true)
        }
    }
}

const getRootBlock = range => {
    const node = getNodeModel(range.startContainer)
    if (node.isRoot()) 
        return getNodeModel(node.children()[range.startOffset])
    let tmpNode = node
    while (!tmpNode.parent().isRoot()) {
        tmpNode = tmpNode.parent()
    }
    return tmpNode
}

const scrollIntoView = range => {
    if(mobile && range && range.endContainer.scrollIntoView){
        range.endContainer.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        })
    }
}

const findElementsInSimpleRange = range => {
    const { startContainer , endContainer , startOffset , endOffset , collapsed } = range
    const elements = []
    if(startContainer !== endContainer || collapsed === true || startContainer.nodeType === Node.TEXT_NODE){
        return elements
    }

    const { childNodes } = startContainer
    for(let i = startOffset;i < endOffset; i++ ){
        elements.push(childNodes[i])
    }
    return elements
}

const getSubRanges = range => {
    const ranges = []
    const cardRoot = range.commonAncestorContainer
    walkTree(cardRoot , child => {
        if (child.nodeType === Node.TEXT_NODE){
            let offset = 0
            const valueLength = child.nodeValue.length
            const start = range.comparePoint(child,offset)
            const end = range.comparePoint(child,valueLength)
            const docRange = document.createRange()
            if(start < 0){
                if(end < 0)
                    return
                if(end === 0){
                    docRange.setStart(child, range.startOffset)
                    docRange.setEnd(child, valueLength)
                }else{
                    docRange.setStart(child, range.startOffset)
                    docRange.setEnd(child, range.endOffset)
                }
            }else{
                if(start !== 0)
                    return
                if(end < 0)
                    return
                if(end === 0){
                    docRange.setStart(child, offset)
                    docRange.setEnd(child, valueLength)
                }else{
                    docRange.setStart(child, offset)
                    docRange.setEnd(child, range.endOffset)
                }
            }
            ranges.push(docRange)
        }
    })
    return ranges
}

export {
    getClientRect,
    upRange,
    downRange,
    enlargeRange,
    shrinkRange,
    createBookmark,
    moveToBookmark,
    getPrevNode,
    getNextNode,
    deepCut,
    getRootBlock,
    scrollIntoView,
    findElementsInSimpleRange,
    getSubRanges,
}