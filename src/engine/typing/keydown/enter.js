import getNodeModel from '../../models/node'
import { CARD_TYPE_KEY,CARD_LEFT_SELECTOR,CARD_RIGHT_SELECTOR } from '../../constants/card'
import { getClosestBlock,isBlockLastOffset,isBlockFirstOffset , unwrapNode} from '../../changes/utils'
import { createBookmark,moveToBookmark , scrollIntoView } from '../../utils/range'
// 插入空 block
const insertEmptyBlock = function(range, block) {
    block = getNodeModel(block)
    const activeBlocks = this.change.blocks || []
    const activeMarks = this.change.marks || []
    this.history.stop()
    this.change.insertBlock(block)
    if (activeBlocks[0]) {
        const styles = activeBlocks[0].css()
        block.css(styles)
    }

    let node = block.find('br')
    activeMarks.forEach(mark => {
        // 行内代码文本样式，回撤后，默认还是代码文本样式
        if (mark.name === 'code') {
            return
        }
        mark = mark.clone()
        node.before(mark)
        mark.append(node)
        node = mark
    })
    range.selectNode(block.find('br')[0])
    range.collapse(false)
    scrollIntoView(range)
    this.history.save()
} 
// 在卡片前后插入新段落
const insertNewlineForCard = function(range, cardRoot, before) {
    this.history.stop()
    range.selectNode(cardRoot[0])
    range.collapse(!!before)
    this.change.select(range)
    const block = getNodeModel('<p><br /></p>')
    this.change.insertBlock(block)
  
    if (before) {
        this.card.focus(range, cardRoot, true)
    } else {
        range.selectNodeContents(block[0])
        range.collapse(false)
    }
    this.change.select(range)
    this.history.save()
} 
// 卡片
const enterCard = function(e, range, cardRoot) {
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
            range.selectNode(cardRoot[0])
            range.collapse(false)
            this.change.select(range)
        }
    } else {
        // 左侧光标
        const cardLeft = getNodeModel(range.startContainer).closest(CARD_LEFT_SELECTOR)
        if (cardLeft.length > 0) {
            e.preventDefault()
            insertNewlineForCard.call(this, range, cardRoot, true)
            return false
        } 
        // 右侧光标
        const cardRight = getNodeModel(range.startContainer).closest(CARD_RIGHT_SELECTOR)
        if (cardRight.length > 0) {
            e.preventDefault()
            insertNewlineForCard.call(this, range, cardRoot, false)
            return false
        }
    }
} 

function insertOrSplit(range, block) {
    if(isBlockLastOffset(range, "end") || block.children().length === 1 && "br" === block.first().name){
        insertEmptyBlock.call(this, range, "<p><br /></p>")
    }else{
        this.change.splitBlock()
    }
}
// 回车键
export default function(e) {
    const range = this.change.getRange() 
    // 卡片
    const cardRoot = this.card.closest(range.startContainer)
    if (cardRoot && enterCard.call(this, e, range, cardRoot) === false) {
        return false
    }
    let block = getClosestBlock(range.endContainer) 
    // 无段落
    if (block.isRoot() || block.isTable()) {
        this.change.wrapBlock('<p />')
        block = getClosestBlock(range.endContainer)
    } 
    // 嵌套 block
    const parentBlock = block.parent()
    if (parentBlock && parentBlock.isEditable() && parentBlock.isBlock()) {
        if ("blockquote" === parentBlock.name && "p" === block.name && block.nextElement()){
            e.preventDefault()
            insertOrSplit.call(this, range, block)
            return false
        }
        if ("li" === parentBlock.name && "p" === block.name) {
            if(1 === block.children().length && "br" === block.first().name){
                block.first().remove()
            }
            const bookmark = createBookmark(range)
            unwrapNode(block)
            moveToBookmark(range,bookmark)
            block = getClosestBlock(range.endContainer)
        }
        
        if (range.collapsed && isBlockLastOffset(range, 'end') && isBlockFirstOffset(range, 'end')) {
            e.preventDefault()
            this.history.stop()
    
            if (['li', 'td', 'th'].indexOf(parentBlock.name) >= 0) {
                this.change.unwrapBlock("<".concat(parentBlock.name, " />"))
                this.change.setBlocks("<".concat(parentBlock.name, " />"))
            } else {
                this.change.unwrapBlock("<".concat(parentBlock.name, " />"))
                this.change.setBlocks('<p />')
            }
            this.history.save()
            return false
        }
    } 
    // 标题、正文
    if (block.isHeading()) {
        e.preventDefault()
        insertOrSplit.call(this,range,block)
        return false
    } 
    // 列表
    if (block.name === 'li') {
        if (block.find('[data-lake-card=checkbox]').length > 0) {
            return
        }
        e.preventDefault()
        this.history.stop()
        // <li>foo<cursor /><li>
        if (isBlockLastOffset(range, 'end')) {
            // <li><cursor /><li>
            if (range.collapsed && isBlockFirstOffset(range, 'end')) {
                const listRoot = block.closest('ul,ol')
                this.change.unwrapBlock("<".concat(listRoot.name, " />"))
                this.change.setBlocks('<p />')
            } else {
                const li = getNodeModel('<li><br /></li>')
                li.attr(block.attr())
                insertEmptyBlock.call(this, range, li)
            }
        } else {
            this.change.splitBlock()
        }
        this.change.mergeAdjacentList()
        scrollIntoView(range)
        this.history.save()
        return false
    }
}