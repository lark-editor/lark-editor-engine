import getNodeModel from '../models/node'
import { CARD_KEY,READY_CARD_KEY,CARD_SELECTOR,READY_CARD_SELECTOR } from '../constants/card'
import { ANCHOR,FOCUS,CURSOR,LAKE_ELEMENT } from '../constants/bookmark'
import { ROOT_TAG_MAP } from '../constants/tags'
import { Level } from '../constants/semantics'
import { INDENT_KEY } from '../constants/indent'
import { setNode } from '../changes/utils'
import { isSameList } from './list'

const getDocument = node => {
    if (!node) {
      return document
    }
    return node.ownerDocument || node.document || node
}

const getWindow = node => {
    if (!node) {
      return window
    }
  
    const doc = getDocument(node)
    return doc.parentWindow || doc.defaultView || window
} 

// 遍历所有子节点
// return false：停止遍历
// return true：停止遍历当前节点，下一个兄弟节点继续遍历
const walkTree = (root, callback, order) => {
    if (root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
        root = getNodeModel(root)[0]
    }
    order = order === undefined ? true : order
    const walk = node => {
        let child = order ? node.firstChild : node.lastChild
    
        while (child) {
            const next = order ? child.nextSibling : child.previousSibling;
            const result = callback(child)
    
            if (result === false) {
                return
            }
    
            if (!getNodeModel(child).attr(CARD_KEY) && !getNodeModel(child).attr(READY_CARD_KEY) && result !== true) {
                walk(child)
            }
    
            child = next;
        }
    };
  
    callback(root)
    walk(root)
} 
  
// 获取所欲子节点
const fetchAllChildren = root => {
    var children = []
    walkTree(root,node => {
        return children.push(node)
    })
    children.shift()
    return children
} 

export const removeMark = (node, styleName) => {
    if ("font-size" !== styleName)
        node[0].style[styleName] = ""
    else {
        const classVal = node.attr("class")
        node.attr("class", classVal.replace(/lake-fontsize-[0-9]{1,5}/, ""))
    }
}

export const sameMarkNode = (mark1,mark2) => {
    const mark1Css = mark1.css()
    const mark2Css = mark2.css()
    const mark1Class = mark1.attr("class")
    const mark2Class = mark2.attr("class")
    const markCssAttr = {}
    const markClassAttr = {}
    if(Object.keys(mark1Css).length < Object.keys(mark2Css).length){
        Object.keys(mark1Css).forEach(attr => {
            if(mark2Css[attr]){
                markCssAttr[attr] = true
            }
        })
    }else{
        Object.keys(mark2Css).forEach(attr => {
            if(mark1Css[attr]){
                markCssAttr[attr] = true
            }
        })
    }
    if(mark1Class && mark2Class && mark1Class.indexOf("lake-fontsize-") > -1 && mark2Class.indexOf("lake-fontsize-") > -1){
        markClassAttr["font-size"] = true
    }
    return Object.assign( {} , markCssAttr , {} , markClassAttr )
}

// 对比两个节点的标签
const equalNode = (node, otherNode) => {
    node = getNodeModel(node)
    otherNode = getNodeModel(otherNode)
  
    if (node.name !== otherNode.name) {
      return false
    }
  
    const attrs = node.attr()
    delete attrs.style
    const otherAttrs = otherNode.attr()
    delete otherAttrs.style
    const styles = node.css()
    const otherStyles = otherNode.css()

    if (Object.keys(attrs).length === 0 && 
    Object.keys(otherAttrs).length === 0 && 
    Object.keys(styles).length === 0 && 
    Object.keys(otherStyles).length === 0) {
        return true
    }
  
    if (Object.keys(attrs).length !== Object.keys(otherAttrs).length || Object.keys(styles).length !== Object.keys(otherStyles).length) {
        return false
    }
  
    if (Object.keys(attrs).length > 0) {
        return Object.keys(attrs).some(key => {
            return otherAttrs[key]
        })
    }
  
    return Object.keys(styles).some(key => {
        return otherStyles[key]
    })
} 

// 判断一个节点下的文本是否为空
const isEmptyNode = (node, hasTrim) => {
    node = getNodeModel(node)
    if (node.isElement()) {
        if (node.attr(CARD_KEY) || node.find(CARD_SELECTOR).length > 0) {
            return false
        }
    
        if (node.attr(READY_CARD_KEY) || node.find(READY_CARD_SELECTOR).length > 0) {
            return false
        }
    
        if (node.name !== 'br' && node.isVoid()) {
            return false
        }
    
        if (node.find('hr,img,table').length > 0) {
            return false
        }
    
        if (node.find('br').length > 1) {
            return false
        }
    }
  
    let value = node.isText() ? node[0].nodeValue : node.text()
    value = value.replace(/\u200B/g, '')
    value = value.replace(/\r\n|\n/, '')
  
    if (hasTrim) {
        value = value.trim()
    }
  
    return value === ''
} 
  
// 判断一个节点下的文本是否为空，或者只有空白字符
const isEmptyNodeWithTrim = node => {
    return isEmptyNode(node, true)
} 

