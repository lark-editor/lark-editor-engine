import getNodeModel from '../models/node'
import { getClosestBlock,unwrapNode } from './utils'
import { getDocument } from '../utils/node'
import { createBookmark,moveToBookmark } from '../utils/range'

// 获取目标 Block 节点
const getTargetBlock = (node, tagName) => {
    let block = getClosestBlock(node)
    while (block) {
        const parent = block.parent()
        if (!parent) 
            break
        if (!block.isEditable()) 
            break
        if (block.text().trim() !== parent.text().trim())
            break
        if (parent.name === tagName) 
            break
        block = parent
    }
  
    return block
} 

// 获取范围内的兄弟 Block
const getBlockSiblings = (range, block) => {
    const blocks = []
    const startBlock = getTargetBlock(range.startContainer, block.name)
    const endBlock = getTargetBlock(range.endContainer, block.name)
    const parentBlock = startBlock.parent()
    let status = 'left'
    let node = parentBlock.first()
  
    while (node) {
        node = getNodeModel(node)
        if (!node.isBlock())
            return blocks
        // 超过编辑区域
        if (!node.isEditable()) 
            return blocks
    
        if (node[0] === startBlock[0]) {
            status = 'center'
        }
    
        blocks.push({
            status: status,
            node: node
        })
    
        if (node[0] === endBlock[0]) {
            status = 'right'
        }
        node = node.next()
    }
    return blocks
}

export default (range, block) => {
    const doc = getDocument(range.startContainer)
    if (typeof block === 'string') {
      block = getNodeModel(block, doc)
    }
    const blocks = getBlockSiblings(range, block)
    if (blocks.length === 0) {
        return range
    }
  
    const firstNodeParent = blocks[0].node.parent()
    if (!firstNodeParent.isEditable()) {
        return range
    }
    if (firstNodeParent.isTable()) {
        return range
    }
    const hasLeft = blocks.some(item => item.status === 'left')
    const hasRight = blocks.some(item => item.status === 'right')
    let leftParent
  
    if (hasLeft) {
      const parent = firstNodeParent
      leftParent = parent.clone(false)
      parent.before(leftParent)
    }
  
    let rightParent
    if (hasRight) {
      const _parent = blocks[blocks.length - 1].node.parent()
      rightParent = _parent.clone(false)
      _parent.after(rightParent)
    } 

    // 插入范围的开始和结束标记
    const bookmark = createBookmark(range)
    blocks.forEach(item => {
        const status = item.status,node = item.node,parent = node.parent()
    
        if (status === 'left') {
            leftParent.append(node)
        }
    
        if (status === 'center') {
            if (parent.name === block.name && parent.isEditable()) {
                unwrapNode(parent)
            }
        }
    
        if (status === 'right') {
            rightParent.append(node)
        }
    })
    // 有序列表被从中间拆开后，剩余的两个部分的需要保持序号连续
    if (leftParent && leftParent.name === 'ol' && rightParent && rightParent.name === 'ol') {
        rightParent.attr('start', (parseInt(leftParent.attr('start'), 10) || 1) + leftParent.find('li').length)
    }
    moveToBookmark(range, bookmark)
    return range
}