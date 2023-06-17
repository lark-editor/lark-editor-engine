import PathNode from './path-node'
import getNodeModel from '../models/node'
import { toDOM } from './jsonml'
import { unescapeDots , unescape } from '../utils/string'
import { JSONML } from '../constants/ot';

function getArray(data,len){
    if(Array.isArray(data))
        return data
    const array = []
    for(const value of data){
        array.push(value)
        if(len && array.length === len)
            break
    }
    return array
}

function getRange(ancestorContainer) {
    if (0 !== window.getSelection().rangeCount) {
        const range = window.getSelection().getRangeAt(0)
        if (range.commonAncestorContainer === ancestorContainer) {
            const { startOffset , startContainer , endOffset , endContainer } = range
            return { startOffset , startContainer , endOffset , endContainer }
        }
    }
}

function k(container, offset) {
    if(offset >= 0){
        return [container, offset]
    }else if(container.previousSibling && getNodeModel(container.previousSibling).isText()){
        offset += container.previousSibling.nodeValue.length
        return k(container.previousSibling, offset)
    }else if(container.parentNode){
        offset = container.parentNode.childNodes.length
        return k(container.parentNode, offset)
    }
    return undefined
}

function x(node, rangeOpts) {
    const { engine } = this
    const range = document.createRange()
    if (rangeOpts.startOffset < 0) {
        const i = k(rangeOpts.startContainer, rangeOpts.startOffset)
        const { container , offset} = getArray(i, 2)
        rangeOpts.startContainer = container
        rangeOpts.startOffset = offset
    }
    if (rangeOpts.endOffset < 0) {
        const l = k(rangeOpts.endContainer, rangeOpts.endOffset)
        const { container , offset } = getArray(l, 2)
        rangeOpts.endContainer = container
        rangeOpts.endOffset = offset
    }
    range.setStart(rangeOpts.startContainer, rangeOpts.startOffset)
    range.setEnd(rangeOpts.endContainer, rangeOpts.endOffset)
    engine.change.select(range)
}

class Applier {
    constructor(engine , options){
        this.engine = engine
        this.editArea = engine.editArea
        this.options = options
    }

    setAttribute(e,attr,value){
        const { engine , editArea } = this
        const dataObj = PathNode.elementAtPath(editArea[0],e)
        const dataArray = getArray(dataObj,1)
        const node = dataArray[0]
        if(node){
            if(!getNodeModel(node).isRoot() || /^data-selection-/.test(attr)){
                attr = unescapeDots(attr)
                value = unescape(value)
                node.setAttribute(attr,value)
                if(getNodeModel(node).isCard()){
                    engine.card.reRenderAll(node,engine)
                }
            }
        }
    }

    removeAttribute(e,attr){
        const { editArea } = this
        const dataObj = PathNode.elementAtPath(editArea[0],e)
        const dataArray = getArray(dataObj,1)
        const node = dataArray[0]
        if(node){
            if(!getNodeModel(node).isRoot() || /^data-selection-/.test(attr)){
                node.removeAttribute(attr)
            }
        }
    }

    insertNode(e, t){
        const { engine , editArea } = this
        const dataObj = PathNode.elementAtPath(editArea[0],e)
        const dataArray = getArray(dataObj,3)
        const [node1,node2,node3] = dataArray
        if(node3 && !getNodeModel(node1).isRoot()){
            const element = typeof t === "string" ? document.createTextNode(t) : toDOM(t)
            node3.insertBefore(element, node1 || null)
            const path = PathNode.getPathNode(node3)
            const node = PathNode.create(element , path , true)
            if(node){
                path.children.splice(node2, 0, node)
            }
            engine.card.reRenderAll(element,engine)
        }
    }

    deleteNode(e){
        const { engine , editArea } = this
        const dataObj = PathNode.elementAtPath(editArea[0],e)
        const dataArray = getArray(dataObj,3)
        const [node1,node2,node3] = dataArray
        if(node1 && !getNodeModel(node1).isRoot()){
            const range = getRange(node1)
            let next;
            if(node1.nextSibling && node1.nextSibling.nodeType === Node.TEXT_NODE){
                next = node1.nextSibling
            }else if(node1.nextElementSibling && node1.nextElementSibling.firstChild && node1.nextElementSibling.firstChild.nodeType === Node.TEXT_NODE){
                next = node1.nextElementSibling.firstChild
            }
            if(range && node1.nodeType === Node.TEXT_NODE && next && next.nodeValue === node1.nodeValue){
                if(range.startContainer === node1){
                    range.startContainer = next
                }
                if(range.endContainer === node1){
                    range.endContainer = next
                }
                x.call(this,next,range)
            }
            const pathNode = PathNode.getPathNode(node3)
            pathNode.children.splice(node2, 1)
            const node = getNodeModel(node1)
            if(node.isCard()){
                engine.change.removeCard(node)
            }else{
                node.remove()
            }
        }
    }

