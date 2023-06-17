import getNodeModel from '../models/node'
import { walkTree,isEmptyNode,getDocument } from '../utils/node'
import { upRange,createBookmark,enlargeRange } from '../utils/range'
import { LAKE_ELEMENT,ANCHOR_SELECTOR,FOCUS_SELECTOR } from '../constants/bookmark'
import { getClosest,removeEmptyMarks,canRemoveMark } from './utils'
import { CARD_SELECTOR,CARD_TYPE_KEY } from '../constants/card'

// 添加子节点，同时移除空 mark 标签
const appendChildNodes = (node, otherNode) => {
    const children = []
    let child = otherNode.first()
  
    while (child) {
      const next = child.next()
      children.push(child)
      node.append(child)
      child = next
    }
    return children
} 

// 生成 cursor 左侧或右侧的节点，放在一个和父节点一样的容器里
const createSideNodes = (parent, cursorName, scanOrder) => {
    const container = parent.clone(true)
    const cursor = getNodeModel("[".concat(LAKE_ELEMENT, "=").concat(cursorName, "]"), container[0])
    let isRemove = false 
    // 删除一边的节点
    walkTree(container[0], node => {
      node = getNodeModel(node)
      if (node[0] === cursor[0]) {
        cursor.remove()
        isRemove = true
        return
      }
      if(isRemove)
        node.remove()
    }, scanOrder)
    return container
} 

// 生成 anchor 和 focus 中间的节点，放在一个和父节点一样的容器里
const createCenterNodes = parent => {
    const container = parent.clone(true)
    const anchor = getNodeModel(ANCHOR_SELECTOR, container[0])
    const focus = getNodeModel(FOCUS_SELECTOR, container[0]) 
    // 删除右侧
    let isRemove = false
    walkTree(container[0], node => {
      node = getNodeModel(node)
      if (node[0] === focus[0]) {
        focus.remove()
        isRemove = true
        return
      }
      if(isRemove)
        node.remove()
    }, true) 

    // 删除左侧
    isRemove = false
    walkTree(container[0], node => {
      node = getNodeModel(node)
      if (node[0] === anchor[0]) {
        anchor.remove()
        isRemove = true
        return
      }
  
      if(isRemove)
        node.remove()
    }, false)
    return container
} 

// <p>foo<strong><em>wo<cursor />rd</em></strong>bar</p>
// to
// <p>foo<strong><em>wo</em></strong><cursor /><strong><em>rd</em></strong>bar</p>
const splitMarkAtCollapsedRange = (range, mark) => {
    upRange(range)
    const startContainer = getNodeModel(range.startContainer) 
    const card = startContainer.isCard() ? startContainer : startContainer.closest(CARD_SELECTOR)
    if (!(card.length > 0 && card.attr(CARD_TYPE_KEY) === 'inline') && (startContainer.isMark() || startContainer.parent().isMark())) {
      // 获取上面第一个非样式标签
      const parent = getClosest(startContainer)
      // 插入范围的开始和结束标记
      createBookmark(range) 
      // 子节点分别保存在两个变量
      const left = createSideNodes(parent.clone(true), 'cursor', true)
      const right = createSideNodes(parent.clone(true), 'cursor', false) 
      // 删除空标签
      removeEmptyMarks(left[0])
      removeEmptyMarks(right[0], node => {
        node = getNodeModel(node)
        return !mark || canRemoveMark(node, mark)
      }) 
      // 清空原父容器，用新的内容代替
      parent.empty()
      const leftNodes = appendChildNodes(parent, left)
      const rightNodes = appendChildNodes(parent, right)
      const emptyNode = getNodeModel("@\u200B")
      // 重新设置范围
      if (rightNodes.length > 0) {
        let rightContainer = rightNodes[0]
        // 右侧没文本
        if (isEmptyNode(rightContainer[0])) {
          while (rightContainer.first() && !rightContainer.first().isText()) {
            rightContainer = rightContainer.first()
          }
  
          if (rightContainer.isText()) {
            rightContainer.before(emptyNode)
          } else {
            rightContainer.prepend(emptyNode)
          } 
        } else {
          // 右侧有文本
          rightContainer.before(emptyNode)
        }
        range.selectNode(emptyNode[0])
        range.collapse(false)
      } else if (leftNodes.length > 0) {
          const leftContainer = leftNodes[leftNodes.length - 1]
          leftContainer.after(emptyNode)
          range.selectNode(emptyNode[0])
          range.collapse(false)
      } else {
          range.selectNodeContents(parent[0])
          range.collapse(true)
      }
    }
}

