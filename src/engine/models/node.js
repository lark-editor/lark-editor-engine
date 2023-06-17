import Event from './event'
import { toCamel,getCssMap,getAttrMap } from '../utils/string'
import { CARD_TYPE_KEY } from '../constants/card'
import { BLOCK_TAG_MAP } from '../constants/tags'
import { ROOT_SELECTOR,ROOT_KEY,ROOT } from '../constants/root'
import { INLINE_TAG_MAP,MARK_TAG_MAP,VOID_TAG_MAP,SOLID_TAG_MAP,TABLE_TAG_MAP,HEADING_TAG_MAP,ROOT_TAG_MAP,TITLE_TAG_MAP } from '../constants/tags'
import { dingtalk } from '../utils/ua'

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
  
const getComputedCss = (node, key) => {
    const win = getWindow(node)
    const camelKey = toCamel(key)
    const style = win.getComputedStyle(node, null)
    return style[camelKey]
}
  
const _contains = (nodeA, nodeB) => {
    // Bypass comparison on document node since
    // we don't deal with cross frame,
    // e.g. document.body.parentNode.parentNode == document (false for IE).
    if (nodeA.nodeType === 9 && nodeB.nodeType !== 9) {
        return true
    }
  
    while (nodeB = nodeB.parentNode) {
        if (nodeB === nodeA) {
            return true
        }
    }
    return false
} // https://github.com/madrobby/zepto/blob/master/src/zepto.js
  // https://developer.mozilla.org/ja/docs/Web/API/Element/matches
  
  
const isMatchesSelector = (element, selector) => {
    if (element.nodeType !== Node.ELEMENT_NODE) {
      return false
    }
  
    const matchesSelector = element.matches || element.webkitMatchesSelector || element.mozMatchesSelector || element.oMatchesSelector || element.matchesSelector;
    return matchesSelector.call(element, selector)
}

class NodeModel {
    constructor(nodes, root){
        if (nodes.nodeType) {
            nodes = [nodes]
        }
      
        this.events = []
    
        for (let i = 0; i < nodes.length; i++) {
            this[i] = nodes[i]
            this.events[i] = new Event()
        }
    
        this.length = nodes.length
    
        if (this.length > 0) {
            this.doc = getDocument(root)
            this.root = root
            this.name = this[0].nodeName ? this[0].nodeName.toLowerCase() : ''
            this.type = this.length > 0 ? this[0].nodeType : null
            this.win = getWindow(this[0])
        }
    }

    toArray(){
        const array = []
        this.each(node => {
            array.push(node)
        })
        return array
    }

    removeFontSize(){
        const classValue = this.attr("class")
        if(classValue){
            this.attr("class", classValue.replace(/lake-fontsize-[\d]{1,2}/, ""))
        }
    }

    isElement() {
        return this.type === Node.ELEMENT_NODE
    }

    isText() {
        return this.type === Node.TEXT_NODE
    }

    isBlock() {
        if (this.attr(CARD_TYPE_KEY) === 'inline') {
            return false
        }
        return !!BLOCK_TAG_MAP[this.name]
    }

    isInline() {
        return !!INLINE_TAG_MAP[this.name]
    }

    isRootBlock(){
        return !!ROOT_TAG_MAP[this.name]
    }

    isSimpleBlock(){
        if (!this.isBlock()) return false
        let node = this.first()
        while (node) {
            if (node.isBlock()) return false
            node = node.next()
        }
        return true
    }

    isMark() {
        return !!MARK_TAG_MAP[this.name]
    }

    isCard() {
        return !!this.attr(CARD_TYPE_KEY)
    }

    isBlockCard(){
        return "block" === this.attr(CARD_TYPE_KEY)
    }

    isVoid() {
        return !!VOID_TAG_MAP[this.name]
    }

    isSolid() {
        return !!SOLID_TAG_MAP[this.name]
    }

    isHeading() {
        return !!HEADING_TAG_MAP[this.name]
    }

    isTitle(){
        return !!TITLE_TAG_MAP[this.name]
    }

    isTable() {
        return !!TABLE_TAG_MAP[this.name]
    }

    isRoot() {
        return this.attr(ROOT_KEY) === ROOT
    }

    isEditable() {
        if (this.isRoot()) {
            return false
        }
        return this.closest(ROOT_SELECTOR).length > 0
    }

    each(callback) {
        for (let i = 0; i < this.length; i++) {
            if (callback(this[i], i) === false) {
                break
            }
        }
        return this
    }

    eq(index) {
        return this[index] ? new NodeModel(this[index]) : undefined
    } // 获取一个元素在父容器的序号

    index() {
        let prev = this[0].previousSibling
        let index = 0

        while (prev && prev.nodeType === Node.ELEMENT_NODE) {
            index++
            prev = prev.previousSibling
        }
        return index
    }

    parent() {
        const node = this[0].parentNode
        return node ? new NodeModel(node) : undefined
    }

