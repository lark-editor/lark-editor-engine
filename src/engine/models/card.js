import getNodeModel from './node'
import { CARD_KEY,CARD_TYPE_KEY,CARD_SELECTOR,CARD_ELEMENT_KEY,CARD_LEFT_SELECTOR,CARD_RIGHT_SELECTOR,CARD_VALUE_KEY,READY_CARD_SELECTOR,READY_CARD_KEY , CARD_CENTER_SELECTOR } from '../constants/card'
import { copyNode } from '../utils/clipboard'
import tooltip from '../embed-toolbar/tooltip'
import EmbedToolbar from '../embed-toolbar'
import { getCardRoot } from '../utils/card'
import { encodeCardValue,decodeCardValue,transformCustomTags , randomId } from '../utils/string'
import { getClosestBlock } from '../changes/utils'
import { shrinkRange , findElementsInSimpleRange } from '../utils/range'
import { deleteContent,insertBlock,insertInline,unwrapBlock } from '../changes'

const is_embed = window.location.search.indexOf("view=doc_embed") > 0

const dndTemplate = () => {
    return '\n    <div class="lake-card-dnd" draggable="true" contenteditable="false">\n      <div class="lake-card-dnd-trigger">\n        <span class="lake-icon lake-icon-drag"></span>\n      </div>\n    </div>\n  '
}
  
const readCardToolTemplate = () => {
    return "\n    <div class=\"lake-card-read-tool\"></div>\n  "
}
  
const maximizeHeaderTemplate = (cfg) => {
    const back = cfg.back
    return "\n    <div class=\"header clearfix\" data-transient=\"true\">\n      <div class=\"header-crumb header-crumb-sm\">\n        <a class=\"split\">\n          <span class=\"lake-icon lake-icon-arrow-left\"></span>\n        </a>\n        <a>".concat(back, "</a>\n      </div>\n    </div>\n  ")
}

let open = true
class Card {
    constructor(){
        this.componentClasses = {}
        this.components = []
        this.idCache = {}
    }

    openId(isOpen){
        open = isOpen
    }

    getLang(cfg) {
        const { engine , contentView } = cfg
        if(engine)
            return engine.lang
        if(contentView)
            return contentView.lang
    }

    add(name, componentClass) {
        this.componentClasses[name] = componentClass
    } 

    getId(id, component) {
        const cache = this.idCache
        if(!id)
            id = randomId()
        while (cache[id] && cache[id].component !== component) id = randomId()
        return id
    }

    setId(component) {
        const value = component.value
        if (value && "object" === typeof value) {
            value.id = this.getId(value.id, component)
            this.idCache[value.id] = {
                component: component
            }
        }
    }

    // 创建卡片 DOM 节点
    create(cfg) {
        const { component , engine , contentView } = cfg
        let { cardRoot } = cfg
        const { type , name , value , container } = component
        const readonly = component.state.readonly
        const hasFocus = component.hasFocus === undefined ? !readonly : component.hasFocus;
  
        if (['inline', 'block'].indexOf(type) < 0) {
            throw "".concat(name, ": the type of card must be \"inline\", \"block\"")
        }
  
        const tagName = type === 'inline' ? 'span' : 'div'
        if(cardRoot){
            cardRoot.empty()
        }else{
            cardRoot = getNodeModel("<".concat(tagName, " />"))
        }
        this.components.push({
            node: cardRoot,
            component: component
        })
        cardRoot.attr(CARD_TYPE_KEY, type)
        cardRoot.attr(CARD_KEY, name)
  
        if (hasFocus) {
            container.attr('contenteditable', 'false')
        } else {
            cardRoot.attr('contenteditable', 'false')
        }
  
        this.setValue(cardRoot, value)
        const cardBody = getNodeModel("<".concat(tagName, " ").concat(CARD_ELEMENT_KEY, "=\"body\" />"))
  
        if (hasFocus) {
            var cardLeft = getNodeModel("<span ".concat(CARD_ELEMENT_KEY, "=\"left\">&#8203;</span>"))
            var cardRight = getNodeModel("<span ".concat(CARD_ELEMENT_KEY, "=\"right\">&#8203;</span>"))
            cardBody.append(cardLeft)
            cardBody.append(container)
            cardBody.append(cardRight)
        } else {
            cardBody.append(container)
        }
  
        cardRoot.append(cardBody)
  
        if (component.embedToolbar) {
            this.setToolbar({
                cardRoot: cardRoot,
                component: component,
                engine: engine,
                contentView: contentView
            })
        }
  
        component.cardRoot = cardRoot
        return cardRoot
    }