// 移除占位符 \u200B
const removeZeroWidthSpace = root => {
    walkTree(root,node => {
        if (node.nodeType !== Node.TEXT_NODE) {
            return
        }
        const text = node.nodeValue
        if (text.length !== 2) {
            return
        }
        if (text.charCodeAt(1) === 0x200B &&
         node.nextSibling && 
         node.nextSibling.nodeType === Node.ELEMENT_NODE && 
         [ANCHOR,FOCUS, CURSOR].indexOf(node.nextSibling.getAttribute(LAKE_ELEMENT)) >= 0) {
            return
        }
    
        if (text.charCodeAt(0) === 0x200B) {
            const newNode = node.splitText(1)
            newNode.parentNode.removeChild(newNode.previousSibling)
        }
    })
} 

// 删除两边的 BR
const removeSideBr = node => {
    // 删除第一个 BR
    const firstNode = node.first()
    if (firstNode && firstNode.name === 'br' && node.children().length > 1) {
        firstNode.remove()
    } 
    // 删除最后一个 BR
    const lastNode = node.last()
    if (lastNode && lastNode.name === 'br' && node.children().length > 1) {
        lastNode.remove()
    }
}

const replacePre = node => {
    const firstNode = node.first()
    if (firstNode && "code" !== firstNode.name) {
        const html = node.html()
        html.split(/\r?\n/).forEach(temHtml => {
            temHtml = temHtml.replace(/^\s/, "&nbsp;").replace(/\s$/, "&nbsp;").replace(/\s\s/g, " &nbsp;").trim()
            if("" === temHtml){
                temHtml = "<br />"
            }
            node.before("<p>".concat(temHtml, "</p>"))
        })
        node.remove()
    }
}

function k(node, root) {
    if (!Level[node.name] || !Level[root.name]) return root
    if (Level[node.name] > Level[root.name]) return node
    if (["ul", "ol"].includes(node.name) && ["ul", "ol"].includes(root.name)) {
        const rootIndent = parseInt(root.attr(INDENT_KEY), 10) || 0
        const nodeIndent = parseInt(node.attr(INDENT_KEY), 10) || 0
        root.attr(INDENT_KEY, nodeIndent ? nodeIndent + 1 : rootIndent + 1)
    }
    return root
}

function w(nodeName, rootNodeName) {
    return !(!["ol", "ul"].includes(nodeName) || "li" !== rootNodeName) || !("blockquote" !== nodeName || !ROOT_TAG_MAP[rootNodeName] || "blockquote" === rootNodeName)
}

function x(node, rootNode) {
    let parentNode = node[0].parentNode
    while (parentNode !== rootNode) {
        parentNode = getNodeModel(parentNode)
        if (node.isCard()) 
            parentNode.before(node)
        else if (w(parentNode.name, node.name)) {
            const cloneNode = parentNode.clone(false)
            cloneNode.append(node)
            node = cloneNode 
            parentNode.before(node)
        } else {
            node = setNode(node, k(parentNode, node).clone(false))
            parentNode.before(node)
        }
        if(!parentNode.first())
            parentNode.remove()
        parentNode = node[0].parentNode
    }
    if("pre" === node.name)
        replacePre(node)
}

const flatten = (node, rootNode) => {
    rootNode = rootNode || node
    const isFragment = (node.type || node.nodeType) === Node.DOCUMENT_FRAGMENT_NODE
    let firstNode = isFragment ? getNodeModel(node.firstChild) : node.first()
    const tempNode = isFragment ? getNodeModel("<p />") : node.clone(false)
    while (firstNode) {
        let nextNode = firstNode.next()
        if (firstNode.isBlockCard() || firstNode.isTable() || firstNode.isSimpleBlock()) 
            x(firstNode, rootNode)
        else if (firstNode.isBlock()) 
            flatten(firstNode, rootNode)
        else {
            const cloneNode = tempNode.clone(false)
            const isLI = "li" === cloneNode.name
            firstNode.before(cloneNode)
            while (firstNode) {
                nextNode = firstNode.next()
                const isBR = "br" === firstNode.name && !isLI
                cloneNode.append(firstNode)
                if (isBR || !nextNode || nextNode.isBlock()) break
                firstNode = nextNode
            }
            removeSideBr(cloneNode) 
            x(cloneNode, rootNode)
        }
        firstNode = nextNode
    }
    const fNode = node.first ? node.first() : node.firstChild
    if(!fNode)
        node.remove()
}

function E(sNode, tNode) {
    let firstNode = tNode.first()
    while (firstNode) {
        let nextNode = firstNode.next()
        sNode.append(firstNode)
        firstNode = nextNode
    }
    tNode.remove()
}

function join(node) {
    let firstChild = node.firstChild
    while (firstChild) {
        firstChild = getNodeModel(firstChild)
        let nextNode = firstChild.next()
        while (nextNode && firstChild.name === nextNode.name && ("blockquote" === firstChild.name || ["ul", "ol"].includes(firstChild.name) && isSameList(firstChild, nextNode))) {
            const nNode = nextNode.next()
            E(firstChild, nextNode) 
            join(firstChild[0])
            nextNode = nNode
        }
        firstChild = nextNode
    }
}

function normalize(node) {
    flatten(node)
    join(node)
}

function removeMinusStyle(node, indent) {
    if (node.isBlock()) {
        const val = parseInt(node.css(indent), 10) || 0
        if(val < 0)
            node.css(indent, "")
    }
}

export {
    getDocument,
    getWindow,
    walkTree,
    fetchAllChildren,
    equalNode,
    isEmptyNode,
    isEmptyNodeWithTrim,
    removeZeroWidthSpace,
    removeSideBr,
    flatten,
    join,
    normalize,
    removeMinusStyle
}