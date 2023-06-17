import debounce from 'lodash/debounce'
import getNodeModel from './node'
import { shrinkRange,createBookmark,moveToBookmark,upRange } from '../utils/range'
import { getWindow,fetchAllChildren,isEmptyNodeWithTrim,isEmptyNode } from '../utils/node'
import { CARD_TYPE_KEY,CARD_LEFT_SELECTOR,CARD_RIGHT_SELECTOR,CARD_SELECTOR,CARD_ELEMENT_KEY,CARD_CENTER_SELECTOR } from '../constants/card'
import { ROOT_SELECTOR } from '../constants/root'
import { LAKE_ELEMENT,CURSOR_SELECTOR,ANCHOR_SELECTOR,FOCUS_SELECTOR } from '../constants/bookmark'
import { escape } from '../utils/string'
import { getActiveMarks,getActiveBlocks,removeEmptyMarksAndAddBr,getClosestBlock } from '../changes/utils'
import { insertBlock,setBlocks } from '../changes'
import Card from './card'
import DomEvent from './dom-event'
import History from './history'
import ParserHtml from '../parser/html'
import * as changes from '../changes'

function focusRang(range) {
    const node = getNodeModel(range.startContainer)
    const startOffset = range.startOffset
    const cardRoot = this.card.closest(node)
    if(cardRoot){
        const node_center = cardRoot.find(CARD_CENTER_SELECTOR)[0]
        if(node_center && (!node.isElement() || node[0].parentNode !== cardRoot[0] || node.attr(CARD_ELEMENT_KEY))){
            const comparePoint = () => {
                const doc_rang = document.createRange()
                doc_rang.selectNodeContents(node_center)
                return doc_rang.comparePoint(node[0], startOffset) < 0
            }

            if ("inline" === cardRoot.attr(CARD_TYPE_KEY)){
                range.selectNode(cardRoot[0])
                range.collapse(comparePoint())
                return
            }
            
            if(comparePoint()){
                this.card.focusPrevBlock(range, cardRoot, true)
            }else{
                this.card.focusNextBlock(range, cardRoot, true)
            }
        }
    }
}

const repairRange = function(range){
    // 判断 Range 是否可编辑，不可编辑时焦点自动移到编辑区域内
    const ancestor = getNodeModel(range.commonAncestorContainer)
    if(!ancestor.isRoot() && !ancestor.isEditable()){
        range.selectNodeContents(this.editArea[0])
        shrinkRange(range)
        range.collapse(false)
    }

    let rangeClone = range.cloneRange()
    rangeClone.collapse(true) 
    focusRang.call(this, rangeClone)
    range.setStart(rangeClone.startContainer, rangeClone.startOffset)

    rangeClone = range.cloneRange()
    rangeClone.collapse(false)
    focusRang.call(this, rangeClone)
    range.setEnd(rangeClone.endContainer, rangeClone.endOffset)

    if (range.collapsed) {
        rangeClone = range.cloneRange()
        upRange(rangeClone)

        const startNode = getNodeModel(rangeClone.startContainer)
        const startOffset = rangeClone.startOffset

        if(startNode.name === "a" && startOffset === 0){
            range.setStartBefore(startNode[0])
        }
        if(startNode.name === "a" && startOffset === startNode[0].childNodes.length){
            range.setStartAfter(startNode[0])
        }
        range.collapse(true)
    }
} 

