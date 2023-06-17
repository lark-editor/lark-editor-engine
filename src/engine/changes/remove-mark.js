import getNodeModel from '../models/node'
import { getDocument,walkTree } from '../utils/node'
import splitMark from './split-mark'
import { createBookmark,moveToBookmark } from '../utils/range'
import { canRemoveMark,unwrapNode } from './utils'
import mergeMark from './merge-mark'

export default (range, mark) => {
    const doc = getDocument(range.startContainer)
    if (mark && typeof mark === 'string') {
        mark = getNodeModel(mark, doc)
    }
  
    splitMark(range, mark)
    if (range.collapsed) {
        return range
    }
  
    let ancestor = range.commonAncestorContainer
    if (ancestor.nodeType === Node.TEXT_NODE) {
        ancestor = ancestor.parentNode
    } 

    // 插入范围的开始和结束标记
    const bookmark = createBookmark(range)
    if (!bookmark) {
        return range
    }
    // 遍历范围内的节点，获取目标 Mark
    const markNodes = []
    let started = false
    walkTree(ancestor,node => {
        node = getNodeModel(node)
        if (node[0] !== bookmark.anchor) {
            if(started){
                if(node[0] !== bookmark.focus){
                    if (node.isMark() && !node.isCard() && range.isPointInRange(node[0], 0)) {
                        markNodes.push(node)
                    }
                }
            }
        }else{
            started = true
        }
    }) 
    // 清除 Mark
    markNodes.forEach(node => {
        if (canRemoveMark(node, mark)) {
            unwrapNode(node[0])
        }else if (mark) {
            const styleMap = mark.css()
            Object.keys(styleMap).forEach(key => {
                node.css(key, '')
            })
        } else {
            node.removeAttr('class')
            node.removeAttr('style')
        }
    })
    moveToBookmark(range, bookmark)
    mergeMark(range)
    return range
}