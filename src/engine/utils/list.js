import getNodeModel from '../models/node'
import { INDENT_KEY } from '../constants/indent'
import { unwrapNode,setNode,wrapNode } from '../changes/utils'
import { isEmptyNode } from '../utils/node'
import { removeUnit } from './string'

const typeTagMap = {
    orderedlist: 'ol',
    unorderedlist: 'ul',
    tasklist: 'ul'
}

const tagTypeMap = {
    ol: 'orderedlist',
    ul: 'unorderedlist'
}

const isSameList = (sourceNode, targetNode) => {
    if (sourceNode.name !== targetNode.name) return false
    if (isTaskListBlock(sourceNode) !== isTaskListBlock(targetNode)) return false
    const sourceIndent = parseInt(sourceNode.attr(INDENT_KEY), 10) || 0
    const targetIndent = parseInt(targetNode.attr(INDENT_KEY), 10) || 0
    return sourceIndent === targetIndent
}

const isAllListedByType = (blocks, listType) => {
    const tagName = typeTagMap[listType]
    let allListed = true
    blocks.forEach(listBlock => {
        switch (listBlock.name) {
            case 'li':
                if (listType === 'tasklist') {
                    allListed = allListed && isTaskListBlock(listBlock)
                } else {
                    allListed = allListed && !isTaskListBlock(listBlock)
                }
                break
            case 'p':
                if (listBlock.parent() && listBlock.parent().name !== 'li') {
                    allListed = false
                }
                break
            case tagName:
            case "blockquote":
                break
    
            default:
                allListed = false
                break
        }
    })
    return allListed
}
  
const getBlockType = block => {
    let name = block.name
    if (isTaskListBlock(block)) return "tasklist"
    if("li" === name && block.parent())
        name = block.parent().name
    return tagTypeMap[name] || ""
}
  
const getListType = blocks => {
    let listType = ''
    for (let i = 0; i < blocks.length; i++) {
        const tagName = blocks[i].name
        const parent = blocks[i].parent()
        let type = void 0
        switch (tagName) {
            case 'li':
            case 'ul':
            case 'ol':
                type = getBlockType(blocks[i])
            break;
            case "blockquote":
                break
            case 'p':
                if (parent && parent.name === 'li') {
                    type = getBlockType(parent)
                } else {
                    return ''
                }
                break
            default:
                return ''
        }
        if (listType && type && listType !== type) {
            return ''
        }
        listType = type
    }
    return listType
}
  
const isTaskListBlock = listBlock => {
    switch (listBlock.name) {
        case 'li':
            return isCheckbox(listBlock.first()) || listBlock.hasClass("lake-list-task")
    
        case 'ul':
            return listBlock.hasClass('lake-list')
    
        default:
            return false
    }
}
  
const cancelList = blocks => {
    let indent = 0
    const commonBlock = getNodeModel('<p />')
    blocks.forEach(listBlock => {
        clearTaskList(listBlock)
        if (['ul', 'ol'].includes(listBlock.name)) {
            indent = parseInt(listBlock.attr(INDENT_KEY), 10) || 0
            unwrapNode(listBlock)
        }
    
        if (listBlock.name === 'li') {
            const toBlock = commonBlock.clone(false)
            if (indent !== 0) {
                toBlock.css('padding-left', indent * 2 + 'em')
            }
            setNode(listBlock, toBlock)
        }
    })
}

const toCommonList = (blocks, listType, start) => {
    blocks.forEach(block => {
      toCommonListBlock(block, listType, start)
    })
}

const toTaskList = function(blocks, checked) {
    blocks.forEach(block => {
        if (!isTaskListBlock(block)) {
            toTaskListBlock.call(this, block, checked)
        }
    })
}
  