function repairInput (range) {
    const ancestor = getNodeModel(range.commonAncestorContainer)
    const cardRoot = this.card.closest(ancestor);

    if (cardRoot && "inline" === cardRoot.attr(CARD_TYPE_KEY)){
        if (this.card.isLeftCursor(ancestor)) {
            const cursorNode = ancestor.closest(CARD_LEFT_SELECTOR)
            let text = cursorNode.text().replace(/\u200B/g, "")
            if(text){
                text = escape(text)
                range.setStartBefore(cardRoot[0])
                range.collapse(true)
                this.select(range)
                cursorNode.html("&#8203;")
                this.insertMark("<span>".concat(text, "</span>"))
                this.mergeMark()
                return
            }
        } else if (this.card.isRightCursor(ancestor)) {
            const cursorNode = ancestor.closest(CARD_RIGHT_SELECTOR)
            let text = cursorNode.text().replace(/\u200B/g, "")
            if(text){
                text = escape(text)
                range.setEndAfter(cardRoot[0])
                range.collapse(false)
                this.select(range)
                cursorNode.html("&#8203;")
                this.insertMark("<span>".concat(text, "</span>"))
                this.mergeMark()
            }
        } 
        else 
            repairRange.call(this, range)
    }
        
}

const isRangeContainsCard = range => {
    return !range.collapsed && 
    (3 !== range.commonAncestorContainer.nodeType && 
        getNodeModel(range.commonAncestorContainer).find(CARD_SELECTOR).length > 0 || 
        getNodeModel(range.commonAncestorContainer).closest(CARD_SELECTOR).length > 0)
}

const selectComponent = (component, selected) => {
    if(component && component.state.readonly || component.state.activatedByOther){
        return
    }
    if(selected){
        if(!component.state.selected){
            component.cardRoot.addClass("lake-selected")
            if(component.select){
                component.select()
            }
            component.state.selected = selected
        }
    }else{
        if(component.state.selected){
            component.cardRoot.removeClass("lake-selected")
            if(component.unselect){
                component.unselect()
            }
            component.state.selected = selected
        }
    }
    
}

const initNativeEvents = function(){
    this.editArea.on('keydown', e => {
        
        if (this.engine.isReadonly || this.card.closest(e.target) || this.history.hasUndo || this.history.hasRedo) {
            return
        }

        if (this.engine && this.engine.ot) {
            this.engine.ot.stopMutation()
        }
        this.history.save()
        if (this.engine && this.engine.ot) {
            this.engine.ot.startMutation()
        }
    }) 
    // 输入文字达到一定数量时候保存历史记录
    const saveHistory = debounce(() => {
        if(!this.domEvent.isComposing){
            this.history.save()
        }
    },300)

    this.domEvent.onInput(e => {
        this.currentRange = null
        const range = this.getRange()
        repairInput.call(this,range)
        saveHistory()
    })

    this.domEvent.onDocument("selectionchange", () => {
        const selection = this.win.getSelection()
        const cardComponents = this.card.components
        if (selection.anchorNode) {
            const rang = selection.getRangeAt(0)
            for (let i = 0; i < cardComponents.length; i++) {
                const card = cardComponents[i]
                const { component , node } = card
                const centerNode = node.find(CARD_CENTER_SELECTOR)[0]
                if(centerNode && component){
                    if(selection.containsNode(centerNode)){
                        selectComponent(component, true)
                    }else{
                        selectComponent(component, false)
                    }
                }
            }
            const card = this.card.getSingleSelectedCard(rang)
            if (card) {
                const component = this.card.getComponent(card)
                if(component){
                    selectComponent(component, true)
                }
            }
        } else{
            cardComponents.forEach(card => {
                selectComponent(card.component, false)
            })
        }
        
    })
    this.domEvent.onSelect(() => {
        this.currentRange = null

        if(!this.history.hasUndo && !this.history.hasRedo){
            if(this.engine && this.engine.ot){
                this.engine.ot.stopMutation()
            }
            this.history.save(true, false)
            if(this.engine && this.engine.ot){
                this.engine.ot.startMutation()
            }
        }
        
        const range = this.getRange()
        if(isRangeContainsCard(range)){
            repairRange.call(this,range)
            this.select(range)
        }
        this.marks = getActiveMarks(range)
        this.blocks = getActiveBlocks(range)
        this.activateCard(range.commonAncestorContainer, "custom_select")
    })

    this.editArea.on('focus', () => {
        this.currentRange = null
    }) 

    if (this.editArea.closest(CARD_SELECTOR).length === 0) {
        this.domEvent.onWindow('beforeunload', () => {
            if (this.engine) {
                this.engine.event.trigger('save:before')
            }
        })
    }

    this.domEvent.onDocument("click", e => {
        const card = this.card.closest(e.target)
        if (card) {
            const component = this.card.getComponent(card)
            if(component && component.type === "inline"){
                this.activateCard(e.target, "click")
            }
        }
    })

    this.domEvent.onDocument('mousedown', e => {
        const target = getNodeModel(e.target) 
        const card = this.card.closest(e.target)
        if(card){
            const component = this.card.getComponent(card);
            if (component && "inline" === component.type)
                return
        }
        // 点击元素已被移除
        if (target.closest('body').length === 0) {
            return
        } 
        // 阅读模式节点
        if (target.closest('.lake-engine-view').length > 0) {
            return
        } 
        // 工具栏、侧边栏、内嵌工具栏的点击
        let node = target
        while (node) {
            const attrValue = node.attr(LAKE_ELEMENT)
            if (attrValue && attrValue !== 'root') {
                return
            }
            node = node.parent()
        }
        this.activateCard(e.target, "mousedown")
    })
}

