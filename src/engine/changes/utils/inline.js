import getNodeModel from '../../models/node'
import { shrinkRange } from '../../utils/range'

// 获取最近的 Inline 节点
export const getClosestInline = node => {
    node = getNodeModel(node)
    while (node && node.parent() && !node.isBlock()) {
        if (node.isRoot()) 
            break
        if (node.isInline()) 
            return node
        node = node.parent()
    }
} 

// 获取范围内的所有 Inline
export const getActiveInlines = range => {
    const dupRange = range.cloneRange()
    // 左侧不动，只缩小右侧边界
    // <anchor /><a>foo</a><focus />bar
    // 改成s
    // <anchor /><a>foo<focus /></a>bar
    if (!range.collapsed) {
      const rightRange = range.cloneRange()
      shrinkRange(rightRange)
      dupRange.setEnd(rightRange.endContainer, rightRange.endOffset)
    }
  
    const sc = dupRange.startContainer
    const so = dupRange.startOffset
    const ec = dupRange.endContainer
    const eo = dupRange.endOffset
    let startNode = sc
    let endNode = ec
  
    if (sc.nodeType === Node.ELEMENT_NODE) {
        if (sc.childNodes[so]) {
            startNode = sc.childNodes[so] || sc
        }
    }
  
    if (ec.nodeType === Node.ELEMENT_NODE) {
        if (eo > 0 && ec.childNodes[eo - 1]) {
            endNode = ec.childNodes[eo - 1] || sc
        }
    } 
    // 折叠状态时，按右侧位置的方式处理
    if (range.collapsed) {
        startNode = endNode
    } 
    // 不存在时添加
    const addNode = (nodes, nodeB) => {
        if (!nodes.some(nodeA => nodeA[0] === nodeB[0])) {
            nodes.push(nodeB)
        }
    } 
    // 向上寻找
    const findNodes = node => {
        node = getNodeModel(node)
        const nodes = []
        while (node) {
            if (node.isRoot()) 
            break
    
            if (node.isInline()) 
                nodes.push(node)
            node = node.parent()
        }
        return nodes
    }
  
    const nodes = findNodes(startNode)
    if (!range.collapsed) {
      findNodes(endNode).forEach(nodeB => {
        return addNode(nodes, nodeB)
      })
    }
    return nodes
}