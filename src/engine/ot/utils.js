import isEqual from "lodash/isEqual"
import getNodeModel from '../models/node'
import { CARD_SELECTOR } from '../constants/card'
import { downRange } from '../utils/range'

export const random = (start , len) => {
    return Math.floor(start + Math.random() * (len - start))
}

export const randomString = () => {
    var count = 8
    const str = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"
    const len = str.length
    let word = ""
    while (count--)
        word += str[random(0, len)]
    return word
}

export const isTransientElement = node => {
    node = getNodeModel(node)
    if(node.isText() && "" === node[0].nodeValue)
        return true
    if(node.isElement()){
        if (["cursor", "anchor", "focus"].includes(node.attr("data-lake-element")))
            return true
        if (node.attr("data-transient"))
            return true
        if (!node.isCard() && node.closest(CARD_SELECTOR).length > 0)
            return true
    }
    return false
}

export const isTransientAttribute = (node,attr) => {
    node = getNodeModel(node)
    return !(!node.isRoot() || /^data-selection-/.test(attr)) || !(!node.isCard() || !["id", "class", "style"].includes(attr))
}

export const toPath = range => {
    const node = getNodeModel(range.commonAncestorContainer)
    if (!node.isRoot() && !node.isEditable())
        return []
    downRange(range)
    const getPath = function(container, offset) {
        let containerClone = container
        const path = []
        while (containerClone) {
            if (getNodeModel(containerClone).isRoot())
                break
            let prev = containerClone.previousSibling
            let i = 0
            while (prev){
                if(getNodeModel(prev).attr("data-transient")){
                    prev = prev.previousSibling
                }else{
                    i++
                    prev = prev.previousSibling
                }
            }
            
            path.unshift(i)
            containerClone = containerClone.parentNode
        }
        path.push(offset)
        return path
    }
    return [getPath(range.startContainer, range.startOffset), getPath(range.endContainer, range.endOffset)]
}

export const fromPath = (editArea,path) => {
    const first = path[0].pop()
    const second = path[1].pop()
    const getNode = path => {
        let element = getNodeModel(editArea)[0]
        for(let i = 0;i < path.length; i++){
            let p = path[i]
            if(p < 0){
                p = 0
            }
            let node = undefined
            let child = element.firstChild
            let l = 0
            while(child){
                if(getNodeModel(child).attr("data-transient")){
                    child = child.nextSibling
                }else{
                    if (l === p || !child.nextSibling) {
                        node = child
                        break
                    }
                    l++
                    child = child.nextSibling
                }
            }
            if (!node)
                break
            element = node
        }
        return element
    }

    const setRange = (method,range,node,offset) => {
        if(node){
            if(offset < 0){
                offset = 0
            }
            if(node.nodeType === Node.ELEMENT_NODE && offset > node.childNodes.length){
                offset = node.childNodes.length
            }
            if(node.nodeType === Node.TEXT_NODE && offset > node.nodeValue.length){
                offset = node.nodeValue.length
            }
            range[method](node,offset)
        }
    }
    const range = document.createRange()
    const firstNode = getNode(path[0])
    const secondNode = getNode(path[1])
    setRange("setStart" , range , firstNode , first )
    setRange("setEnd" , range , secondNode , second )
    return range
}

export const reduceOperations = ops => {
    const opArray = []
    for(let i = 0;i < ops.length; i++){
        const op = ops[i]
        const sOp = ops[i + 1]
        if(sOp && op.li && op.li === sOp.ld && isEqual(op.p,sOp.p)){
            i++
        }else{
            opArray.push(op)
        }
    }
    return opArray
}