    replaceNode(e, t){
        const { editArea } = this
        const dataObj = PathNode.elementAtPath(editArea[0],e)
        const dataArray = getArray(dataObj,4)
        const [node1,node2,node3,node4] = dataArray
        if(node1 && !getNodeModel(node1).isRoot()){
            switch(node4){
                case JSONML.TAG_NAME_INDEX:
                    const node = node1
                    const nodeDom = toDOM(t)
                    const pathNode = PathNode.getPathNode(node3) 
                    if(!pathNode)
                    {
                        console.warn("No parentPathNode found, aborting. This shouldn't happen, but...")
                        return 
                    }
                    while(node.firstChild){
                        nodeDom.insertBefore(node.firstChild, null)
                    }

                    for (let i = 0; i < node.attributes.length; i++) {
                        const { nodeName , nodeValue } = node.attributes.item(i)
                        nodeDom.setAttribute(nodeName, nodeValue)
                    }

                    node3.insertBefore(nodeDom, node || null)
                    node1.remove()
                    const pNode = PathNode.create(nodeDom, pathNode, true)
                    if(!pNode)
                        break
                    pathNode.children.splice(node2, 1, pNode)
                    break
                case JSONML.ATTRIBUTE_INDEX:
                    const w = t
                    const attributes = Array.from(node1.attributes).map(attr => {
                        return attr.name
                    })
                    const dataArray = new Set([].concat(...Object.keys(w),...attributes))
                    dataArray.forEach(data => {
                        if(data in w){
                            node1.setAttribute(data, w[data])
                        }else{
                            node1.removeAttribute(data)
                        }
                    })
                    break
                default:
                    this.deleteNode(e)
                    this.insertNode(e, t)
                    break
            }
        }
    }

    insertInText(e, offset, text){
        const { editArea } = this
        const dataObj = PathNode.elementAtPath(editArea[0],e)
        const dataArray = getArray(dataObj,4)
        let [node1,node2,node3,node4] = dataArray

        switch(node4){
            case JSONML.TAG_NAME_INDEX:
                throw Error("Unsupported indexType JSONML.TAG_NAME_INDEX (0)")
            case JSONML.ATTRIBUTE_INDEX:
                throw Error("Unsupported indexType JSONML.ATTRIBUTE_INDEX (1)")
            default:
                node3 = node1
                if(!getNodeModel(node3).isText())
                    return
                const { nodeValue } = node3
                const value = nodeValue.substring(0, offset) + text + nodeValue.substring(offset)
                const range = getRange(node3)
                node3.nodeValue = value
                if(range){
                    if(range.endContainer === node3 && range.endOffset > offset){
                        range.endOffset += text.length
                        if(range.startContainer === node3 && range.startOffset >= offset){
                            range.startOffset += text.length
                        }
                    }
                    x.call(this, node3, range)
                }
                break
        }
    }

    deleteInText(e, offset, text){
        const { editArea } = this
        const dataObj = PathNode.elementAtPath(editArea[0],e)
        const dataArray = getArray(dataObj,4)
        let [node1,node2,node3,node4] = dataArray
        switch(node4){
            case JSONML.TAG_NAME_INDEX:
                throw Error("Unsupported indexType JSONML.TAG_NAME_INDEX (0)")
            case JSONML.ATTRIBUTE_INDEX:
                throw Error("Unsupported indexType JSONML.ATTRIBUTE_INDEX (1)")
            default:
                node3 = node1
                if(!getNodeModel(node3).isText())
                    return
                const range = getRange(node3)
                const { nodeValue } = node3
                const value = nodeValue.substring(0, offset) + nodeValue.substring(offset + text.length)
                node3.nodeValue = value
                if(range){
                    if(range.endContainer === node3 && range.endOffset > offset){
                        range.endOffset -= text.length
                        if(range.startContainer === node3 && range.startOffset >= offset){
                            range.startOffset -= text.length
                        }
                    }
                    x.call(this, node3, range)
                }
                break
                
        }
    }

    applyOperation(e){
        let t, n, a = e.p
        if(a.length !== 0){
            if("si"in e || "sd"in e){
                t = a[a.length - 1]
                a = a.slice(0, -1)
            }
            if("oi"in e || "od"in e){
                n = a[a.length - 1]
                a = a.slice(0, -1)
            }
            if("oi"in e){
                return this.setAttribute(a, n, e.oi)
            }else if("od"in e){
                return this.removeAttribute(a, n)
            }else if("sd"in e){
                return this.deleteInText(a, t, e.sd)
            }else if("si" in e){
                return this.insertInText(a, t, e.si)
            }else if("li" in e && "ld" in e){
                return this.replaceNode(a, e.li)
            }else if("ld" in e){
                return this.deleteNode(a)
            }else if("li" in e){
                return this.insertNode(a, e.li)
            }
            return 
        }
    }
}
export default Applier