    // 显示工具栏
    showToolbar(cardRoot) {
        this.find(cardRoot, '.lake-card-dnd').addClass('lake-card-dnd-active')
        this.showCardToolbar(cardRoot)
    }
    // 显示卡片工具栏
    showCardToolbar(cardRoot) {
        const toolbarNode = this.find(cardRoot, '.lake-card-toolbar')
        toolbarNode.addClass('lake-card-toolbar-active')
        toolbarNode.addClass('lake-embed-toolbar-active')
    }
    // 隐藏工具栏
    hideToolbar(cardRoot) {
        this.find(cardRoot, '.lake-card-dnd').removeClass('lake-card-dnd-active')
        this.hideCardToolbar(cardRoot)
    }
    // 隐藏卡片工具栏
    hideCardToolbar(cardRoot) {
        const toolbarNode = this.find(cardRoot, '.lake-card-toolbar')
        toolbarNode.removeClass('lake-card-toolbar-active')
        toolbarNode.removeClass('lake-embed-toolbar-active')
    }
    // 设置卡片工具栏
    setToolbar(cfg) {
        const { cardRoot , component , engine , contentView } = cfg

        let config = component.embedToolbar()
  
        if (!Array.isArray(config)) {
            return
        }
  
        const cardBody = cardRoot.first()
        const lang = this.getLang({
            engine,
            contentView
        })
  
        if (engine) {
            // 拖拽图标
            if (config.find(item => item.type === 'dnd')) {
                const dndNode = getNodeModel(dndTemplate())
                dndNode.on('mouseenter',() => {
                    tooltip.show(dndNode, lang.dnd.tips)
                })

                dndNode.on('mouseleave',() => {
                    tooltip.hide()
                })

                dndNode.on('mousedown',e => {
                    e.stopPropagation()
                    tooltip.hide()
                    this.hideCardToolbar(cardRoot)
                })

                dndNode.on('mouseup',() => {
                    this.showCardToolbar(cardRoot)
                })
                cardBody.append(dndNode)
                config = config.filter(item => item.type !== 'dnd')
            } 
            // 卡片工具栏
            config = config.map(item => {
                if (item.type === 'separator') {
                    return {
                        type: 'node',
                        node: getNodeModel('<span class="lake-embed-toolbar-item-split"></span>')
                    }
                }
    
                if (item.type === 'copy') {
                    return {
                        type: 'button',
                        name: 'copy',
                        iconName: 'copy',
                        title: lang.copy.tips,
                        onClick:() => {
                            if (copyNode(cardRoot,engine.event)) {
                                engine.messageSuccess(lang.copy.success)
                            } else {
                                engine.messageError(lang.copy.error)
                            }
                        }
                    }
                }
    
                if (item.type === 'delete') {
                    return {
                        type: 'button',
                        name: 'delete',
                        iconName: 'delete',
                        title: engine.lang.delete.tips,
                        onClick:() => {
                            engine.change.removeCard(cardRoot)
                            engine.sidebar.restore()
                        }
                    }
                }
    
                if (item.type === 'maximize') {
                    return {
                        type: 'button',
                        name: 'maximize',
                        iconName: 'maximize',
                        title: engine.lang.maximize.tips,
                        onClick: () => {
                            this.maximize({
                                cardRoot,
                                engine,
                                contentView
                            })
                        }
                    }
                }

                if (item.type === 'collapse') {
                    return {
                        type: "button",
                        name: "collapse",
                        iconName: "compact-display",
                        title: engine.lang.collapse.tips,
                        onClick: () => {
                            this.collapse({
                                cardRoot,
                                engine,
                                contentView
                            })
                        }
                    }
                }

                if (item.type === 'expand') {
                    return {
                        type: "button",
                        name: "expand",
                        iconName: "embedded-preview",
                        title: engine.lang.expand.tips,
                        onClick: () => {
                            this.expand({
                                cardRoot,
                                engine,
                                contentView
                            })
                        }
                    }
                }
                return item
            })
            const embedToolbar = new EmbedToolbar({
                list: config
            })
            embedToolbar.root.addClass('lake-card-toolbar')
            embedToolbar.render(cardBody)
        } else {
            if(is_embed)
                return
            const readCardTool = getNodeModel(readCardToolTemplate())
            readCardTool.hide()
            cardRoot.on('mouseenter', () => {
                cardBody.append(readCardTool)
                readCardTool.show()
            })

            cardRoot.on('mouseleave', () => {
                getNodeModel('body').append(readCardTool)
                readCardTool.hide()
            }) 
            config = config.filter(item => {
                return -1 !== ["maximize", "copyContent"].indexOf(item.type)
            })
            // 最大化卡片
            config.map(item => {
                const toolNode = getNodeModel('\n          <span class="lake-icon lake-icon-'.concat(item.type, " lake-card-").concat(item.type, '-trigger"></span>\n        '))
                readCardTool.append(toolNode)

                toolNode.on('mouseenter', () => {
                    tooltip.show(toolNode, lang.tips || lang[item.type].tips)
                })
                toolNode.on('mouseleave', () => {
                    tooltip.hide()
                })
                toolNode.on('click', e => {
                    e.stopPropagation()
                    this[item.type]({
                        cardRoot,
                        engine,
                        contentView
                    })
                    this.hideCardToolbar(cardRoot)
                })
                return item
            })
        }
    }

