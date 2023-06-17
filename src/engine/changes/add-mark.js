import getNodeModel from '../models/node'
import { getDocument,walkTree,isEmptyNode } from '../utils/node'
import { createBookmark,moveToBookmark } from '../utils/range'
import { wrapNode,addOrRemoveBr } from './utils'
import insertNode from './utils/insert-node'
import splitMark from './split-mark'

export default (range, mark) => {
    const doc = getDocument(range.startContainer)
    if (typeof mark === 'string') {
        mark = getNodeModel(mark, doc)
    }
  
    if (range.collapsed) {
        const emptyNode = doc.createTextNode("\u200B")
        mark.append(emptyNode)
        insertNode(range, mark[0])
        addOrRemoveBr(range)
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
    // 遍历范围内的节点，添加 Mark
    let started = false
    walkTree(ancestor,node => {
        node = getNodeModel(node)
        if(node[0] !== bookmark.anchor){
            if(started){
                if(node[0] === bookmark.focus){
                    started = false
                    return false
                }
                if (node.isMark() && !node.isCard()) {
                    if (!isEmptyNode(node[0]))
                    {
                        wrapNode(node, mark)
                        return true
                    }
                    if(node.name !== mark.name) {
                        node.remove()
                    }
                }

                if (node.isText() && !isEmptyNode(node[0])){
                    wrapNode(node, mark)
                    if(node.isBlock() && !node.isTable() && isEmptyNode(node[0])){
                        node.find("br").remove()
                        const cloneMark = mark.clone()
                        const textNode = doc.createTextNode("\u200b")
                        cloneMark.prepend(textNode)
                        node.append(cloneMark)
                    }
                }
            }
        }else{
            started = true
        }
    })
    moveToBookmark(range, bookmark)
    return range
}