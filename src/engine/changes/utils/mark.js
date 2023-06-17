import getNodeModel from '../../models/node'
import { shrinkRange } from '../../utils/range'
import { ROOT_KEY,ROOT } from '../../constants/root'
import { CARD_KEY,CARD_ELEMENT_KEY } from '../../constants/card'
import { LAKE_ELEMENT } from '../../constants/bookmark'
import { fetchAllChildren,isEmptyNode,equalNode } from '../../utils/node'
import unwrapNode from './unwrap-node'

// 获取向上第一个非 Mark 节点
export const getClosest = node => {
    node = getNodeModel(node)
    while (node && (node.isMark() || node.isText())) {
      if (node.isRoot()) 
        break
      node = node.parent()
    }
    return node
} 

// 获取对范围有效果的所有 Mark
export const getActiveMarks = range => {
    const dupRange = range.cloneRange() 
    // 左侧不动，只缩小右侧边界
    // <anchor /><strong>foo</strong><focus />bar
    // 改成
    // <anchor /><strong>foo<focus /></strong>bar
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
        let nodes = []
        while (node) {
            if (node.type === Node.ELEMENT_NODE && node.attr(ROOT_KEY) === ROOT) {
                break
            }
            if (node.isMark() && !node.attr(CARD_KEY) && !node.attr(CARD_ELEMENT_KEY)) {
                nodes.push(node)
            }
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

// 移除一个节点下的所有空 Mark，通过 callback 可以设置其它条件
export const removeEmptyMarks = (root, callback) => {
    const children = fetchAllChildren(root)
    const remove = () => {
        children.forEach(child => {
            if (isEmptyNode(child) && getNodeModel(child).isMark() && (!callback || callback(child))) {
                unwrapNode(child)
            }
        })
    }
    remove()
} 

// 判断是不是可移除的 Mark
export const canRemoveMark = (node, mark) => {
    if (node.isCard()) {
        return false
    }
    if (!mark) {
        return true
    }
    return equalNode(node, mark)
} 

// 从下开始往上遍历删除空 Mark，当遇到空 Block，添加 BR 标签
export const removeEmptyMarksAndAddBr = (node, notFirst) => {
    if (!node || node.isRoot() || node.isCard() || node.attr(LAKE_ELEMENT)) {
        return
    }

    if (!node.attr(LAKE_ELEMENT)) {
        const parent = node.parent()
        // 包含光标标签
        // <p><strong><cursor /></strong></p>
        if (node.children().length === 1 && node.first().attr(LAKE_ELEMENT)) {
            if (node.isMark()) {
                node.before(node.first())
                node.remove()
                removeEmptyMarksAndAddBr(parent, true)
            } else if (notFirst && node.isBlock()) {
                node.prepend('<br />')
            }
            return
        }

        const html = node.html()

        if (html === '' || html === "\u200B") {
            if (node.isMark()) {
                node.remove()
                removeEmptyMarksAndAddBr(parent, true)
            } else if (notFirst && node.isBlock()) {
                node.html('<br />')
            }
        }
    }
}