    copyContent(cfg){
        const { cardRoot } = cfg
        const component = this.getComponent(cardRoot)
        if(component.copyContent){
            component.copyContent()
        }
    }

    getOptions(cfg){
        const { engine , contentView } = cfg
        if(engine)
            return engine.options
        if(contentView)
            return contentView.options
        return undefined
    }

    collapse(cfg){
        const { cardRoot } = cfg 
        const component = this.getComponent(cardRoot)
        if(component.state.collapsed === false){
            component.state.collapsed = true
            if(component.collapse)
                component.collapse()
        }
    }

    expand(cfg){
        const { cardRoot } = cfg
        const component = this.getComponent(cardRoot)
        if(component.state.collapsed === true){
            component.state.collapsed = false
            if(component.expand)
                component.expand()
        }
    }

    defalutMaximize(cfg){
        const { cardRoot,engine,contentView } = cfg
        const lang = this.getLang({
            engine,
            contentView
        })
        const component = this.getComponent(cardRoot)
        const cardBody = this.findByKey(cardRoot, 'body')
        const maximizeHeader = getNodeModel(maximizeHeaderTemplate(lang.maximize))
        const backTrigger = maximizeHeader.find('.header-crumb')
        cardRoot.addClass('lake-card-block-max')
        backTrigger.on('click', () => {
            this.restore({
                cardRoot,
                engine,
                contentView
            })
        })
        cardBody.prepend(maximizeHeader)
        getNodeModel('body').css('overflow', 'hidden')

        if (engine) {
            const container = this.findByKey(cardRoot, 'center')
            container.addClass('edit')
            engine.event.trigger('maximizecard')
            engine.history.clear()
        }

        component.state.maximize = true
        if(component.maximize){
            component.maximize()
        }
    }

    /**
     * maximize card
     * @param {object} cfg - config
     * @property  {object} cardRoot - card root
     * @property  {object} engine - engine
     * @property  {object} contentView - contentView
     */
    maximize(cfg) {
        const { cardRoot,engine,contentView } = cfg
        const { customMaximize } = this.getOptions({
            engine,
            contentView
        })
        const defalutMaximize = () => {
            this.defalutMaximize({
                cardRoot,
                engine,
                contentView
            })
        }
        if(customMaximize && typeof customMaximize === 'function'){
            customMaximize({
                cardRoot,
                engine,
                contentView,
                defalutMaximize
            })
        }
        else
            defalutMaximize()
    }

