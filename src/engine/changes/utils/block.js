import getNodeModel from '../../models/node'
import { isEmptyNode,walkTree } from '../../utils/node'
import { shrinkRange,downRange,createBookmark } from '../../utils/range'
import { CARD_SELECTOR,CARD_KEY,READY_CARD_KEY } from '../../constants/card'
import { CURSOR_SELECTOR,LAKE_ELEMENT } from '../../constants/bookmark'
import { INDENT_KEY } from '../../constants/indent'

// 获取最近的 Block 节点，找不到则返回 node
export const getClosestBlock = node => {
    node = getNodeModel(node);
    const originNode = node
    while (node) {
        if (node.isRoot() || node.isBlock()) {
            return node
        }
        node = node.parent()
    }
  
    return originNode
} 

// 判断范围的 edge 是否在 Block 的开始位置
// edge = start：开始位置
// edge = en：结束位置
export const isBlockFirstOffset = (range, edge) => {
    const container = getNodeModel(range["".concat(edge, "Container")])
    const offset = range["".concat(edge, "Offset")]
    const newRange = range.cloneRange()
    const block = getClosestBlock(container)
    newRange.selectNodeContents(block[0])
    newRange.setEnd(container[0], offset)
    const fragment = newRange.cloneContents()

    if (!fragment.firstChild) {
        return true
    }

    if (fragment.childNodes.length === 1 && getNodeModel(fragment.firstChild).name === 'br') {
        return true
    }

    const node = getNodeModel('<div />')
    node.append(fragment)

    return isEmptyNode(node[0])
} 

// 判断范围的 edge 是否在 Block 的最后位置
// edge = start：开始位置
// edge = en：结束位置
export const isBlockLastOffset = (range, edge) => {
    const container = getNodeModel(range["".concat(edge, "Container")])
    const offset = range["".concat(edge, "Offset")]
    const newRange = range.cloneRange()
    const block = getClosestBlock(container)
    newRange.selectNodeContents(block[0])
    newRange.setStart(container[0], offset)
    const fragment = newRange.cloneContents()

    if (!fragment.firstChild) {
        return true
    }

    const node = getNodeModel('<div />')
    node.append(fragment)

    return !(node.find('br').length > 0) && isEmptyNode(node[0])
} 

// 获取范围内的所有 Block
export const getRangeBlocks = range => {
    const dupRange = range.cloneRange()
    shrinkRange(dupRange)
    downRange(dupRange)
    const startBlock = getClosestBlock(dupRange.startContainer)
    const endBlock = getClosestBlock(dupRange.endContainer)
    const ancestor = dupRange.commonAncestorContainer
    const closestBlock = getClosestBlock(ancestor)
    const blocks = [];
    let started = false;
    walkTree(closestBlock[0],node => {
        node = getNodeModel(node)
        if (node[0] === startBlock[0]) {
            started = true
        }
        if (started && node.isBlock() && !node.isCard() && node.isEditable()) {
            blocks.push(node)
        }
        if (node[0] === endBlock[0]) {
            started = false
            return false
        }
    })
    // 未选中文本时忽略该 Block
    // 示例：<h3><anchor />word</h3><p><focus />another</p>
    if (blocks.length > 1 && isBlockFirstOffset(dupRange, 'end')) {
        blocks.pop()
    }
    return blocks
} 

