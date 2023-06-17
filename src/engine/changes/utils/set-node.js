import getNodeModel from '../../models/node'
export default (node, otherNode) => {
    node = getNodeModel(node)
    otherNode = getNodeModel(otherNode).clone(false)
    let child = node.first()
  
    while (child) {
        const next = child.next()
        otherNode.append(child)
        child = next
    }
  
    return node.replaceWith(otherNode)
}