    defalutRestore(cfg){
        const { cardRoot,engine } = cfg
        const component = this.getComponent(cardRoot)
        getNodeModel('body').css('overflow', 'auto')
        cardRoot.removeClass('lake-card-block-max')
        cardRoot.find('.header').remove()
        if(component.restore){
            component.restore()
        }

        if (engine) {
            const container = this.findByKey(cardRoot, 'center')
            container.removeClass('edit')
            engine.event.trigger('restorecard')
            engine.history.clear()
        } else {
            cardRoot.find('.lake-card-read-tool').hide()
        }
        component.state.maximize = false
    }

    /**
     * restore card
     * @param {object} cfg - config
     * @property  {object} cardRoot - card root
     * @property  {object} engine - engine
     */
    restore(cfg) {
        const { cardRoot,engine,contentView } = cfg
        const { customMaximizeRestore } = this.getOptions({
            engine,
            contentView
        })
        const defalutRestore = () => {
            this.defalutRestore({
                cardRoot,
                engine,
                contentView
            })
        }
        if(customMaximizeRestore && typeof customMaximizeRestore === 'function'){
            customMaximizeRestore({
                cardRoot,
                engine,
                contentView,
                defalutRestore
            })
        }
        else
            defalutRestore()
    }

    // 向上寻找卡片根节点
    closest(node) {
        return getCardRoot(node)
    }

    isInline(cardRoot){
        return cardRoot && cardRoot.length !== 0 && "inline" === cardRoot.attr(CARD_TYPE_KEY)
    }

    isBlock(cardRoot){
        return cardRoot && cardRoot.length !== 0 && "block" === cardRoot.attr(CARD_TYPE_KEY)
    }

    getName(cardRoot){
        if(cardRoot && 0 !== cardRoot.length)
            return cardRoot.attr(CARD_KEY)
        return ""
    }

    getCenter(cardRoot){
        return cardRoot.find(CARD_CENTER_SELECTOR)
    }

    isCenter(cardRoot){
        return "center" === cardRoot.attr(CARD_ELEMENT_KEY)
    }

    isCursor(node){
        return this.isLeftCursor(node) || this.isRightCursor(node)
    }

    isLeftCursor(node) {
        return getNodeModel(node).closest(CARD_LEFT_SELECTOR).length > 0
    }

    isRightCursor(node) {
        return getNodeModel(node).closest(CARD_RIGHT_SELECTOR).length > 0
    }

    getComponent(cardRoot) {
        const list = this.components.filter(item => item.node[0] === cardRoot[0])
        if (list.length === 0)
            return
  
        return list[0].component
    }

    removeComponent(cardRoot) {
        this.components.forEach((item, index) => {
            if (item.node[0] === cardRoot[0]) {
                this.components.splice(index, 1)
                return false
            }
        })
    }

    // 获取卡片内的 DOM 节点
    find(cardRoot, selector) {
        const nodeList = cardRoot.find(selector)
        // 排除子卡片里的节点
        const newNodeList = []
        nodeList.each(node => {
            const subCardRoot = this.closest(node)
            if (subCardRoot && subCardRoot[0] === cardRoot[0]) {
                newNodeList.push(node)
            }
        })
        return getNodeModel(newNodeList)
    }
    // 通过 data-card-element 的值，获取当前卡片内的 DOM 节点
    findByKey(cardRoot, key) {
        return this.find(cardRoot, "[".concat(CARD_ELEMENT_KEY, "=").concat(key, "]"))
    }

    getSingleCardRoot(rang){
        let ancestorContainer = this.closest(rang.commonAncestorContainer)
        if(!ancestorContainer){
            ancestorContainer = this.getSingleSelectedCard(rang)
        }
        return ancestorContainer || null
    }

