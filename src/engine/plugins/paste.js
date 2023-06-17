import tinycolor2 from 'tinycolor2'
import getNodeModel from '../models/node'
import { CARD_SELECTOR,READY_CARD_KEY,READY_CARD_SELECTOR } from '../constants/card'
import { ROOT_SELECTOR } from '../constants/root'
import { fetchAllChildren,isEmptyNodeWithTrim,removeSideBr,normalize,removeMinusStyle } from '../utils/node'
import { createBookmark,moveToBookmark } from '../utils/range'
import { unwrapNode,setNode,brToParagraph,addListStartNumber } from '../changes/utils'
import ParserHtml from '../parser/html'
import ParserText from '../parser/text'
import ParserMarkdown from '../parser/markdown'

const getDefaultStyleList = function() {
    const defaultStyleList = [{
        color: tinycolor2(this.editArea.css('color')).toHex()
    }, {
        'background-color': tinycolor2('white').toHex()
    }, {
        'font-size': this.editArea.css('font-size')
    }]
    // 表格里的子编辑器，需要添加主编辑器的颜色
    const cardRoot = this.editArea.closest(CARD_SELECTOR)
    if (cardRoot.length > 0) {
        const editArea = cardRoot.closest(ROOT_SELECTOR)
        defaultStyleList.push({
            color: tinycolor2(editArea.css('color')).toHex()
        })
        defaultStyleList.push({
            'background-color': tinycolor2(editArea.css('background-color')).toHex()
        })
    }
    return defaultStyleList
}

const commonNormalize = function(fragment) {
    const defaultStyleList = getDefaultStyleList.call(this) 
    // 第一轮预处理，主要处理 span 节点
    let nodes = fetchAllChildren(fragment)
    nodes.forEach(node => {
        node = getNodeModel(node)
        // 跳过卡片
        if (node.isCard()) {
            return
        } 
        // 删除与默认样式一样的 inline 样式
        if (node.isElement()) {
            defaultStyleList.forEach(item => {
                const key = Object.keys(item)[0]
                const defaultValue = item[key]
                let currentValue = node[0].style[key]
                if (currentValue) {
                    if (/color$/.test(key)) {
                        currentValue = tinycolor2(currentValue).toHex()
                    }
                    if (currentValue === defaultValue) {
                        node.css(key, '')
                    }
                }
            })
        } 
        removeMinusStyle(node, "text-indent")
        // 删除从表格复制的背景样式
        if (node.name === 'span' && this.domEvent.copySource === 'table') {
            node.css('background-color', '')
        } 
        if(["ol", "ul"].includes(node.name)){
            node.css("padding-left", "")
        }
        // 删除空 style 属性
        if (node.isElement()) {
            if (!node.attr('style')) {
                node.removeAttr('style')
            }
        } 
        // 删除空 span
        if (node.name === 'span' && Object.keys(node.attr()).length === 0 && Object.keys(node.css()).length === 0 && (node.text().trim() === '' || node.first() && (node.first().isMark() || node.first().isBlock()))) {
            unwrapNode(node)
            return
        } 
        
        // br 换行改成正常段落
        if (node.isBlock()) {
            brToParagraph(node)
        }
    }) 
    // 第二轮处理
    nodes = fetchAllChildren(fragment)
    nodes.forEach(node => {
        node = getNodeModel(node)
        // 跳过已被删除的节点
        if (!node.parent()) {
            return
        } 
        // 删除 google docs 根节点
        // <b style="font-weight:normal;" id="docs-internal-guid-e0280780-7fff-85c2-f58a-6e615d93f1f2">
        if (/^docs-internal-guid-/.test(node.attr('id'))) {
            unwrapNode(node)
            return
        } 
        // 跳过卡片
        if (node.attr(READY_CARD_KEY)) {
            return
        } 
        // 删除零高度的空行
        if (node.isBlock() && node.attr('data-type') !== 'p' && !node.isVoid() && !node.isSolid() && node.html() === '') {
            node.remove()
            return
        } 
        // 语雀段落
        if (node.attr('data-type') === 'p') {
            node.removeAttr('data-type')
        } 
        // 补齐 ul 或 ol
        if (node.name === 'li' && ['ol', 'ul'].indexOf(node.parent().name) < 0) {
            const ul = getNodeModel('<ul />')
            node.before(ul)
            ul.append(node)
            return
        } 
        // 补齐 li
        if (['ol', 'ul'].indexOf(node.name) >= 0 && ['ol', 'ul'].indexOf(node.parent().name) >= 0) {
            const li = getNodeModel('<li />')
            node.before(li)
            li.append(node)
            return
        } 
        // <li>two<ol><li>three</li></ol>four</li>
        if (['ol', 'ul'].indexOf(node.name) >= 0 && node.parent().name === 'li' && (node.prev() || node.next())) {
            const parent = node.parent()
            let li;
            const hasList = parent.parent().hasClass("lake-list")
            parent.children().each(child => {
                child = getNodeModel(child)
                if (isEmptyNodeWithTrim(child)) {
                    return
                }
                const isList = ['ol', 'ul'].indexOf(child.name) >= 0
                if (!li || isList) {
                    li = hasList ? getNodeModel('<li class="lake-list-node lake-list-task" />') : getNodeModel('<li />')
                    parent.before(li)
                }
                li.append(child)
                if (isList) {
                    li = null
                }
            })
            parent.remove()
            return
        } 
        // p 改成 li
        if (node.name === 'p' && ['ol', 'ul'].indexOf(node.parent().name) >= 0) {
            setNode(node, '<li />')
            return
        } 
        // 处理空 Block
        if (node.isBlock() && !node.isVoid() && node.html().trim() === '') {
            // <p></p> to <p><br /></p>
            if (node.isHeading() || node.name === 'li') {
                node.html('<br />')
            }
        } 
        // <li><p>foo</p></li>
        if (node.isHeading() && node.parent().name === 'li') {
            // <li><p><br /></p></li>
            if (node.children().length === 1 && node.first().name === 'br') {
                // nothing
            } else {
                node.after('<br />')
            }
            unwrapNode(node)
            return
        } 
        // 移除两边的 BR
        removeSideBr(node)
    })
}

