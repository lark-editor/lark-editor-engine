import getNodeModel from '../models/node'
import { walkTree,isEmptyNode,getDocument } from '../utils/node'
import { createBookmark,moveToBookmark } from '../utils/range'
import splitMark from './split-mark'
import { wrapNode } from './utils'

export default (range, inline) => {
    const doc = getDocument(range.startContainer)
    if (typeof inline === 'string') {
        inline = getNodeModel(inline, doc)
    }
  
    if (range.collapsed) {
        return range
    }
  
    splitMark(range)
    let ancestor = range.commonAncestorContainer
    if (ancestor.nodeType === Node.TEXT_NODE) {
        ancestor = ancestor.parentNode
    } 

    // 插入范围的开始和结束标记
    const bookmark = createBookmark(range)
    if (!bookmark) {
        return range
    } 
    // 遍历范围内的节点，添加 Inline
    let started = false
    walkTree(ancestor, node => {
        node = getNodeModel(node)
        if(node[0] !== bookmark.anchor){
            if(started){
                if (node[0] === bookmark.focus){
                    started = false
                    return false
                }
                if (node.isMark() && !node.isCard()) {
                    if (!isEmptyNode(node[0])){
                        wrapNode(node , inline)
                        return true
                    }
                    node.remove()
                }
                if(node.isText() && !isEmptyNode(node[0])){
                    wrapNode(node , inline)
                }
            }
        }else{
            started = true
        }
    })
    const anchor = getNodeModel(bookmark.anchor)
    if (anchor.parent().isHeading() && !anchor.prev() && !anchor.next()) {
        anchor.after('<br />')
    }
    const focus = getNodeModel(bookmark.focus)
  
    if (anchor[0] !== focus[0]) {
        if (focus.parent().isHeading() && !focus.prev() && !focus.next()) {
            focus.before('<br />')
        }
    }
  
    moveToBookmark(range, bookmark)
    return range
}