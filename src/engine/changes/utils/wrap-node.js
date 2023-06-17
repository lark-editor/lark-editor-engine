import { fetchAllChildren,equalNode , sameMarkNode , removeMark } from '../../utils/node'
import getNodeModel from '../../models/node'
import unwrapNode from './unwrap-node'
// node: <em><strong>foo</strong></em>
// otherNode: <strong></strong>
// result : <strong><em>foo</em></strong>
const wrapMarkNode = (node, otherNode) => {
    otherNode.append(node.clone(true))
    const children = fetchAllChildren(otherNode)
    children.forEach(child => {
        child = getNodeModel(child)
        if (child.isMark() && equalNode(child, otherNode)) {
            unwrapNode(child)
        }
    })
    return node.replaceWith(otherNode)
} 

function warpNode(node) {
    const children = fetchAllChildren(node)
    children.forEach(child => {
        child = getNodeModel(child)
        if(child.isMark()){
            const marks = sameMarkNode(child, node)
            Object.keys(marks).forEach(mark => {
                removeMark(child, mark)
            })
        }
    })
    return node
}

// 包裹一个 Node
// 如果是 Mark 节点进行相同标签的合并
// span 标签需要合并
// node: <em>foo</em>
// otherNode: <strong></strong>
// result : <strong><em>foo</em></strong>
// node: <span style="color: red;">foo</span>
// otherNode: <span class="lake-fontsize-36"></span>
// result : <span class="lake-fontsize-36" style="color: red;">foo</span>
export default (node, otherNode) => {
    node = getNodeModel(node)
    otherNode = getNodeModel(otherNode)
    otherNode = otherNode.clone(false) 
    // 文本节点
    if (node.isText()) {
        otherNode.append(node.clone(false))
        return node.replaceWith(otherNode)
    } 
    // 包裹样式节点
    if (otherNode.isMark()) {
        let tempNode
        if (node.name === 'span' && otherNode.name === 'span') {
            const attrs = otherNode.attr()
            delete attrs.style
            Object.keys(attrs).forEach(key => {
                node.attr(key, attrs[key])
            })

            const styles = otherNode.css()
            Object.keys(styles).forEach(key => {
                node.css(key, styles[key])
            })
            tempNode = node
        }else{
            tempNode = wrapMarkNode(node, otherNode)
        }
        return warpNode(tempNode)
    } 
    // 其它情况
    const shadowNode = node.clone(false)
    node.after(shadowNode)
    otherNode.append(node)
    return shadowNode.replaceWith(otherNode)
}