    children(selector) {
        if (0 === this.length)
            return new NodeModel([])
        const childNodes = this[0].childNodes
        if(selector){
            let nodes = [];
            for(let i = 0;i < childNodes.length;i++){
                const node = childNodes[i]
                if(isMatchesSelector(node,selector)){
                    nodes.push(node)
                }
            }
            return new NodeModel(nodes)
        }
        return new NodeModel(childNodes)
    }

    first() {
        if (this.length === 0) {
            return undefined
        }
        const node = this[0].firstChild
        return node ? new NodeModel(node) : undefined
    }

    last() {
        if (this.length === 0) {
            return undefined
        }
        const node = this[0].lastChild
        return node ? new NodeModel(node) : undefined
    }

    prev() {
        if (this.length === 0) {
            return undefined
        }
        const node = this[0].previousSibling
        return node ? new NodeModel(node) : undefined
    }

    next() {
        if (this.length === 0) {
            return undefined
        }
        const node = this[0].nextSibling
        return node ? new NodeModel(node) : null
    }

    prevElement() {
        if (this.length === 0) {
            return undefined
        }
        const node = this[0].previousElementSibling
        return node ? new NodeModel(node) : undefined
    }

    nextElement() {
        if (this.length === 0) {
            return undefined
        }
        const node = this[0].nextElementSibling
        return node ? new NodeModel(node) : null
    }

    contains(otherNode) {
        if (this.length === 0) {
            return undefined
        }
        return _contains(this[0], otherNode[0] ? otherNode[0] : otherNode)
    }

    find(selector) {
        let nodeList = []
        if (this[0] && this.isElement()) {
            nodeList = this[0].querySelectorAll(selector)
        }
        return new NodeModel(nodeList)
    }

    closest(selector) {
        const getParent = arguments.length > 1 && undefined !== arguments[1] ? arguments[1] : node => {
            return node.parentNode
        }
        const nodeList = []
        let node = this[0]

        while (node) {
            if (isMatchesSelector(node, selector)) {
                nodeList.push(node)
                return new NodeModel(nodeList)
            }
            node = getParent(node)
        }
        return new NodeModel(nodeList)
    }

    on(eventType, listener) {
        this.each((node, i) => {
            node.addEventListener(eventType, listener, false)
            this.events[i].on(eventType, listener)
        })
        return this
    }

    getBoundingClientRect(defaultValue) {
        const node = this[0]
        if (node && node.getBoundingClientRect) {
            const rect = node.getBoundingClientRect()
            const top = document.documentElement.clientTop
            const left = document.documentElement.clientLeft
            return {
                top: rect.top - top,
                bottom: rect.bottom - top,
                left: rect.left - left,
                right: rect.right - left
            }
        }

        return defaultValue || null
    }

    off(eventType, listener) {
        this.each((node, i) => {
            node.removeEventListener(eventType, listener, false)

            this.events[i].off(eventType, listener)
        })
        return this
    }

    removeAllEvents() {
        this.each((node, i) => {
            if (!this.events[i]) {
                return
            }

            Object.keys(this.events[i].listeners).forEach(eventType => {
                const listeners = this.events[i].listeners[eventType]
                for (let _i = 0; _i < listeners.length; _i++) {
                    node.removeEventListener(eventType, listeners[_i], false)
                }
            })
        })
        this.events = []
        return this
    }

    offset() {
        const node = this[0]
        const rect = node.getBoundingClientRect()
        return {
            top: rect.top,
            left: rect.left
        }
    }

    attr(key, val) {
        if (key === undefined) {
            return getAttrMap(this.clone(false)[0].outerHTML)
        }

        if (typeof key === 'object') {
            Object.keys(key).forEach(k => {
                const v = key[k]
                this.attr(k, v)
            })
            return this
        }

        if (val === undefined) {
            return this.length > 0 && this.isElement() ? this[0].getAttribute(key) : ''
        }

        this.each(node => {
            node.setAttribute(key, val)
        })
        return this
    }

    removeAttr(key) {
        this.each(node => {
            node.removeAttribute(key)
        })
        return this
    }

    hasClass(className) {
        if (this[0] && this[0].classList) {
            for (let i = 0; i < this[0].classList.length; i++) {
                if (this[0].classList[i] === className) {
                    return true
                }
            }
        }
        return false
    }

    addClass(className) {
        this.each(node => {
            node.classList.add(className)
        })
        return this
    }

    removeClass(className) {
        this.each(node => {
            node.classList.remove(className)
        })
        return this
    }

    css(key, val) {
        if (key === undefined) {
            return getCssMap(this.attr('style') || '')
        }

        if (typeof key === 'object') {
            Object.keys(key).forEach(k => {
                const v = key[k]
                this.css(k, v)
            })
            return this
        }

        if (val === undefined) {
            if (this.length === 0 || this.isText()) {
                return ''
            }

            return this[0].style[toCamel(key)] || getComputedCss(this[0], key) || ''
        }

        this.each(node =>  {
            node.style[toCamel(key)] = val
        });
        return this
    }

    width(){
        let width = this.css("width")
        if(width === "auto"){
            width = this[0].offsetWidth
        }
        return parseFloat(width) || 0
    }

