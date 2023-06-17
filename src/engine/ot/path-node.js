import { JSONML } from '../constants/ot'
import { isTransientElement } from './utils'

function getId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
        const random = 16 * Math.random() | 0
        const num = "x" === char ? random : 3 & random | 8
        return num.toString(16)
    })
}

class PathNode {
    constructor(node,parent,a){
        this.id = getId()
        this.children = []
        this.parent = parent
        this.node = node

        if(a || !node.__pathNodes || 0 === node.__pathNodes.length){
            node.__pathNodes = [this]
        }else{
            node.__pathNodes.push(this)
        }
        const { childNodes } = node
        Array.from(childNodes).forEach(child => {
            const pathcNode = PathNode.create(child, this, a)
            if(pathcNode){
                this.children.push(pathcNode)
            }
        })
    }

    toPath(){
        if (!this.parent)
            return []
        const index = this.parent.children.findIndex(child => child.id === this.id)
        return [].concat([...this.parent.toPath()], [JSONML.ELEMENT_LIST_OFFSET + index])
    }

    remove(e){
        if(!e){
            this.parent.children.splice(this.parent.children.indexOf(this), 1)
        }
        this.parent = null
        this.node.__pathNodes.splice(this.node.__pathNodes.indexOf(this), 1)
        this.node = null
        this.children.forEach(child => {
            child.remove(true)
        })
        this.children = null
    }
}

PathNode.create = function(node, obj, n) {
    if (!isTransientElement(node))
        return new PathNode(node,obj,n)
}

PathNode.getPathNode = function(node, target) {
    if (!node || !node.__pathNodes)
        return null
    if (!target || !target.__pathNodes)
        return node.__pathNodes[node.__pathNodes.length - 1]
    var n = null
    target.__pathNodes.some(i => {
        return n = node.__pathNodes.find(j =>  j.parent.id === i.id )
    })
    return n
}

PathNode.elementAtPath = function(obj, t) {
    const pathNode = obj instanceof PathNode ? obj : PathNode.getPathNode(obj)
    const i = t[0]
    if (i === JSONML.ATTRIBUTE_INDEX)
        return [obj, void 0, obj, i]
    var r = i - JSONML.ELEMENT_LIST_OFFSET
      , o = pathNode && pathNode.children[r]
      , s = t[1];
    if (1 === t.length || s === JSONML.TAG_NAME_INDEX || s === JSONML.ATTRIBUTE_INDEX) {
        var l = o && o.node
        obj = pathNode && pathNode.node
        return [l, r, obj, s]
    }
    return PathNode.elementAtPath(o, t.slice(1))
}

export default PathNode