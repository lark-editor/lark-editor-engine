import getNodeModel from '../models/node'
import { LAKE_ELEMENT } from '../constants/bookmark'
import { CARD_ELEMENT_KEY,CARD_KEY,READY_CARD_KEY,CARD_VALUE_KEY,CARD_TYPE_KEY } from '../constants/card'
import { VOID_TAG_MAP } from '../constants/tags'
import { escape,unescape,removeUnit,toHex,transformCustomTags } from '../utils/string'
import transform from './transform'
import filter from './filter'
/**
* data type:
*
* Value: <p>foo</p><p><br /><cursor /></p>
* LowerValue: <p>foo</p><p><br /><span data-lake-element="cursor"></span></p>
* DOM: HTML DOM tree
* Markdown: ### heading
* Text: plain text
*
*/
const walkTree = (node, conversionRules, callbacks, isCardNode) => {
    isCardNode = isCardNode === undefined ? false : isCardNode
    let child = node.first()

    while (child) {
        if (child.isElement()) {
            let name = child.name
            let attrs = child.attr()
            let styles = child.css()
            delete attrs.style
            // 光标相关节点
            if (attrs[LAKE_ELEMENT]) {
                name = attrs[LAKE_ELEMENT].toLowerCase()
                attrs = {}
                styles = {}
            } 
            // 卡片相关节点
            if (['left', 'right'].indexOf(attrs[CARD_ELEMENT_KEY]) >= 0) {
                child = child.next()
                continue
            }

            if (attrs[CARD_KEY] || attrs[READY_CARD_KEY]) {
                name = 'card'
                const value = attrs[CARD_VALUE_KEY]
                attrs = {
                    type: attrs[CARD_TYPE_KEY],
                    name: (attrs[CARD_KEY] || attrs[READY_CARD_KEY]).toLowerCase()
                }

                if (value !== undefined) {
                    attrs.value = value
                }
                styles = {}
            } 
            // 转换标签
            name = transform(conversionRules, name, attrs, styles, isCardNode)
            // 执行回调函数
            if (attrs[CARD_ELEMENT_KEY] !== 'center') {
                if(callbacks.onOpenTag){
                    callbacks.onOpenTag(name, attrs, styles)
                }
                if(callbacks.onOpenNode){
                    callbacks.onOpenNode(child)
                }
            } 
            // 卡片不遍历子节点
            if (name !== 'card') {
                walkTree(child, conversionRules, callbacks, isCardNode)
            } 
            // 执行回调函数
            if (attrs[CARD_ELEMENT_KEY] !== 'center' && !VOID_TAG_MAP[name]) {
                if(callbacks.onCloseTag){
                    callbacks.onCloseTag(name, attrs, styles)
                }
                if(callbacks.onCloseNode){
                    callbacks.onCloseNode(child)
                }
            }
        }

        if (child.isText()) {
            let text = escape(child[0].nodeValue); 
            // 为了简化 DOM 操作复杂度，删除 block 两边的空白字符，不影响渲染展示
            if (child.parent().isBlock()) {
                if (!child.prev()) {
                    text = text.replace(/^[ \n]+/, '')
                }

                if (!child.next()) {
                    text = text.replace(/[ \n]+$/, '')
                }
            } 
            // 删除两个 block 中间的空白字符
            // <p>foo</p>\n<p>bar</p>
            if (child.prev() && child.prev().isBlock() && child.next() && child.next().isBlock() && text.trim() === '') {
                text = text.trim()
            } 
            // 删除 zero width space
            text = text.replace(/\u200B/g, '')
            if(callbacks.onText){
                callbacks.onText(text)
            }
            if(callbacks.onTextNode){
                callbacks.onTextNode(child)
            }
        }
        child = child.next()
    }
}

const escapeAttr = value => {
    return value.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const attrsToString = attrs => {
    let attrsString = ''
    Object.keys(attrs).forEach(key => {
        if (key === 'style') {
            return
        }
        const val = escapeAttr(attrs[key])
        attrsString += " ".concat(key, "=\"").concat(val, "\"")
    })
    return attrsString.trim()
}

const stylesToString = styles => {
    let stylesString = ''
    Object.keys(styles).forEach(key => {
        let val = escape(styles[key])

        if (/^(padding|margin|text-indent)/.test(key) && removeUnit(val) === 0) {
            return
        }

        if (/[^a-z]color$/.test(key)) {
            val = toHex(val)
        }

        stylesString += " ".concat(key, ": ").concat(val, ";")
    })
    return stylesString.trim()
}

const pToDiv = value => {
    return value.replace(/<p(>|\s+[^>]*>)/ig, '<div$1').replace(/<\/p>/ig, '</div>')
}

class HTMLParser{
    constructor(source, schema, conversion, onParse){
        this.schemaRules = schema ? schema.getValue() : null
        this.conversionRules = conversion ? conversion.getValue() : null

        if (typeof source === 'string') {
            // bugfix：在 p 里包含 div 标签时 DOMParser 解析错误
            // <p><div>foo</div></p>
            // 变成
            // <p></p><div>foo</div><p></p>
            source = pToDiv(source)
            this.source = transformCustomTags(source)
            const doc = new DOMParser().parseFromString(this.source, 'text/html')
            this.root = getNodeModel(doc.body)
        } else {
            this.root = getNodeModel(source)
        }

        if (onParse) {
            onParse(this.root)
        }
    }
    // 遍历 DOM 树，生成符合标准的 XML 代码
    toValue() {
        const result = []
        walkTree(this.root, this.conversionRules, {
            onOpenTag:(name, attrs, styles) => {
                if (filter(this.schemaRules, name, attrs, styles)) {
                    return
                }
                result.push('<')
                result.push(name)
    
                if (Object.keys(attrs).length > 0) {
                    result.push(' ' + attrsToString(attrs))
                }
    
                if (Object.keys(styles).length > 0) {
                    const stylesString = stylesToString(styles)
                    if (stylesString !== '') {
                        result.push(' style="')
                        result.push(stylesString)
                        result.push('"')
                    }
                }
    
                if (VOID_TAG_MAP[name]) {
                    result.push(' />')
                } else {
                    result.push('>')
                }
            },
            onText:text => {
                result.push(text)
            },
            onCloseTag:(name, attrs, styles) => {
                if (filter(this.schemaRules, name, attrs, styles)) {
                    return
                }
                result.push("</".concat(name, ">"))
            }
        })
        return result.join('')
    }
    // 返回 DOM 树
    toDOM() {
        const value = transformCustomTags(this.toValue())
        const doc = new DOMParser().parseFromString(value, 'text/html')
        const fragment = doc.createDocumentFragment()
        const nodes = doc.body.childNodes
  
        while (nodes.length > 0) {
            fragment.appendChild(nodes[0])
        }
        return fragment
    }
    // HTML 代码，自定义标签被转化成浏览器能够识别的代码，用于设置到编辑器
    toLowerValue() {
        return transformCustomTags(this.toValue())
    }
    // 转换成纯文本
    toText() {
        const result = []
        walkTree(this.root, this.conversionRules, {
            onOpenTag:name => {
                if (name === 'br') {
                    result.push('\n')
                }
            },
            onText:text => {
                text = unescape(text)
                text = text.replace(/\u00a0/g, ' ')
                result.push(text)
            },
            onCloseNode:node => {
                if (node.isBlock()) {
                    result.push('\n')
                }
            }
        })
        return result.join('').replace(/\n{2,}/g, '\n').trim()
    }
}
export default HTMLParser