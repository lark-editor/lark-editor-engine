import getNodeModel from '../models/node'
import { CARD_KEY } from '../constants/card'

export const getCardRoot = node => {
    node = getNodeModel(node)
    while (node) {
        if (node.isRoot()) 
            return
        if (node.attr(CARD_KEY)) 
            return node
        node = node.parent()
    }
}