import getNodeModel from '../models/node'
import { createBookmark,moveToBookmark } from '../utils/range'
import { getRangeBlocks,mergeNode } from '../changes/utils'

export default function(range) {
    const blocks = getRangeBlocks(range)
    if (0 === blocks.length) return range
    const lakeEngine = blocks[0].closest(".lake-engine")
    const blockquote = lakeEngine.find("blockquote")
    if (blockquote[0]) {
        const bookmark = createBookmark(range)
        const node = getNodeModel(blockquote[0])
        let nextNode = node.next()
        while (nextNode) {
            const prevNode = nextNode.prev()
            if("blockquote" === nextNode.name && nextNode.name === prevNode.name && nextNode.attr("class") === prevNode.attr("class")){
                mergeNode(prevNode, nextNode)
            }
            nextNode = nextNode.next()
        }
        moveToBookmark(range, bookmark)
        return range
    }
}