import { getRangeBlocks,mergeNode,addListStartNumber } from './utils'
import { createBookmark,moveToBookmark } from '../utils/range'
import { isSameList } from '../utils/list'
  
export default range => {
    const blocks = getRangeBlocks(range)
    if (blocks.length === 0) {
        return range
    }

    blocks.forEach(block => {
        block = block.closest('ul,ol')
        if (block.name !== 'ol' && block.name !== 'ul') {
            return
        }
    
        const prevBlock = block.prev()
        const nextBlock = block.next()
    
        if (prevBlock && isSameList(prevBlock, block)) {
            const bookmark = createBookmark(range)
            mergeNode(prevBlock, block)
            moveToBookmark(range, bookmark) 
            // 原来 block 已经被移除，重新指向
            block = prevBlock
        }
    
        if (nextBlock && isSameList(nextBlock, block)) {
            const bookmark = createBookmark(range)
            mergeNode(block, nextBlock)
            moveToBookmark(range, bookmark)
        }
    })
    addListStartNumber(range)
    return range
}