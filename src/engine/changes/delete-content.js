import getNodeModel from '../models/node'
import { createBookmark,moveToBookmark,getPrevNode,getNextNode,enlargeRange } from '../utils/range'
import { getClosestBlock,mergeNode } from './utils'
// 深度合并
const deepMergeNode = (range, prevNode, nextNode) => {
    if (prevNode.isBlock() && !prevNode.isVoid() && !prevNode.isCard()) {
        range.selectNodeContents(prevNode[0])
        range.collapse(false)
        const bookmark = createBookmark(range)
        mergeNode(prevNode, nextNode)
        moveToBookmark(range, bookmark)
        prevNode = getPrevNode(range)
        nextNode = getNextNode(range)
        // 合并之后变成空 Block
        const container = getNodeModel(range.startContainer)
        if (!prevNode && !nextNode && container.isBlock()) {
            container.append('<br />')
            range.selectNodeContents(container[0])
            range.collapse(false)
        }
      
        if (prevNode && nextNode && !prevNode.isCard() && !nextNode.isCard()) {
            deepMergeNode(range, prevNode, nextNode)
        }
    }
}
  
export default (range,isOnlyOne) => {
    if (range.collapsed) {
        return range
    }
    enlargeRange(range)
    // 获取上面第一个 Block
    const block = getClosestBlock(range.startContainer)
    // 获取的 block 超出编辑范围
    if (!block.isRoot() && !block.isEditable()) {
      return range
    } 
    // 先删除范围内的所有内容
    range.extractContents()
    range.collapse(true) 
    // 后续处理
    const container = getNodeModel(range.startContainer)
    const offset = range.startOffset
    // 只删除了文本，不做处理
    if (container.isText()) {
        return range
    }
  
    const prevNode = container[0].childNodes[offset - 1]
    const nextNode = container[0].childNodes[offset] 

    if(prevNode || nextNode || !container.isBlock()){
        if(prevNode && nextNode && getNodeModel(prevNode).isBlock() && getNodeModel(nextNode).isBlock() && !isOnlyOne){
            deepMergeNode(range, getNodeModel(prevNode),getNodeModel(nextNode))
        }
        container.children().each(node => {
            node = getNodeModel(node)
            if((node.isVoid() || node.isElement()) && "" === node.html()) 
                node.remove()
        })
        return range
    }else{
        if(container.isRoot()){
            container.append("<p><br /></p>")
            range.selectNodeContents(container.find("p")[0])
        }else{
            container.append("<br />")
            range.selectNodeContents(container[0])
        }
        range.collapse(false)
        return range
    }
}