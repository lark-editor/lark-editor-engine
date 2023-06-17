import getNodeModel from '../../models/node'
import { shrinkRange } from '../../utils/range'

export default (range, node) => {
    node = getNodeModel(node)
    range.insertNode(node[0])
    range.selectNodeContents(node[0])
    shrinkRange(range)
    range.collapse(false)
    return range
}