    getSingleSelectedCard(rang){
        const element = findElementsInSimpleRange(rang)
        let node = element[0]
        if(element.length === 1 && node){
            node = getNodeModel(node)
            if(node.isCard()){
                return node
            }
        }
    }
    // 光标放到卡片上
    focus(range, cardRoot, toStart) {
        const cardLeft = this.findByKey(cardRoot, 'left')
        const cardRight = this.findByKey(cardRoot, 'right')
  
        if (cardLeft.length === 0 || cardRight.length === 0) {
            return
        }
  
        range.selectNodeContents(toStart ? cardLeft[0] : cardRight[0])
        range.collapse(false)
    }
    // 设置 DOM 属性里的数据
    setValue(cardRoot, value) {
        if (value == null) {
            return
        }
        const component = this.getComponent(cardRoot)
        if (component) {
            if("object" === typeof component.value && component.value.id){
                value.id = component.value.id
            }
            if(component.constructor.uid && open){
                this.setId(component)
            }
            component.value = value
        }
  
        value = encodeCardValue(value)
        cardRoot.attr(CARD_VALUE_KEY, value)
    }
    // 获取 DOM 属性里的数据
    getValue(cardRoot) {
        let value = cardRoot.attr(CARD_VALUE_KEY)
  
        if (!value)
            return
  
        return decodeCardValue(value)
    }
    // 焦点移动到上一个 Block
    focusPrevBlock(range, cardRoot, hasModify) {
        let prevBlock
  
        if (cardRoot.attr(CARD_TYPE_KEY) === 'inline') {
            const block = getClosestBlock(cardRoot)
            if (block.isRoot()) {
                prevBlock = cardRoot.prevElement()
            } else {
                prevBlock = block.prevElement()
            }
        } else {
            prevBlock = cardRoot.prevElement()
        }
  
        if (hasModify) {
            if (!prevBlock || prevBlock.attr(CARD_KEY)) {
                const _block = getNodeModel('<p><br /></p>')
                cardRoot.before(_block)
                range.selectNodeContents(_block[0])
                range.collapse(false)
                return
            }
        } else {
            if (!prevBlock) {
                return
            }
    
            if (prevBlock.attr(CARD_KEY)) {
                this.focus(range, prevBlock, false)
                return
            }
        }
  
        range.selectNodeContents(prevBlock[0])
        shrinkRange(range)
        range.collapse(false)
    }
    // 焦点移动到下一个 Block
    focusNextBlock(range, cardRoot, hasModify) {
        let nextBlock
        if (cardRoot.attr(CARD_TYPE_KEY) === 'inline') {
            const block = getClosestBlock(cardRoot)
    
            if (block.isRoot()) {
                nextBlock = cardRoot.nextElement()
            } else {
                nextBlock = block.nextElement()
            }
        } else {
            nextBlock = cardRoot.nextElement()
        }
  
        if (hasModify) {
            if (!nextBlock || nextBlock.attr(CARD_KEY)) {
                const _block = getNodeModel('<p><br /></p>')
                cardRoot.after(_block)
                range.selectNodeContents(_block[0])
                range.collapse(false)
                return
            }
        } else {
            if (!nextBlock) {
                return
            }
    
            if (nextBlock.attr(CARD_KEY)) {
                this.focus(range, nextBlock, false)
                return
            }
        }
  
        range.selectNodeContents(nextBlock[0])
        shrinkRange(range)
        range.collapse(true)
    }
    // 插入卡片
    insertNode(range, component, engine) {
        const isInline = component.type === 'inline'; // const container = isInline ? $('<span />') : $('<div />');
        // container.attr(CARD_ELEMENT_KEY, 'center');
        // 范围为折叠状态时先删除内容
  
        if (!range.collapsed) {
            deleteContent(range)
        } 
        this.gc()
        // 插入新 Card
        const cardRoot = this.create({
          component,
          engine
        })
  
        if (isInline) {
            insertInline(range, cardRoot)
        } else {
            insertBlock(range, cardRoot, true)
        }
  
        this.focus(range, cardRoot) 
        // 矫正错误 HTML 结构
        if (['ol', 'ul','blockquote'].indexOf(cardRoot.parent().name) >= 0) {
            unwrapBlock(range, cardRoot.parent())
        }
        this.render(component.container, component)
        if (component.didInsert) {
            component.didInsert(component.value)
        }
        return cardRoot
    }

    // 移除卡片
    removeNode(cardRoot, engine) {
        const component = this.getComponent(cardRoot)
        if(component){
            this.destroyComponent(component)
            if (component.type === 'block' && engine) {
                engine.readonly(false)
            }
            this.removeComponent(cardRoot)
            cardRoot.remove()
        }
    }

