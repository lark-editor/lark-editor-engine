import getNodeModel from '../models/node'
import { getDocument,isEmptyNode } from '../utils/node'
import { getClosestBlock,isBlockLastOffset,mergeNode,wrapNode } from './utils'
import deleteContent from './delete-content.js'
import { shrinkRange,deepCut } from '../utils/range'
import mergeAdjacentList from './merge-adjacent-list'
import Engine from '../index'
import { isTaskListBlock,clearTaskList,isEmptyListItem,isSameList } from '../utils/list'
import mergeAdjacentBlockquote from './merge-adjacent-blockquote'
function focusToCard(range, card) {
    const cardRoot = card.closest(range.startContainer)
    if(cardRoot && card)
        card.focus(range, cardRoot, false)
}

function insertNodeList(range, nodes, card) {
    if (nodes.length !== 0) {
        const doc = getDocument(range.startContainer)
        let lastNode = getNodeModel(nodes[nodes.length - 1])
        if("br" === lastNode.name){
            lastNode.remove()
            lastNode = getNodeModel(nodes[nodes.length - 1])
        } 
        const fragment = doc.createDocumentFragment()
        let node = nodes[0]
        while (node) {
            node = getNodeModel(node)
            Engine.NodeUtils.removeSideBr(node)
            const next = node.next()
            if(!next){
                lastNode = node
            }
            fragment.appendChild(node[0])
            node = next
        }
        range.insertNode(fragment)
        shrinkRange(range)
        range.collapse(false)
        focusToCard(range, card)
    }
}

function getFirstChild(node) {
    let child = node.firstChild
    if (!getNodeModel(child).isBlock()) 
        return node
    while (["blockquote", "ul", "ol"].includes(getNodeModel(child).name)){
        child = child.firstChild
    }
    return child
}

function getLastChild(node) {
    let child = node.lastChild
    if (!getNodeModel(child).isBlock()) return node
    while (["blockquote", "ul", "ol"].includes(getNodeModel(child).name)){
        child = child.lastChild
    }
    return child
}

function isListChild(_lastNode, _firstNode) {
    return "p" === _firstNode.name || _lastNode.name === _firstNode.name && !("li" === _lastNode.name && !isSameList(_lastNode.parent(), _firstNode.parent()))
}

function removeEmptyNode(node) {
    node = getNodeModel(node)
    while (!node.isRoot()) {
        const parent = node.parent()
        node.remove()
        if (!isEmptyNode(parent)) break
        node = parent
    }
}

function clearList(lastNode, nextNode) {
    if(lastNode.name === nextNode.name && "p" === lastNode.name)
        lastNode.attr(nextNode.attr())
    if(isTaskListBlock(lastNode) === isTaskListBlock(nextNode))
        clearTaskList(nextNode)
}
export default (range, card, fragment, callback) => {
    const firstBlock = getClosestBlock(range.startContainer)
    const lastBlock = getClosestBlock(range.endContainer)
    const blockquoteNode = firstBlock.closest("blockquote")
    const childNodes = fragment.childNodes
    const firstNode = getNodeModel(fragment.firstChild)
    if (!range.collapsed) {
        deleteContent(range, (lastBlock[0] === firstBlock[0] || !isBlockLastOffset(range, "end")))
    }
    if (!firstNode[0]) return range
    if (!firstNode.isBlock() && !firstNode.isCard()) {
        shrinkRange(range)
        range.insertNode(fragment)
        range.collapse(false)
        return range
    }
    deepCut(range)
    const startNode = range.startContainer.childNodes[range.startOffset - 1]
    const startNode1 = range.startContainer.childNodes[range.startOffset]

    if(blockquoteNode[0]){
        childNodes.forEach(node => {
            if("blockquote" !== getNodeModel(node).name){
                wrapNode(getNodeModel(node), blockquoteNode.clone(false))
            }
        })
    }
    insertNodeList(range, childNodes, card)
    if(blockquoteNode[0] && startNode){
        const _firstNode = getNodeModel(getFirstChild(startNode.nextSibling))
        const _lastNode = getNodeModel(getLastChild(startNode))
        if(isListChild(_lastNode, _firstNode)){
            clearList(_lastNode, _firstNode)
            mergeNode(_lastNode, _firstNode,false)
            removeEmptyNode(_firstNode)
        }else {
            if(isEmptyNode(_lastNode) || isEmptyListItem(_lastNode)){
                removeEmptyNode(_lastNode)
            }
        }
    }

    if (startNode1) {
        const prevNode = getNodeModel(getLastChild(startNode1.previousSibling)),
            nextNode = getNodeModel(getFirstChild(startNode1))
            range.selectNodeContents(prevNode[0])
            shrinkRange(range)
            range.collapse(false) 
            if(isEmptyNode(nextNode))
            {
                removeEmptyNode(nextNode)
            }
            else if(isListChild(prevNode, nextNode)){
                mergeNode(prevNode, nextNode,false)
                removeEmptyNode(nextNode)
            }
    }
    mergeAdjacentBlockquote(range)
    mergeAdjacentList(range)
    if(callback)
        callback()
    return range
}