class Change { 
    constructor(editArea, options){
        options = options || {}
        this.editArea = getNodeModel(editArea)
        this.engine = options.engine
        this.schema = options.schema
        this.conversion = options.conversion
        this.card = options.card || new Card()
        this.domEvent = new DomEvent(this)
        this.onChange = options.onChange || function () {}
        this.onSelect = options.onSelect || function () {}
        this.onSetValue = options.onSetValue || function () {}
        this.win = getWindow(this.editArea[0])
        this.doc = this.win.document
        this.value = ''
        this.marks = []
        this.blocks = []
        this.cache = {}
        this.history = new History(this, {
            onSave:value => {
                const range = this.getRange()
                this.marks = getActiveMarks(range)
                this.blocks = getActiveBlocks(range)
                this.change(value)
            }
        })
        initNativeEvents.call(this)
    }
    // 触发 change 事件
    change(value) {
        this.card.gc()
        this.onChange(value || this.getValue())
    }

    getSelectionRange(){
        const selection = this.win.getSelection()
        let range
        if(selection.rangeCount > 0){
            range = selection.getRangeAt(0)
        }else{
            range = this.doc.createRange()
            range.selectNodeContents(this.editArea[0])
            shrinkRange(range)
            range.collapse(false)
        }
        return range
    }

    // 获取当前选择范围
    getRange() {
        if (this.currentRange) {
            return this.currentRange
        }
        return this.getSelectionRange()
    }
    // 选中指定的范围
    select(range) {
        const selection = this.win.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
        this.currentRange = range
        return this
    } 

    activateCard(activeNode, triggerType){
        activeNode = getNodeModel(activeNode) 
        const editArea = activeNode.closest(ROOT_SELECTOR)
        if(!editArea[0] || this.editArea[0] === editArea[0]){
            let cardRoot = this.card.closest(activeNode)
            if(this.card.isLeftCursor(activeNode) || this.card.isRightCursor(activeNode)){
                cardRoot = undefined
            }
            let isSameCard = cardRoot && this.activeCard && cardRoot[0] === this.activeCard[0]
            if(["updateCard"].indexOf(triggerType) >= 0){
                isSameCard = false
            }
            if(this.activeCard && !isSameCard){
                this.card.hideToolbar(this.activeCard)
                const component = this.card.getComponent(this.activeCard)
                if(component){
                    if(component.unactivate){
                        component.cardRoot.removeClass("lake-activated")
                        component.unactivate(this.activeCard)
                        component.state.activated = false
                    }
                    if("block" === component.type){
                        this.engine.readonly(false)
                    }
                }
            }

            if (cardRoot) {
                const component = this.card.getComponent(cardRoot)
                if(component){
                    if (component.state.activatedByOther)
                        return
                    if(!isSameCard){
                        this.card.showToolbar(cardRoot)
                        if(component.type === "inline" && component.constructor.autoSelected !== false && (triggerType !== "click" || component.state && !component.state.readonly)){
                            this.selectCard(cardRoot)
                        }
                        if(component.activate){
                            component.cardRoot.addClass("lake-activated")
                            component.activate(cardRoot)
                            component.state.activated = true
                        }
                    }
                    if(component.type === "block"){
                        selectComponent(component, false)
                        this.engine.readonly(true)
                    }

                    if(isSameCard || triggerType === "mousedown"){
                        this.engine.event.trigger("focus")
                    }
                }
            }
            this.activeCard = cardRoot
            this.onSelect()
        }
    }

