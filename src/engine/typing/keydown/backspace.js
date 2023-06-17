import { isEmptyNode,isEmptyNodeWithTrim } from '../../utils/node'
import getNodeModel from '../../models/node'
import { shrinkRange,createBookmark,moveToBookmark,getPrevNode } from '../../utils/range'
import { unwrapNode,mergeNode,addOrRemoveBr,getClosestBlock,isBlockFirstOffset } from '../../changes/utils'
import { CARD_KEY,CARD_TYPE_KEY,CARD_LEFT_SELECTOR,CARD_RIGHT_SELECTOR,CARD_SELECTOR } from '../../constants/card'
// 删除节点，删除后如果是空段落，自动添加 BR
const removeNode = function(range, node) {
    const parent = node.parent()
    node.remove()
    if (isEmptyNode(parent)) {
        if (parent.isRoot()) {
            parent.html('<p><br /></p>')
            range.selectNodeContents(parent[0])
            shrinkRange(range)
            range.collapse(false)
        } else {
            parent.html('<br />')
            range.selectNodeContents(parent[0])
            range.collapse(false)
        }
        this.change.select(range)
    }
    this.history.save()
}
  
const unwrapBlockNode = function(range, block) {
    if (!block.isEditable() || block.isTable()) {
        return
    }
  
    const bookmark = createBookmark(range)
    unwrapNode(block)
    moveToBookmark(range, bookmark)
    this.change.select(range)
    this.history.save()
}
  
const mergeBlockNode = function(range, block) {
    // <p><br />foo</p>，先删除 BR
    if (block.children().length > 1 && block.first().name === 'br') {
        block.first().remove()
        this.history.save()
        return false
    }
  
    let prevBlock = block.prev()
    // 前面没有 DOM 节点          
    if (!prevBlock) {
        if (block.parent().isTable() && block.parent().html().trim() === '<p><br></p>') {
            return false
        }
    
        if (block.parent().isEditable()) {
            unwrapBlockNode.call(this, range, block)
        }
        return false
    } 
    // 前面是卡片
    if (prevBlock.attr(CARD_KEY)) {
        this.card.focus(range, prevBlock)
        this.change.select(range)
        this.history.save()
        return false
    } 
    // 前面是 void 节点
    if (prevBlock.isVoid()) {
        prevBlock.remove()
        this.history.save()
        return false
    } 
    // 前面是空段落
    if (prevBlock.isHeading() && isEmptyNode(prevBlock)) {
        prevBlock.remove()
        this.history.save()
        return false
    }
  
    this.history.stop() 
    // 前面是文本节点
    if (prevBlock.isText()) {
        const paragraph = getNodeModel('<p />')
        prevBlock.before(paragraph)
        paragraph.append(prevBlock)
        prevBlock = paragraph
    }
    if (['ol', 'ul'].indexOf(prevBlock.name) >= 0) {
        prevBlock = prevBlock.last()
    } 
    // 只有一个 <br /> 时先删除
    if (block.children().length === 1 && block.first().name === 'br') {
        block.first().remove()
    } else if (prevBlock) {
        if (prevBlock.children().length === 1 && prevBlock.first().name === 'br') {
            prevBlock.first().remove()
        }
    }
  
    if (!prevBlock || prevBlock.isText()) {
        unwrapBlockNode.call(this, range, block)
    } else {
        const bookmark = createBookmark(range)
        mergeNode(prevBlock, block)
        moveToBookmark(range, bookmark)
        this.change.select(range)
        this.change.mergeMark()
        this.change.mergeAdjacentList()
    }
    this.history.save()
    return false
} 