const removeElementNodes = fragment => {
    const nodes = fetchAllChildren(fragment)
    nodes.forEach(node => {
        node = getNodeModel(node)
        if (node.isElement()) {
            unwrapNode(node)
        }
    })
}

const normalizePaste = function(fragment){
    commonNormalize.call(this, fragment)
    const range = this.change.getRange()
    const ancestor = getNodeModel(range.commonAncestorContainer)
    // 光标在行内代码里
    if (ancestor.closest('code').length > 0) {
        removeElementNodes.call(this, fragment)
        return
    }
    if (ancestor.isText() && range.startContainer === range.endContainer) {
        const text = ancestor[0].nodeValue
        const leftText = text.substr(0, range.startOffset)
        const rightText = text.substr(range.endOffset)
        // 光标在 [text](|) 里
        if (/\[.*?\]\($/.test(leftText) && /^\)/.test(rightText)) {
            removeElementNodes.call(this, fragment)
            return
        }
    }

    let nodes = fetchAllChildren(fragment)
    nodes.forEach(node => {
        node = getNodeModel(node)
        this.event.trigger('paste:each', node)
    })
    nodes = fetchAllChildren(fragment)
    nodes.forEach(node => {
        node = getNodeModel(node)
        // 删除包含卡片的 pre 标签
        if (node.name === 'pre' && node.find(READY_CARD_SELECTOR).length > 0) {
            unwrapNode(node)
        }
    })
    normalize(fragment)
    nodes = fetchAllChildren(fragment)
    nodes.forEach(node => {
        node = getNodeModel(node)
        if(["ol", "ul"].includes(node.name)){
            addListStartNumber(node)
        }
    })
}

export default {
    initialize:function() {
        // 添加命令
        this.command.add('paste', {
            execute:source => {
                const schema = this.schema.clone()
                const conversion = this.conversion.clone()
                schema.add(
                    [
                        'pre', 
                        {
                            span: 
                            {
                                'data-type': '*',
                                style: {
                                    'font-size': '@length'
                                }
                            }
                        }, 
                        {
                            p: 
                            {
                                'data-type': '*'
                            }
                        }, 
                        {
                            mark: 
                            {
                                id: '*'
                            }
                        }, 
                        {
                            block: {
                                id: '*'
                            }
                        }
                    ]
                )
                this.event.trigger('paste:schema', schema)
                const fragment = new ParserHtml(source, schema, conversion,root => {
                    this.event.trigger('paste:origin', root)
                }).toDOM()
                normalizePaste.call(this, fragment)
                this.event.trigger('paste:before', fragment)
                this.change.insertFragment(fragment,() => {
                    this.event.trigger('paste:insert')
                    const range = this.change.getRange()
                    const bookmark = createBookmark(range)
                    this.card.renderAll(this.editArea, this)
                    moveToBookmark(range,bookmark)
                })
                this.event.trigger('paste:after')
            }
        })
        // 定制粘贴过程
        this.domEvent.onPaste(data =>{
            // 文件上传
            if (data.files.length > 0) {
                this.event.trigger('paste:files', data.files)
            } else {
                let source = ''
                // 纯文本粘贴
                if (data.isPasteText) {
                    let text = ''
                    if (data.html) {
                        text = new ParserHtml(data.html).toText()
                    } else if (data.text) {
                        text = data.text
                    }
                    source = new ParserText(text).toHTML()
                } else {
                    // 富文本粘贴
                    if (data.html) {
                        source = data.html
                    } else if (data.text) {
                        var _text = data.text
                        // 链接粘贴走 markdown 解析
            
                        if (/^https?:\/\/\S+$/.test(_text)) {
                            source = new ParserMarkdown().toHTML(_text)
                        } else {
                            source = new ParserText(_text).toHTML()
                        }
                    }
                }
        
                const prevValue = this.change.getValue()
                this.event.trigger('paste:string', data, prevValue)
                this.command.execute('paste', source)
            }
        })
    }
}