const toCommonListBlock = (listBlock, listType, start) => {
    const tagName = typeTagMap[listType]
    clearTaskList(listBlock)
    let indent
    const targetList = getNodeModel("<".concat(tagName, " />"))
    const listNode = getNodeModel('<li />')
  
    switch (listBlock.name) {
        case 'li':
        case tagName:
            return listBlock
    
        case 'ol':
        case 'ul':
            targetList.attr(listBlock.attr())
            listBlock = setNode(listBlock, targetList)
            return listBlock
    
        case 'p':
            if (listBlock.parent().name === 'li') {
                listBlock = unwrapNode(listBlock, '<p />')
                return
            }
    
            indent = removeUnit(listBlock.css('padding-left')) / 2
            listBlock = setNode(listBlock, listNode)
    
            if (indent) {
                targetList.attr(INDENT_KEY, indent)
            }
    
            if (start) {
                targetList.attr('start', start)
            }
    
            listBlock = wrapNode(listBlock, targetList)
            return listBlock
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
            listBlock = setNode(listBlock, listNode)
            listBlock = wrapNode(listBlock, targetList)
            return listBlock
        default:
            return listBlock
    }
}
  
const toTaskListBlock = function(listBlock, checked) {
    let indent
    const taskUl = getNodeModel('<ul class="lake-list"/>');
    const taskLi = getNodeModel('<li class="lake-list-node lake-list-task"/>')
  
    switch (listBlock.name) {
        case 'li':
            listBlock.addClass('lake-list-node')
            listBlock.addClass('lake-list-task')
            prependCheckbox.call(this, listBlock, checked)
            return listBlock
    
        case 'ul':
            listBlock.addClass('lake-list')
            return listBlock
    
        case 'ol':
            taskUl.attr(listBlock.attr())
            listBlock = setNode(listBlock, taskUl)
            return listBlock
    
        case 'p':
            indent = removeUnit(listBlock.css('padding-left')) / 2
            listBlock = setNode(listBlock, taskLi)
            prependCheckbox.call(this, listBlock, checked)
    
            if (indent) {
                taskUl.attr(INDENT_KEY, indent)
            }
    
            listBlock = wrapNode(listBlock, taskUl)
            return listBlock
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
            listBlock = setNode(listBlock, taskLi)
            prependCheckbox.call(this, listBlock, checked)
            listBlock = wrapNode(listBlock, taskUl)
            return listBlock
        default:
            return listBlock
    }
}

const clearTaskList = node => {
    switch (node.name) {
        case "li":
            node.removeClass("lake-list-node")
            node.removeClass("lake-list-task")
            removeCheckbox(node)
            return node
        case "ul":
            node.removeClass("lake-list")
            return node
        default:
            return node
    }
}
  
const isCheckbox = node => {
    if (!node || !node[0]) {
        return false
    }
    return node.isCard() && (node.attr('data-lake-card') === 'checkbox' || "checkbox" === node.attr("data-ready-card"))
} 

function removeCheckbox(node) {
    node.find("[data-lake-card=checkbox]").remove()
    node.find("[data-ready-card=checkbox]").remove()
}

// 节点里添加 checkbox
const prependCheckbox = function(node, checked) {
    node = getNodeModel(node)
  
    if (isCheckbox(node.first())) {
        return
    }
  
    const component = this.card.createComponent({
        name: 'checkbox',
        value: !!checked,
        engine: this
    })
    const nodeRange = document.createRange()
    nodeRange.selectNodeContents(node[0])
    nodeRange.collapse(true)
    this.card.insertNode(nodeRange, component)
}