// 焦点移动到前一个 Block
const focusPrevBlock = function(range, block, removeEmpty) {
    let prevBlock = block.prev()
    if (!prevBlock) {
        return
    } 
    // 前面是卡片
    if (prevBlock.attr(CARD_KEY)) {
        this.card.focus(range, prevBlock)
        return
    } 
    // 前面是列表
    if (['ol', 'ul'].indexOf(prevBlock.name) >= 0) {
        prevBlock = prevBlock.last()
    }
  
    if (!prevBlock) {
        return
    }
  
    if (removeEmpty && isEmptyNodeWithTrim(prevBlock[0])) {
        prevBlock.remove()
        this.history.save()
        return
    }
  
    range.selectNodeContents(prevBlock[0])
    range.collapse(false)
    this.change.select(range)
} 
// 卡片
const backspaceCard = function(e, range, cardRoot) {
    if (cardRoot.attr(CARD_TYPE_KEY) === 'inline') {
        // 左侧光标
        const cardLeft = getNodeModel(range.startContainer).closest(CARD_LEFT_SELECTOR)
    
        if (cardLeft.length > 0) {
            range.selectNode(cardRoot[0])
            range.collapse(true)
            this.change.select(range)
        } 
        // 右侧光标
        const cardRight = getNodeModel(range.startContainer).closest(CARD_RIGHT_SELECTOR)
    
        if (cardRight.length > 0) {
            e.preventDefault()
            this.change.removeCard(cardRoot)
            addOrRemoveBr(range)
            return false
        }
    } else {
        // 左侧光标
        const cardLeft = getNodeModel(range.startContainer).closest(CARD_LEFT_SELECTOR)
        if (cardLeft.length > 0) {
            e.preventDefault()
            if (cardRoot.parent().isEditable()) {
                unwrapBlockNode.call(this, range, cardRoot.parent())
            } else {
                focusPrevBlock.call(this, range, cardRoot, true)
            }
            return false
        } 
        // 右侧光标
        const cardRight = getNodeModel(range.startContainer).closest(CARD_RIGHT_SELECTOR)
    
        if (cardRight.length > 0) {
            e.preventDefault()
            focusPrevBlock.call(this, range, cardRoot, false)
            this.change.removeCard(cardRoot)
            return false
        }
    }
} 
// 后退键
export default function(e){
    const range = this.change.getRange()
    // 在卡片里
    const cardRoot = this.card.closest(range.startContainer)
  
    if (cardRoot) {
        if (backspaceCard.call(this, e, range, cardRoot) === false) {
            return false
        }
    } 
    // 没有可编辑的文本
    if (this.change.isEmpty()) {
        e.preventDefault()
        this.change.setValue('<p><br /><cursor /></p>')
        return false
    }

    let block = getClosestBlock(range.startContainer) 
    // 表格
    if (block.isTable() && isEmptyNodeWithTrim(block)) {
        e.preventDefault()
        block.html('<p><br /></p>')
        range.selectNode(block[0])
        shrinkRange(range)
        range.collapse(false)
        this.change.select(range)
        return false
    } 
    // 范围为展开状态
    if (!range.collapsed) {
        e.preventDefault()
        this.change.deleteContent()
        return false
    } 
    // 光标前面有卡片时
    const prevNode = getPrevNode(range)
  
    if (prevNode && prevNode.attr(CARD_KEY) && prevNode.attr(CARD_KEY) !== 'checkbox') {
        e.preventDefault()
        this.change.removeCard(prevNode)
        return false
    } 
    // 光标前面有空 block，<h1><li><br /></li><cursor /></h1>
    if (prevNode && prevNode.isBlock() && isEmptyNodeWithTrim(prevNode)) {
        e.preventDefault()
        removeNode.call(this, range, prevNode)
        return false
    } 
    // 光标不在段落开始位置时，走浏览器默认行为
    if (!isBlockFirstOffset(range, 'start')) {
        return
    }
    // 处理 BR
    const container = getNodeModel(range.startContainer)
    const offset = range.startOffset
  
    if (container.isRoot()) {
        const child = container[0].childNodes[offset - 1]
        if (child && getNodeModel(child).name === 'br') {
            e.preventDefault()
            getNodeModel(child).remove()
            this.history.save()
            return false
        }
    } 
    // 改变对齐
    const align = this.command.queryState('alignment')
    if (align === 'center') {
        e.preventDefault()
        this.command.execute('alignment', 'left')
        return false
    }
  
    if (align === 'right') {
        e.preventDefault()
        this.command.execute('alignment', 'center')
        return false
    } 
    // 减少缩进
    if (this.command.queryState('indent')) {
        e.preventDefault()
        this.command.execute('outdent')
        return false
    } 
    // 在列表里
    if (['ol', 'ul'].indexOf(block.name) >= 0) {
        // 矫正这种情况，<ol><cursor /><li>foo</li></ol>
        const firstLi = block.first()
    
        if (firstLi && !firstLi.isText()) {
            block = firstLi
            range.setStart(block[0], 0)
            range.collapse(true)
            this.change.select(range)
        } else {
            // <ol><cursor />foo</ol>
            e.preventDefault()
            return mergeBlockNode.call(this, range, block)
        }
    }
  
    if (block.name === 'li') {
        if (block.find('[data-lake-card=checkbox]').length > 0) {
            return
        }
    
        e.preventDefault()
        const listRoot = block.closest('ul,ol')
    
        if (block.parent().isRoot()) {
            // <p>foo</p><li><cursor />bar</li>
            return mergeBlockNode.call(this, range, block)
        }
    
        if (listRoot.length > 0) {
            this.command.execute('list', listRoot.name === 'ol' ? 'orderedlist' : 'unorderedlist')
        } else {
            // <p><li><cursor />foo</li></p>
            unwrapBlockNode.call(this, range, block)
        }
    
        return false
    } 
    // 引用
    const parentBlock = block.parent()
  
    if (parentBlock && parentBlock.name === 'blockquote' && block.isHeading()) {
        e.preventDefault()
        if(block.prevElement()){
            return mergeBlockNode.call(this, range, block)
        }else{
            this.change.unwrapBlock('<blockquote />')
            return false
        }
        
    } 
    if(parentBlock.isTitle() && isEmptyNodeWithTrim(block)){
        e.preventDefault()
        this.change.setBlocks("<p />")
        return false
    }

    // 在标题、正文里
    if (block.isHeading()) {
        e.preventDefault()
        return mergeBlockNode.call(this, range, block)
    } 
    // 其它段落
    if (['li', 'td', 'th'].indexOf(block.name) < 0) {
        e.preventDefault()
        this.change.setBlocks('<p />')
        return false
    }
}