    // 选中卡片
    selectCard(cardRoot) {
        const component = this.card.getComponent(cardRoot)
        const { constructor } = component
        const { singleSelectable } = constructor
        if(singleSelectable !== false && (component.type !== "block" || !component.state.activated)){
            cardRoot = cardRoot[0]
            if(cardRoot){
                const range = this.getRange()
                const parentNode = cardRoot.parentNode
                const nodes = Array.prototype.slice.call(parentNode.childNodes)
                const index = nodes.indexOf(cardRoot)
                range.setStart(parentNode,index)
                range.setEnd(parentNode,index + 1)

                this.select(range)
            }
        }
    } 

    focusCard(card){
        const range = this.getRange()
        this.card.focus(range, card, false)
        this.select(range)
        this.history.update()
        this.onSelect()
    }

    // 焦点放到编辑区域
    focus() {
        const range = this.getRange()
        this.select(range)
        this.editArea[0].focus()
        return this
    } 

    focusToStart(){
        const range = this.getRange()
        range.selectNodeContents(this.editArea[0])
        shrinkRange(range)
        range.collapse(true)
        this.select(range)
        this.editArea[0].focus()
        return this
    }

    // 光标放到内容最后位置
    focusToEnd() {
        const range = this.getRange()
        range.selectNodeContents(this.editArea[0])
        shrinkRange(range)
        range.collapse(false)
        this.select(range)
        this.editArea[0].focus()
        return this
    } 
    // 编辑区域失去焦点
    blur() {
        this.editArea[0].blur()
        return this
    } 
    // 将包含选择范围标签的 HTML 内容设置到容器
    setValue(value) {
        value = value || ''
        const range = this.getRange()
  
        if (value === '') {
            range.setStart(this.editArea[0], 0)
            range.collapse(true)
            this.select(range)
        } else {
            const parser = new ParserHtml(value, this.schema, this.conversion, root => {
                fetchAllChildren(root).forEach(node => {
                    removeEmptyMarksAndAddBr(getNodeModel(node))
                })
            })
            this.editArea.html(parser.toLowerValue())
            this.card.renderAll(this.editArea, this.engine)
            const cursor = this.editArea.find(CURSOR_SELECTOR)
            let bookmark
    
            if (cursor.length > 0) {
                bookmark = {
                    anchor: cursor[0],
                    focus: cursor[0]
                }
            }
    
            const anchor = this.editArea.find(ANCHOR_SELECTOR)
            const focus = this.editArea.find(FOCUS_SELECTOR)
    
            if (anchor.length > 0 && focus.length > 0) {
                bookmark = {
                    anchor: anchor[0],
                    focus: focus[0]
                }
            }
    
            if (bookmark) {
                moveToBookmark(range, bookmark)
                this.select(range)
            }
        }
  
        this.onSetValue()
        this.history.save(false)
    } 

