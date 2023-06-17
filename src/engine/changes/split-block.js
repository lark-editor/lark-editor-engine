import getNodeModel from '../models/node'
import { walkTree,isEmptyNode } from '../utils/node'
import { shrinkRange } from '../utils/range'
import deleteContent from './delete-content'
import { getClosestBlock , createSideBlock } from './utils/block'

// 删除空 Inline、Mark 标签
const removeEmptyNodes = root => {
    walkTree(root[0], node => {
        node = getNodeModel(node)
        if (!node.isVoid() && (node.isInline() || node.isMark()) && isEmptyNode(node[0])) {
            node.remove()
        }
    }, true)
}
  
export default range => {
    // 范围为展开状态时先删除内容
    if (!range.collapsed) {
        deleteContent(range)
    } 
    // 获取上面第一个 Block
    const block = getClosestBlock(range.startContainer)
    // 获取的 block 超出编辑范围
    if (!block.isRoot() && !block.isEditable()) {
        return range
    }
  
    if (block.isRoot()) {
        // <p>wo</p><cursor /><p>other</p>
        // to
        // <p>wo</p><p><cursor />other</p>
        const sc = range.startContainer.childNodes[range.startOffset]
        if (sc) {
            range.selectNodeContents(sc)
            shrinkRange(range)
            range.collapse(true)
        }
        return range
    } 
    // 子节点分别保存在两个变量
    const leftBlock = createSideBlock({
      block: block,
      range: range,
      isLeft: true
    })
    const rightBlock = createSideBlock({
      block: block,
      range: range,
      isLeft: false
    }) 
    // 删除空 Inline、Mark 标签，修正空 Block 标签
    removeEmptyNodes(leftBlock)
    removeEmptyNodes(rightBlock) 
    // Block 的两边添加新的 Block
    block.before(leftBlock)
    block.after(rightBlock)
    // Chrome 不能选中 <p></p>，里面必须要有节点，插入 BR 之后输入文字自动消失
    if (isEmptyNode(leftBlock[0])) {
        leftBlock.html('<br />')
    }
  
    if (isEmptyNode(rightBlock[0])) {
        rightBlock.html('<br />')
    }
    // 重新设置当前选中范围
    range.selectNodeContents(rightBlock[0])
    shrinkRange(range)
  
    if (rightBlock.children().length === 1 && rightBlock.first().name === 'br') {
        range.collapse(false)
    } else {
        range.collapse(true)
    }
  
    block.remove()
    return range
}