import getNodeModel from '../models/node'
import { getDocument,isEmptyNode } from '../utils/node'
import deleteContent from './delete-content'
import { getClosestBlock } from './utils'
import insertNode from './utils/insert-node'
import { enlargeRange,createBookmark,moveToBookmark } from '../utils/range'

export default (range, block, noEmptyBlock) => {
    const doc = getDocument(range.startContainer)
    if (typeof block === 'string') {
        block = getNodeModel(block, doc)
    } 

    // 范围为折叠状态时先删除内容
    if (!range.collapsed) {
        deleteContent(range)
    } 

    // 获取上面第一个 Block
    const container = getClosestBlock(range.startContainer);
    // 超出编辑范围
    if (!container.isRoot() && !container.isEditable()) {
        return range
    } 
    // 当前选择范围在段落外面
    if (container.isRoot()) {
        range = insertNode(range, block)
        range.collapse(false)
        return range
    } 
    // <p><cursor /><br /></p>
    // to
    // <p><br /><cursor /></p>
    if (container.children().length === 1 && container.first().name === 'br') {
        range.selectNodeContents(container[0])
        range.collapse(false)
    } 
    // 插入范围的开始和结束标记
    enlargeRange(range)
    const bookmark = createBookmark(range)
    if (!bookmark) {
        return range
    } 
    // 子节点分别保存在两个变量
    const leftBlock = container.clone(false)
    const rightBlock = container.clone(false) 
    // 切割 Block
    let node = container.first()
    let isLeft = true
  
    while (node) {
        const next = node.next()
        if (node[0] !== bookmark.anchor) {
            if(isLeft){
                leftBlock.append(node)
            }else{
                rightBlock.append(node)
            }
            node = next
        }else{
            isLeft = false
            node = next
        }
    } 

    // Block 的两边添加新的 Block
    if(isEmptyNode(leftBlock[0])){
        if(isEmptyNode[rightBlock[0]] && !noEmptyBlock){
            container.before(leftBlock)
        }
    }else{
        container.before(leftBlock)
    }

    if(!isEmptyNode(rightBlock[0])){
        container.after(rightBlock)
    }

    // 移除范围的开始和结束标记
    moveToBookmark(range, bookmark)
    // 移除原 Block
    range.setStartAfter(container[0])
    range.collapse(true)
    container.remove()
    // 插入新 Block
    insertNode(range, block)
    return range
}