// <p>foo<strong><em>w<anchor />or<focus />d</em></strong>bar</p>
// to
// <p>foo<strong><em>w</em></strong><anchor /><strong><em>or</em></strong><focus /><strong><em>d</em></strong>bar</p>
const splitMarkAtExpandedRange = (range, mark) => {
    enlargeRange(range)
    const startContainer = getNodeModel(range.startContainer)
    const endContainer = getNodeModel(range.endContainer)
    const cardStart = startContainer.isCard() ? startContainer : startContainer.closest(CARD_SELECTOR)
    const cardEnd = endContainer.isCard() ? endContainer : endContainer.closest(CARD_SELECTOR)
    if(!(cardStart.length > 0 && "inline" === cardStart.attr(CARD_TYPE_KEY) || cardEnd.length > 0 && "inline" === cardEnd.attr(CARD_TYPE_KEY))){
      if (getClosest(startContainer)[0] !== getClosest(endContainer)[0]) {
          const startRange = range.cloneRange()
          startRange.collapse(true)
          splitMarkAtCollapsedRange(startRange, mark)
          range.setStart(startRange.startContainer, startRange.startOffset)
          const endRange = range.cloneRange()
          endRange.collapse(false)
          splitMarkAtCollapsedRange(endRange, mark)
          range.setEnd(endRange.startContainer, endRange.startOffset)
          return
      } 
      // 节点不是样式标签，文本节点时判断父节点
      const startIsMark = startContainer.isMark() || startContainer.parent().isMark()
      const endIsMark = endContainer.isMark() || endContainer.parent().isMark() 
      // 不是样式标签，无需分割
      if (!startIsMark && !endIsMark) {
        return
      } 
      // 获取上面第一个非样式标签
      let ancestor = getNodeModel(range.commonAncestorContainer)
      if (ancestor.isText()) {
        ancestor = ancestor.parent()
      }
    
      const parent = getClosest(ancestor) 
      // 插入范围的开始和结束标记
      createBookmark(range)
      // 子节点分别保存在两个变量
      const left = createSideNodes(parent.clone(true), 'anchor', true)
      const center = createCenterNodes(parent.clone(true))
      const right = createSideNodes(parent.clone(true), 'focus', false) 
      // 删除空标签
      removeEmptyMarks(left[0])
      removeEmptyMarks(right[0]) 
      // 清空原父容器，用新的内容代替
      parent.empty()
      appendChildNodes(parent, left)
      const centerNodes = appendChildNodes(parent, center)
      appendChildNodes(parent, right) 
      // 重新设置范围
      range.setStartBefore(centerNodes[0][0])
      range.setEndAfter(centerNodes[centerNodes.length - 1][0])
    }
}
// <p><anchor /><em>wo<focus />rd</em></p>
// to
// <p><anchor /><em>wo</em><focus /><em>rd</em></p>
export default (range, mark) => {
    const doc = getDocument(range.startContainer)
    if (typeof mark === 'string') {
      mark = getNodeModel(mark, doc)
    }
    // 折叠状态
    if (range.collapsed) {
      splitMarkAtCollapsedRange(range, mark)
      return range
    } 
    // 展开状态
    splitMarkAtExpandedRange(range, mark)
    return range
}