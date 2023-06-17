import getNodeModel from '../models/node'
import { getDocument } from '../utils/node'
import deleteContent from './delete-content'
import { addOrRemoveBr } from './utils'
import insertNode from './utils/insert-node'

export default (range, mark) => {
    const doc = getDocument(range.startContainer)
  
    if (typeof mark === 'string') {
        mark = getNodeModel(mark, doc)
    } 
    // 范围为折叠状态时先删除内容
    if (!range.collapsed) {
        deleteContent(range)
    } 
    // 插入新 Mark
    insertNode(range, mark)
    addOrRemoveBr(range)
    range.selectNode(mark[0])
    range.collapse(false)
    return range
}