    getValueAndDOM(types){
        types = undefined === types ? ["value", "dom"] : types
        const range = this.getRange()
        let value , dom; 
        if (getNodeModel(range.commonAncestorContainer).closest(CARD_CENTER_SELECTOR).length > 0){
            if(types.includes("value")){
                value = new ParserHtml(this.editArea[0],this.schema).toValue()
            }    
            if(types.includes("dom")){
                dom = this.editArea[0].cloneNode(true)
            }
        }
        else {
            const bookmark = createBookmark(range)
            if(types.includes("value")){
                value = new ParserHtml(this.editArea[0],this.schema).toValue()
            }
            if(types.includes("dom")){
                dom = this.editArea[0].cloneNode(true)
            }
            moveToBookmark(range,bookmark)
        }
        return {
            value,
            dom
        }
    }

    // 将当前内容转换成包含选择范围标签的 XML
    getValue() {
        const result = this.getValueAndDOM(["value"])
        return result.value
    } 

    // 判断编辑内容是否存在可编辑的文本
    isEmpty() {
        return isEmptyNodeWithTrim(this.editArea[0])
    } 

    // 插入并渲染卡片
    insertCard(name, value) {
        const component = this.card.createComponent({
            name,
            value,
            engine: this.engine
        }) 
  
        const range = this.getRange()
        repairRange.call(this, range)
        const cardRoot = this.card.insertNode(range, component, this.engine)
  
        if (component.type === 'inline') {
            this.card.focus(range, cardRoot, false)
            this.select(range)
        } else {
            // 块级卡片前面预留一个空行
            this.card.focus(range, cardRoot, true)
            repairRange.call(this, range)
            const prevBlock = getClosestBlock(range.startContainer)
    
            if (prevBlock.text().trim() !== '') {
                cardRoot.before("<p><br /></p>")
            } 
            // 块级卡片后面面预留一个空行
            this.card.focus(range, cardRoot, false)
            repairRange.call(this, range)

            const nextBlock = getClosestBlock(range.startContainer)
            if (nextBlock.text().trim() !== '') {
                const empty_node = getNodeModel("<p><br /></p>")
                cardRoot.after(empty_node)
                range.setStart(empty_node[0], 1)
                range.collapse(true)
            }
            this.select(range)
        }
        if(component.type === "block"){
            this.activateCard(cardRoot, "insertCard")
        }
        this.history.save(false)
        return cardRoot
    } 
    // 更新卡片
    updateCard(cardRoot, value) {
        const component = this.card.getComponent(cardRoot)
        if (component) {
            component.value = value
            this.card.updateNode(cardRoot, component)
            var range = this.getRange()
            this.card.focus(range, cardRoot, false)
            this.select(range)
            this.history.save(false)
        }
    } 
    // 删除卡片
    removeCard(cardRoot) {
        const range = this.getRange()
        if (this.card.isInline(cardRoot)) {
            range.setEndAfter(cardRoot[0])
            range.collapse(false)
        } else {
            this.card.focusPrevBlock(range, cardRoot, true)
        }
        const parent = cardRoot.parent()
        this.card.removeNode(cardRoot, this.engine)
        if (isEmptyNode(parent)) {
            if (parent.isRoot()) {
                parent.html('<p><br /></p>')
                range.selectNodeContents(parent[0])
                shrinkRange(range)
                range.collapse(false)
            } else {
                parent.html('<br />')
                range.selectNodeContents(parent[0])
                range.collapse(false)
            }
        }
  
        this.select(range)
        this.history.save(false)
    }
}

Object.keys(changes).forEach(method => {
    Change.prototype[method] = function () {
        const args = Array.prototype.slice.call(arguments) // 第一个参数设置成 current range
    
        let range = this.getRange()
        repairRange.call(this, range)
        

        if (["insertFragment"].includes(method)) {
            args.unshift(this.card)
        }
        args.unshift(range)
        if (["splitBlock"].includes(method)) {
            args.push(this.engine)
        } 
        // 执行 changes 目录下的方法
        if (changes[method]) {
            range = changes[method].apply(changes, args)
            this.select(range)
            // 因为可以组合操作，在这里不一定产生历史记录，通过 history.start() 和 history.stop() 控制
            this.history.save(false)
        } 
        return this
    }
})

export default Change
export { repairInput,isRangeContainsCard }