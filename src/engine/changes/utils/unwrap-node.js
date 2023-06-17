import getNodeModel from '../../models/node'

export default node => {
    node = getNodeModel(node)[0]
    let child = node.firstChild
    while (child) {
        const next = child.nextSibling
        node.parentNode.insertBefore(child, node)
        child = next
    }
    node.parentNode.removeChild(node)
}