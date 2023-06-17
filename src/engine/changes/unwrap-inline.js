import splitMark from './split-mark'
import { getActiveInlines,unwrapNode } from './utils'
import { createBookmark,moveToBookmark } from '../utils/range'
import mergeMark from './merge-mark'

export default range => {
    splitMark(range)
    const inlineNodes = getActiveInlines(range)
    // 清除 Inline
    const bookmark = createBookmark(range)
    inlineNodes.forEach(node => {
        unwrapNode(node[0])
    })
    moveToBookmark(range, bookmark)
    mergeMark(range)
    return range
}