import getNodeModel from '../models/node'
import { getDocument } from '../utils/node'
import deleteContent from './delete-content'
import { addOrRemoveBr } from './utils'
import insertNode from './utils/insert-node'

export default (range, inline) => {
    const doc = getDocument(range.startContainer)
    if (typeof inline === 'string') {
        inline = getNodeModel(inline, doc)
    } 
    // 范围为折叠状态时先删除内容
    if (!range.collapsed) {
        deleteContent(range)
    } 
    // 插入新 Inline
    insertNode(range, inline)
  
    if (inline.name !== 'br') {
        addOrRemoveBr(range)
    }
  
    range.selectNode(inline[0])
    range.collapse(false)
    return range
}