// 获取对范围有效果的所有 Block
export const getActiveBlocks = range => {
    range = range.cloneRange()
    shrinkRange(range)
    const sc = range.startContainer
    const so = range.startOffset
    const ec = range.endContainer
    const eo = range.endOffset
    let startNode = sc
    let endNode = ec

    if (sc.nodeType === Node.ELEMENT_NODE) {
        if (sc.childNodes[so]) {
            startNode = sc.childNodes[so] || sc
        }
    }

    if (ec.nodeType === Node.ELEMENT_NODE) {
        if (eo > 0 && ec.childNodes[eo - 1]) {
            endNode = ec.childNodes[eo - 1] || sc
        }
    } 
    // 折叠状态时，按右侧位置的方式处理
    if (range.collapsed) {
        startNode = endNode
    } 
    // 不存在时添加
    const addNode = (nodes, nodeB,preppend) => {
        if (!nodes.some(nodeA => {
            return nodeA[0] === nodeB[0]
        })) {
            if (preppend) {
              nodes.unshift(nodeB)
            } else {
              nodes.push(nodeB)
            }
        }
    }
    // 向上寻找
    const findNodes = node => {
        node = getNodeModel(node)
        const nodes = []
        while (node) {
            if (node.isRoot()) {
                break
            }
            if (node.isBlock()) {
                nodes.push(node)
            }
            node = node.parent()
        }
        return nodes
    }

    const nodes = getRangeBlocks(range)
    // rang头部应该往数组头部插入节点
    findNodes(startNode).forEach(node => {
        return addNode(nodes, node,true)
    })

    if (!range.collapsed) {
        findNodes(endNode).forEach(node => {
            return addNode(nodes, node)
        })
    }
    return nodes
} 

// 生成 cursor 左侧或右侧的节点，放在一个和父节点一样的容器里
// isLeft = true：左侧
// isLeft = false：右侧
export const createSideBlock = _ref => {
    let block = _ref.block,
        range = _ref.range,
        isLeft = _ref.isLeft,
        clone = _ref.clone

    block = getNodeModel(block)
    const newRange = block.doc.createRange()

    if (isLeft) {
        newRange.selectNodeContents(block[0])
        newRange.setEnd(range.startContainer, range.startOffset)
    } else {
        newRange.selectNodeContents(block[0])
        newRange.setStart(range.endContainer, range.endOffset)
    }

    const fragement = clone ? newRange.cloneContents() : newRange.extractContents()
    const dupBlock = block.clone(false)
    dupBlock.append(fragement)
    if (clone) {
        dupBlock.find(CARD_SELECTOR).each(cardRoot => {
            cardRoot = getNodeModel(cardRoot)
            var name = cardRoot.attr(CARD_KEY)
            cardRoot.attr(READY_CARD_KEY, name)
            cardRoot.removeAttr(CARD_KEY)
        })
    }
    return dupBlock
} 

// 获取 Block 左侧文本
export const getBlockLeftText = (block, range) => {
    const leftBlock = createSideBlock({
        block: block,
        range: range,
        isLeft: true,
        clone: true
    })
    return leftBlock.text().trim()
} 

// 删除 Block 左侧文本
export const removeBlockLeftText = (block, range) => {
    block = getNodeModel(block)
    createBookmark(range)
    const cursor = block.find(CURSOR_SELECTOR)
    let isRemove = false 
    // 删除左侧文本节点
    walkTree(block[0],node => {
        node = getNodeModel(node)
        if (node[0] === cursor[0]) {
            cursor.remove()
            isRemove = true
            return
        }
        if (isRemove && node.isText()) {
            node.remove()
        }
    }, false)
} 

// 输入内容时，删除浏览器生成的 BR 标签，对空 block 添加 BR
// 删除场景
// <p><br />foo</p>
// <p>foo<br /></p>
// 保留场景
// <p><br /><br />foo</p>
// <p>foo<br /><br /></p>
// <p>foo<br />bar</p>
// 添加场景
// <p></p>

export const addOrRemoveBr = (range,align) => {
    const block = getClosestBlock(range.commonAncestorContainer)
    block.find('br').each(function (br) {
        br = getNodeModel(br)
        if ((!br.prev() || br.prev().attr(CARD_KEY) === 'checkbox') && br.next() && br.next().name !== 'br' && br.next().attr(LAKE_ELEMENT) !== 'cursor' || !br.next() && br.prev() && br.prev().name !== 'br') {
            if ("left" === align && br.prev() && "checkbox" !== br.prev().attr(CARD_KEY)) 
                return
            br.remove()
        }
    });

    if (!block.first() || block.children().length === 1 && block.first().attr(CARD_KEY) === 'checkbox') {
        block.append('<br />')
        return;
    }

    if (block.children().length === 2 && block.first().attr(CARD_KEY) === 'checkbox' && block.last().attr(LAKE_ELEMENT) === 'cursor') {
        block.first().after('<br />')
    }
} 

