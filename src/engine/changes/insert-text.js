import { getDocument } from '../utils/node'
import deleteContent from './delete-content'
import { addOrRemoveBr } from './utils'
import insertNode from './utils/insert-node'
export default (range, text) => {
    const doc = getDocument(range.startContainer)
    // 范围为折叠状态时先删除内容
    if (!range.collapsed) {
        deleteContent(range)
    }
  
    const node = doc.createTextNode(text)
    range = insertNode(range, node)
    addOrRemoveBr(range)
    return range
}