const repairListblocks = (blocks, range) => {
    const newBlocks = []
    blocks.forEach((block, i) => {
        const parent = block.parent()
        if (block.name === 'p') {
            // <li><p>a</p></li> => <li>a</li>
            if (parent.name === 'li') {
                if (i === 0) {
                    newBlocks.push(parent)
                }
        
                unwrapNode(block, '<p />')
                return
            } 
            // <ul><p>a</p></ul> => <ul><li>a</li></ul>
            if (['ul', 'ol'].includes(parent.name)) {
                block = setNode(block, '<li />')
                newBlocks.push(block)
                return
            }
        }
    
        if (block.name === 'li') {
            // <li><li>a</li></li> => <li>a</li>
            if (parent.name === 'li') {
                if (i === 0) {
                    newBlocks.push(parent);
                }
        
                unwrapNode(block, '<li />');
                return
            }
        }
    
        if (['ul', 'ol'].includes(block.name)) {
            // <li><ul>...</ul></li> => <li>...</li>
            if (parent.name === 'li') {
                unwrapNode(block, "<".concat(block.name, " />"))
                return
            }
        }
    
        newBlocks.push(block)
    })
    // 最后一个 li 如果没选中内容，会在 getRangeBlocks 时抛弃掉，这里需要补回来
    const lastBlock = getNodeModel(range.endContainer).closest('li')
  
    if (!newBlocks.some(block => {
        return block[0] === lastBlock[0]
    })) {
        newBlocks.push(lastBlock)
    }
    return newBlocks
}

const repairListStylePosition = (blocks, value) => {
    if (!blocks || blocks.length === 0) {
        return
    }
  
    blocks.forEach(block => {
        if (block.name === 'li') {
            if (value === 'left') {
                block.css('list-style-position', 'outside')
            } else {
                block.css('list-style-position', 'inside')
            }
        }
    })
}

function repairListblock(node, checkbox) {
    if(node && node.name === 'li'){
        if(checkbox)
            prependCheckbox.call(this, node)
        if (node.first()) {
            const firstNode = node.first()
            if (isCheckbox(firstNode)) {
                const nextNode = firstNode.next()
                if(!nextNode || nextNode[0].nodeValue === "")
                    node.append("<br />")
            }
        } 
        else 
            node.append("<br />")
    }
}

function isListFirstOffset(range){
    const firstBlock = getNodeModel(range.startContainer)
    const offset = range.startOffset
    const cloneRange = range.cloneRange()
    const node = "li" === firstBlock.name ? firstBlock : firstBlock.closest("li")
    if (!node[0]) return false
    cloneRange.selectNodeContents(node[0])
    cloneRange.setEnd(firstBlock[0], offset)
    const contents = cloneRange.cloneContents()
    if (!contents.firstChild) return true
    if (1 === contents.childNodes.length && "br" === getNodeModel(contents.firstChild).name) return true
    if (1 === contents.childNodes.length && isCheckbox(getNodeModel(contents.firstChild))) return true
    if (2 === contents.childNodes.length && isCheckbox(getNodeModel(contents.firstChild)) && isEmptyNode(contents.lastChild)) return true
    const block = getNodeModel("<div />")
    block.append(contents)
    return !!isEmptyNode(block[0])
}

function isListLastOffset(range){
    const endBlock =  getNodeModel(range.endContainer)
    const offset = range.endOffset
    const cloneRange = range.cloneRange()
    const node =  "li" === endBlock.name ? endBlock : endBlock.closest("li")
    if (!node[0]) return false
    cloneRange.selectNodeContents(node[0])
    cloneRange.setStart(endBlock[0], offset)
    const contents = cloneRange.cloneContents()
    if (!contents.firstChild) return true
    if (1 === contents.childNodes.length && "br" === getNodeModel(contents.firstChild).name) return true
    const block = getNodeModel("<div />")
    block.append(contents)
    return !!isEmptyNode(block[0])
}

function isEmptyListItem(node){
    return "li" === node.name && (!!isEmptyNode(node) || (1 === node.children().length ? isCheckbox(node.first()) || "br" === node.first().name : 2 === node.children().length && (isCheckbox(node.first()) && "br" === node.last().name)))           
}

export {
    isAllListedByType,
    getListType,
    cancelList,
    clearTaskList,
    toCommonList,
    toTaskList,
    prependCheckbox,
    repairListblocks,
    repairListblock,
    repairListStylePosition,
    isListFirstOffset,
    isListLastOffset,
    isTaskListBlock,
    isSameList,
    isEmptyListItem
}