    height(){
        let height = this.css("height")
        if(height === "auto"){
            height = this[0].offsetHeight
        }
        return parseFloat(height) || 0
    }

    html(val) {
        if (val === undefined) {
            return this.length > 0 ? this[0].innerHTML : ''
        }

        this.each(node => {
            node.innerHTML = val
        })
        return this
    }

    text() {
        // 返回的数据包含 HTML 特殊字符，innerHTML 之前需要 escape
        // https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
        return this.length > 0 ? this[0].textContent : ''
    }

    show(display) {
        if (display === undefined) {
            display = this._originDisplay || ''
        }

        if (display === 'none') {
            display = ''
        }

        if (this.css('display') !== 'none') {
            return this
        }

        return this.css('display', display)
    }

    hide() {
        if (!this[0]) {
            return this
        }

        this._originDisplay = this[0].style.display
        return this.css('display', 'none')
    }

    remove() {
        this.each((node, i) => {
            if (!node.parentNode) {
                return
            }
            node.parentNode.removeChild(node)
            delete this[i]
        })
        this.length = 0
        return this
    }

    empty() {
        this.each(node => {
            let child = node.firstChild
            while (child) {
                if (!node.parentNode) {
                    return
                }

                const next = child.nextSibling
                child.parentNode.removeChild(child)
                child = next
            }
        })
        return this
    }

    clone(bool) {
        const node = this[0].cloneNode(bool)
        return new NodeModel(node)
    }

    prepend(expr) {
        this.each(node => {
            const nodes = exprToNodes(expr, this.root)
            if (node.firstChild) {
                node.insertBefore(nodes[0], node.firstChild)
            } else {
                node.appendChild(nodes[0])
            }
        })
        return this
    }


    append(expr) {
        this.each(node => {
            const otherNodes = exprToNodes(expr, this.root)
            for (let i = 0; i < otherNodes.length; i++) {
                const otherNode = otherNodes[i]
                if (typeof expr === 'string') {
                    node.appendChild(otherNode.cloneNode(true))
                } else {
                    node.appendChild(otherNode)
                }
            }
        })
        return this
    }

    before(expr) {
        this.each(node => {
            const nodes = exprToNodes(expr, this.root)
            node.parentNode.insertBefore(nodes[0], node)
        })
        return this
    }

    after(expr) {
        this.each(node => {
            const nodes = exprToNodes(expr, this.root)
            if (node.nextSibling) {
                node.parentNode.insertBefore(nodes[0], node.nextSibling)
            } else {
                node.parentNode.appendChild(nodes[0])
            }
        })
        return this
    }

    replaceWith(expr) {
        const newNodes = []
        this.each(node => {
            const nodes = exprToNodes(expr, this.root)
            const newNode = nodes[0]
            node.parentNode.replaceChild(newNode, node)
            newNodes.push(newNode)
        })
        return new NodeModel(newNodes)
    }
}

const exprToNodes = (expr, root) => {
    root = root || document
  
    if (!expr) {
        return []
    }
  
    if (typeof expr === 'string') {
        const length = expr.length
    
        if (expr.charAt(0) === '@') {
            expr = expr.substr(1)
        } // HTML string
        // 包含 HTML 代码，或者第一个字符为 @ 时当做 HTML 字符串
    
        if (expr.length !== length || /<.+>/.test(expr)) {
            const isTr = expr.indexOf('<tr') === 0
            const isTd = expr.indexOf('<td') === 0
            expr = expr.trim()
    
            if (isTr) {
                expr = "<table><tbody>".concat(expr, "</tbody></table>")
            }
    
            if (isTd) {
                expr = "<table><tbody><tr>".concat(expr, "</tr></tbody></table>")
            }
    
            let body
    
            if (dingtalk) {
                // 在钉钉上 DOMParser 有时候报错
                body = document.createElement('div')
                body.innerHTML = expr
            } else {
                const doc = new DOMParser().parseFromString(expr, 'text/html')
                body = doc.body
            }
    
            if (isTr) {
                return body.querySelector('tbody').childNodes
            }
    
            if (isTd) {
                return body.querySelector('tr').childNodes
            }
    
            return body.childNodes
        } // CSS selector string
    
        return root.querySelectorAll(expr)
    } // native NodeList
  
  
    if (expr.constructor === NodeList) {
        return expr
    } // self Node
  
  
    if (expr.length !== undefined && expr.each) {
        const nodes = []
        expr.each(function (node) {
            nodes.push(node)
        })
        return nodes
    } // Node Array
  
  
    if (Array.isArray(expr)) {
        return expr;
    } // fragment
  
    if (expr.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        const _nodes = []
        let node = expr.firstChild
    
        while (node) {
            _nodes.push(node)
            node = node.nextSibling
        }
    
        return _nodes
    } // native Node
  
    return [expr]
  }
  
 export default (expr, root) => {
    const nodes = exprToNodes(expr, root)
    return new NodeModel(nodes, root)
}