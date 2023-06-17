import { getActiveMarks,mergeNode,addOrRemoveBr } from './utils'
import { equalNode } from '../utils/node'
import { shrinkRange,createBookmark,moveToBookmark } from '../utils/range'

export default range => {
    const marks = getActiveMarks(range)
  
    if (marks.length === 0) {
        return range
    }
  
    const targetMarks = [marks[0]]
    if (marks.length > 1) {
        targetMarks.push(marks.pop())
    }
  
    targetMarks.forEach(mark => {
        const prevMark = mark.prev()
        const nextMark = mark.next()
    
        if (prevMark && equalNode(prevMark[0], mark[0])) {
            shrinkRange(range)
            const bookmark = createBookmark(range)
            mergeNode(prevMark, mark)
            moveToBookmark(range, bookmark)
            // 原来 mark 已经被移除，重新指向
            mark = prevMark
        }
    
        if (nextMark && equalNode(nextMark[0], mark[0])) {
            shrinkRange(range)
            const _bookmark = createBookmark(range)
            mergeNode(mark, nextMark)
            moveToBookmark(range, _bookmark)
        }
    })
    addOrRemoveBr(range)
    return range
}