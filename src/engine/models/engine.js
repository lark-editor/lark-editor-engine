import langEN from '../lang/en'
import langZHCN from '../lang/zh-cn'
import Card from './card'
import Plugin from './plugin'
import getNodeModel from './node'
import { createBookmark,moveToBookmark } from '../utils/range'
import { removeMinusStyle } from '../utils/node'
import { writeClipboard  , onCut } from '../utils/clipboard'
import { removeBookmarkTags } from '../utils/string'
import { LAKE_ELEMENT } from '../constants/bookmark'
import { ROOT,ROOT_KEY } from '../constants/root'
import { CARD_SELECTOR } from '../constants/card'
import { addOrRemoveBr } from '../changes/utils'
import typingKeydown from '../typing/keydown'
import typingKeyup from '../typing/keyup'
import ParserSchema from '../parser/schema'
import ParserConversion from '../parser/conversion'
import constantsSchema from '../constants/schema'
import Change from './change'
import Event from './event'
import EventEmitter2 from 'eventemitter2'
import Command from './command'
import Hotkey from './hotkey'
import OT from '../ot'
import { toDOM } from '../ot/jsonml';

const language = {
    en: langEN,
    'zh-cn':langZHCN
}
const card = new Card()
const plugin = new Plugin()
  
const normalizeTree = function() {
    let block = getNodeModel('<p />')
    const range = this.change.getRange()
    const bookmark = createBookmark(range) 
    // 保证所有行内元素都在段落内
    this.editArea.children().each(node => {
        node = getNodeModel(node)

        if (node.isBlock()) {
            if (block.children().length > 0) {
                node.before(block)
            }
            block = getNodeModel('<p />')
        } else {
            block.append(node)
        }
    })

    if (block.children().length > 0) {
        this.editArea.append(block)
    } 
    // 处理空段落
    this.editArea.children().each(node => {
        node = getNodeModel(node)
        removeMinusStyle(node, "text-indent")
        if (node.isHeading()) {
            const childrenCount = node.children().length
            if (childrenCount === 0) {
                node.remove()
            }else{
                const child = node.first()
                if (childrenCount === 1 && child.name === 'span' && ['cursor', 'anchor', 'focus'].indexOf(child.attr(LAKE_ELEMENT)) >= 0) {
                    node.prepend('<br />')
                }
            }
        }
    })
    moveToBookmark(range, bookmark)
}
  
const setAttributes = function(){
    const editArea = this.editArea
    const options = this.options
    editArea.attr(ROOT_KEY, ROOT)
    editArea.attr({
        contenteditable: 'true',
        role: 'textbox',
        autocorrect: this.options.lang === 'en' ? 'on' : 'off',
        autocomplete: 'off',
        spellcheck: this.options.lang === 'en' ? 'true' : 'false',
        'data-gramm': 'false'
    })
  
    if (!editArea.hasClass('lake-engine')) {
        editArea.addClass('lake-engine')
    }
  
    if (options.tabIndex !== undefined) {
        editArea.attr('tabindex', options.tabIndex)
    }
  
    if (options.className !== undefined) {
        editArea.addClass(options.className)
    }
}
  
const removeAttributes = function() {
    const editArea = this.editArea
    const options = this.options
    editArea.removeAttr(ROOT_KEY)
    editArea.removeAttr('contenteditable')
    editArea.removeAttr('role')
    editArea.removeAttr('autocorrect')
    editArea.removeAttr('autocomplete')
    editArea.removeAttr('spellcheck')
    editArea.removeAttr('data-gramm')
    editArea.removeAttr('tabindex')
    editArea.removeClass(options.className)
    // 卡片里的编辑器
    if (this.card.closest(editArea)) {
        editArea.removeClass('lake-engine')
    }
}
  
const initPlugin = function() {
    plugin.execute(this, 'initialize')
}

const clickBottomArea = function(e){
    if (getNodeModel(e.target).isRoot()) {
        const lastBlock = this.editArea.last()
        if (lastBlock) {
            if (!lastBlock.isCard() && "blockquote" !== lastBlock.name) return
            if (lastBlock[0].offsetTop + lastBlock[0].clientHeight > e.offsetY) return
        }
        const node = getNodeModel("<p><br /></p>")
        this.editArea.append(node)
        const range = this.change.getRange()
        range.selectNodeContents(node[0])
        range.collapse(false)
        this.change.select(range)
    }
}
  
const initEvents = function() {
    // fix：输入文字时，前面存在 BR 标签，导致多一个换行
    // 不能用 this.domEvent.onInput，因为输入中文时不会被触发
    this.editArea.on('input', e => {
        if (this.isReadonly) {
            return
        }
    
        if (this.card.closest(e.target)) {
            return
        }
  
        addOrRemoveBr(this.change.getRange(),'left')
    }) 
    // 文档尾部始终保持一行
    this.editArea.on('click', e => {
        return clickBottomArea.call(this,e)
    })
    this.editArea.on('keydown', e => {
        return typingKeydown.call(this, e)
    })
    this.editArea.on('keyup', e => {
        return typingKeyup.call(this, e)
    })
    this.editArea.on('focus', () => {
        return this.event.trigger('focus')
    })
    this.editArea.on('blur', () => {
        return this.event.trigger('blur')
    })
}