    destroyComponent(component) {
        if(component.destroy && component.engine){
            component.destroy()
        }
        const value = component.value
        if (value && typeof value === "object") {
            if(value.id && this.idCache[value.id])
                delete this.idCache[value.id]
        }
    }

    // 更新卡片
    updateNode(cardRoot, component) {
        this.destroyComponent(component)
        const container = this.findByKey(cardRoot, 'center')
        container.empty()
        this.setValue(cardRoot, component.value)
        this.render(container, component)
        if (component.didUpdate) {
            component.didUpdate(component.value)
        }
    }
    // 将指定节点替换成等待创建的卡片 DOM 节点
    replaceNode(node, name, value) {
        const componentClass = this.componentClasses[name]
        const type = componentClass.type
        const html = transformCustomTags("<card type=\"".concat(type, "\" name=\"").concat(name, "\"></card>"))
        const readyCardRoot = getNodeModel(html)
        this.setValue(readyCardRoot, value)
        node.before(readyCardRoot)
        readyCardRoot.append(node)
    }
    // 销毁不存在节点的卡片控件
    gc() {
        for (let i = 0; i < this.components.length; i++) {
            const cardRoot = this.components[i].node
            const component = this.components[i].component 
            // 正常卡片
            if (cardRoot[0] && cardRoot.closest('body').length > 0) {
                continue
            } 
            this.destroyComponent(component)
            this.components.splice(i, 1)
            i--
        }
    }
    // 渲染一个卡片
    render(container, component) {
        try {
            const { cardRoot , value } = component
            if(value && typeof value === 'object' &&  value.id){
                cardRoot.attr('id',value.id)
            }
            component.render(container, component.value)
        } catch (err) {
            console.error('render error: ', err)
        }
    }

    createComponent(cfg) {
        const { name,engine,contentView } = cfg
        let { value } = cfg
        const componentClass = this.componentClasses[name]
        if(componentClass.type === "block" && open){
            value = value || {}
            componentClass.uid = true
        }
    
        if (componentClass) {
            const component = new componentClass(engine, contentView) 
            // 设置卡片只读属性
            component.engine = engine
            component.contentView = contentView
            component.state = {
                readonly:!engine,
                collapsed:false
            }
            component.type = componentClass.type
            component.name = name
            component.value = value
            // 生成卡片容器
            const container = component.type === 'inline' ? getNodeModel('<span />') : getNodeModel('<div />')
            container.attr(CARD_ELEMENT_KEY, 'center') 
            // 设置卡片只读属性
            component.container = container
            return component
        }
        return null
    } 

    reRenderAll(root , engine){
        root = getNodeModel(root)
        const nodeList = root.isCard() ? root : root.find(CARD_SELECTOR)
        this.gc()
        nodeList.each(node => {
            const cardRoot = getNodeModel(node)
            const key = cardRoot.attr(CARD_KEY)
            const commentClass = this.componentClasses[key]
            if(commentClass){
                let component = this.getComponent(cardRoot)
                if(component){
                    this.destroyComponent(component)
                }
                this.removeComponent(cardRoot)
                const value = this.getValue(cardRoot)
                component = this.createComponent({
                    name:key,
                    engine,
                    value
                })
                this.create({
                    component,
                    engine,
                    cardRoot
                })
                this.render(component.container,component)
            }
        })
    }

    // 对所有待创建的卡片进行渲染
    renderAll(root, engine, contentView) {
        root = getNodeModel(root)
        const nodeList = root.find(READY_CARD_SELECTOR)
        this.gc()
        nodeList.each(node => {
            node = getNodeModel(node)
            const name = node.attr(READY_CARD_KEY)
            const componentClass = this.componentClasses[name]
    
            if (!componentClass) {
                return
            }
    
            const value = this.getValue(node)
    
            const component = this.createComponent({
                name,
                engine,
                contentView,
                value
            })
            // 替换空的占位标签
            const cardRoot = this.create({
                component,
                engine,
                contentView
            })
    
            node.replaceWith(cardRoot)
            // 重新渲染
            this.render(component.container, component)
        })
    }
}
export default Card