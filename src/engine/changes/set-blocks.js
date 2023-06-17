import getNodeModel from '../models/node'
import { getDocument } from '../utils/node'
import { createBookmark,moveToBookmark } from '../utils/range'
import { getRangeBlocks,setNodeProps,setNode } from './utils'
import { CARD_KEY } from '../constants/card'

export default (range, block) => {
    const doc = getDocument(range.startContainer)
    let props
  
    if (typeof block === "object") {
        props = block
        block = null
    } else {
        block = getNodeModel(block, doc)
        props = block.attr()
        props.style = block.css()
    }
  
    const blocks = getRangeBlocks(range)
    // 无段落
    const sc = getNodeModel(range.startContainer)
    if (sc.isRoot() && blocks.length === 0) {
        const newBlock = block || getNodeModel('<p></p>')
        setNodeProps(newBlock, props)
    
        const _bookmark = createBookmark(range)
    
        sc.children().each(node => {
            newBlock.append(node)
        })
    
        sc.append(newBlock)
        moveToBookmark(range, _bookmark)
        return range
    }
  
    const bookmark = createBookmark(range)
    blocks.forEach(node => {
        // 卡片不做处理
        if (node.attr(CARD_KEY)) {
            return
        } 
        // 相同标签，或者传入属性
        if (!block || node.name === block.name) {
            setNodeProps(node, props)
            return
        }
        setNode(node, block)
    })
    moveToBookmark(range, bookmark)
    return range
}