// ol 添加 start 属性
// 有序列表序号修正策略：连续的列表会对有序列表做修正，不连续的不做修正
export const addListStartNumber = range => {
    let block;
    if(["ol", "ul"].includes(range.name)){
        block = range
    }else{
        const blocks = getRangeBlocks(range)
        if (blocks.length === 0) 
            return range
        block = blocks[0].closest('ul,ol')
        if (!block[0]) 
            return range
    }
    const startIndent = parseInt(block.attr(INDENT_KEY), 10) || 0
    // 当前选区起始位置如果不是第一层级，需要向前遍历，找到各层级的前序序号
    // 直到遇到一个非列表截止，比如 p
    
    let startCache = [];
    let cacheIndent = startIndent
    let prevNode = block.prev()
    
    while (prevNode && ['ol', 'ul'].includes(prevNode.name)) {
        if (prevNode.name === 'ol') {
            const prevIndent = parseInt(prevNode.attr(INDENT_KEY), 10) || 0
            const prevStart = parseInt(prevNode.attr('start'), 10) || 1
            const len = prevNode.find('li').length
        
            if (prevIndent === 0) {
                startCache[prevIndent] = prevStart + len
                break
            } 
            if (prevIndent <= cacheIndent) {
                cacheIndent = prevIndent
                startCache[prevIndent] = startCache[prevIndent] || prevStart + len
            }
        }else
            cacheIndent = parseInt(prevNode.attr(INDENT_KEY), 10) || 0
        prevNode = prevNode.prev()
    }

    let nextNode = block
    while (nextNode) {
        if(['ol', 'ul'].includes(nextNode.name)){
            const nextIndent = parseInt(nextNode.attr(INDENT_KEY), 10) || 0
            const nextStart = parseInt(nextNode.attr('start'), 10)
            const _len = nextNode.find('li').length
        
            if (nextNode.name === 'ol') {    
                let currentStart = startCache[nextIndent]; 
                if(nextIndent > 0){
                    currentStart = currentStart || 1
                    if(currentStart > 1)
                        nextNode.attr("start",currentStart)
                    else
                        nextNode.removeAttr("start")
                    startCache[nextIndent] = currentStart + _len
                }else{
                    if(currentStart && currentStart !== nextStart){
                        if(currentStart > 1)
                            nextNode.attr("start",currentStart)
                        else
                            nextNode.removeAttr("start")
                        startCache[nextIndent] = currentStart + _len
                    }else{
                        startCache[nextIndent] = (nextStart || 1) + _len
                        startCache = startCache.slice(0,nextIndent + 1)
                    }
                }
            }
        }else
            startCache = []
       
        nextNode = nextNode.next()
    }
}

// br 换行改成段落
export const brToParagraph = block => {
    // 没有子节点
    if (!block.first()) {
        return
    } 
    // 只有一个节点
    if (block.children().length === 1) {
        return
    } 
    if (block.isTable())
        return
    if("li" === block.name)
        return
    // 只有一个节点（有光标标记节点）
    if (block.children().length === 2 && block.first().attr(LAKE_ELEMENT) === 'cursor' || block.last().attr(LAKE_ELEMENT) === 'cursor') {
        return
    }
  
    let container
    let prevContainer
    let node = block.first()
  
    while (node) {
        const next = node.next()
        if (!container || node.name === 'br') {
            prevContainer = container
            container = block.clone(false)
            block.before(container)
        }
        if (node.name !== 'br') {
            container.append(node)
        }
        if ((node.name === 'br' || !next) && prevContainer && !prevContainer.first()) {
            prevContainer.append('<br />')
        }
        node = next
    }
  
    if (container && !container.first()) {
        container.remove()
    }
    block.remove()
}