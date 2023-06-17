import { getDocument } from '../utils/node'
import getNodeModel from '../models/node'
import { getRangeBlocks,getClosestBlock } from './utils'
import { createBookmark,moveToBookmark } from '../utils/range'

const contains = (blocks, node) => {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i][0] === node[0]) {
        return true
      }
    }
    return false
}

export default (range, block) => {
    const doc = getDocument(range.startContainer)
    if (typeof block === 'string') {
      block = getNodeModel(block, doc)
    }
  
    let blocks = getRangeBlocks(range)
    // li 节点改成 ul 或 ol
    const parentBlocks = []
    blocks = blocks.map(node => {
      const parent = node.parent()
      if (node.name === 'li' && parent && ['ol', 'ul'].indexOf(parent.name) >= 0) {
        if (!contains(parentBlocks, parent)) {
            parentBlocks.push(parent)
            return parent
        }
        return null
      }
      return node
    }).filter(node => {
      return node
    }) 
    // 不在段落内
    if (blocks.length === 0 || blocks[0].isTable()) {
        const root = getClosestBlock(range.startContainer)
        const _bookmark = createBookmark(range)
        root.children().each(node => {
            block.append(node)
        })
        root.append(block)
        moveToBookmark(range, _bookmark)
        return range
    }
  
    const bookmark = createBookmark(range)
    blocks[0].before(block)
    blocks.forEach(node => {
        block.append(node)
    })
    moveToBookmark(range, bookmark)
    return range
}