class Engine {
    constructor(expr, options){
        this.toolbar = {
            set:function() {},
            updateState:function() {},
            restore:function() {},
            disable:function() {} // 在 lake-editor 里覆盖
        }
        this.sidebar = {
            set:function() {},
            close:function() {},
            restore:function() {} // 在 lake-editor 里覆盖
        }
        this.editArea = getNodeModel(expr)
        this.options = options || {}
        setAttributes.call(this)
        this.parentNode = getNodeModel(this.options.parentNode || document.body)
        this.lang = language[this.options.lang || 'zh-cn']
        this.schema = new ParserSchema()
        this.schema.add(constantsSchema)
        this.conversion = new ParserConversion()
        this.change = new Change(this.editArea, {
            engine: this,
            schema: this.schema,
            conversion: this.conversion,
            card: card,
            onChange: value => {
                return this.event.trigger('change', value)
            },
            onSelect: () => {
                return this.event.trigger('select')
            },
            onSetValue: () => {
                return this.event.trigger('setvalue')
            }
        })
        this.doc = this.change.doc
        this.history = this.change.history
        this.domEvent = this.change.domEvent
        this.event = new Event(this) 
        // this.event 不支持 promise，所以另外引入 EventEmitter2，用于异步场景
        this.asyncEvent = new EventEmitter2({
            wildcard: true,
            // should the event emitter use wildcards.
            delimiter: ':',
            // the delimiter used to segment namespaces, defaults to ..
            newListener: false,
            // if you want to emit the newListener event set to true.
            maxListeners: 100 // the max number of listeners that can be assigned to an event, defaults to 10.
        })
        this.command = new Command(this.change)
        this.hotkey = new Hotkey(this.command)
        this.card = card
        this.ot = new OT(this)//ot
        this.isReadonly = false
        initPlugin.call(this)
        initEvents.call(this)
        this.initCut()
    }

    getHtml(parser){
        if (!parser)
            throw "Need to pass in a parser"
        const node = this.editArea[0].cloneNode(true)
        node.removeAttribute("contenteditable")
        node.removeAttribute("tabindex")
        node.removeAttribute("autocorrect")
        node.removeAttribute("autocomplete")
        node.removeAttribute("spellcheck")
        node.removeAttribute("data-gramm")
        node.removeAttribute("role")
        const { html } = parser.parse(node)
        return html
    }

    initCut(){
        this.editArea.on("cut", event => {
            event.stopPropagation()
            writeClipboard(event, undefined, () => {
                onCut()
                this.history.save()
            })
        })
    }

    destroy() {
        removeAttributes.call(this)
        this.editArea.removeAllEvents()
        this.domEvent.destroy()
        this.hotkey.destroy()
        this.card.gc()
        if(this.ot){
            this.ot.destroy()
        }
    }

    isSub() {
        return this.editArea.closest(CARD_SELECTOR).length > 0
    }

    readonly(boolean) {
        if (this.isReadonly === boolean)
            return

        if (boolean) {
            this.hotkey.disable()
            this.editArea.attr('contenteditable', 'false')
        } else {
            this.hotkey.enable()
            this.editArea.attr('contenteditable', 'true')
        }
  
        this.event.trigger('readonly', boolean)
        this.isReadonly = boolean
    }

    on(eventType, listener, rewrite) {
        this.event.on(eventType, listener, rewrite)
        return this
    }

    off(eventType, listener) {
        this.event.off(eventType, listener)
        return this
    }

    setValue(value) {
        this.change.setValue(value)
        normalizeTree.call(this)
        return this
    }

    setJsonValue(value){
        const node = getNodeModel(toDOM(value))
        const attributes = node[0].attributes
        for (let i = 0; i < attributes.length; i++) {
            const { nodeName , nodeValue } = attributes.item(i)
            if(/^data-selection-/.test(nodeName) && "null" !== nodeValue){
                this.editArea.attr(nodeName, nodeValue)
            }
        }
        const html = node.html()
        this.setValue(html)
        return this
    }

    setDefaultValue(value){
        this.history.stop()
        this.setValue(value)
        this.history.start()
        this.history.save(true, false)
    }

    getValue(){
        return this.change.getValue()
    }

    getPureValue(){
        const value = this.change.getValue()
        return removeBookmarkTags(value)
    }

    focus() {
        return this.change.focus()
    }

    focusToStart(){
        return this.change.focusToStart()
    }

    focusToEnd() {
        return this.change.focusToEnd()
    }

    blur() {
        return this.change.blur()
    } 
    // 在 lake-editor 里覆盖
    messageSuccess(string) {
        console.log("messageSuccess: ", string)
    } 
    // 在 lake-editor 里覆盖
    messageError(string) {
        console.error("messageError: ", string)
    }
}

Engine.create = (expr, options) => {
    return new Engine(expr, options)
}
  
Engine.card = card
Engine.plugin = plugin

export default Engine
export {
    clickBottomArea
}