import getNodeModel from '../models/node'
import { removeBlockLeftText,getClosestBlock,getBlockLeftText } from '../changes/utils'
import { isEmptyNode } from '../utils/node'
import { createBookmark,moveToBookmark } from '../utils/range'
import { sanitizeUrl,isCurrentPageUrl } from '../utils/string'

const listTypeMap = {
    orderedlist: 'ol',
    unorderedlist: 'ul'
}

const markType = {
    "`": "code",
    "==": "mark",
    "**": "bold",
    "~~": "strikethrough",
    "_": "italic",
    "^": "sup",
    "~": "sub"
}
  
const getType = chars => {
    if (/^\d{1,9}\.$/.test(chars)) {
        return 'orderedlist'
    }
    switch (chars) {
      case '*':
      case '-':
      case '+':
        return 'unorderedlist'
      case '[]':
      case '[ ]':
        return 'tasklist'
      case '[x]':
        return 'checkedtasklist'
      case '#':
        return 'h1'
      case '##':
        return 'h2'
      case '###':
        return 'h3'
      case '####':
        return 'h4'
      case '#####':
        return 'h5'
      case '######':
        return 'h6'
      case '>':
        return 'quote'
      default:
        return ''
    }
}

const defaultOptions = {
    items : {
        code:{
            enabled:true
        },
        mark:{
            enabled:true
        },
        bold:{
            enabled:true
        },
        strikethrough:{
            enabled:true
        },
        italic:{
            enabled:true
        },
        sup:{
            enabled:true
        },
        sub:{
            enabled:true
        },
        orderedlist:{
            enabled:true
        },
        unorderedlist:{
            enabled:true
        },
        tasklist:{
            enabled:true
        },
        checkedtasklist:{
            enabled:true
        },
        h1:{
            enabled:true
        },
        h2:{
            enabled:true
        },
        h3:{
            enabled:true
        },
        h4:{
            enabled:true
        },
        h5:{
            enabled:true
        },
        h6:{
            enabled:true
        },
        quote:{
            enabled:true
        },
        link:{
            enabled:true
        }
    }
}
  
const removeLeftText = (block, range) => {
    removeBlockLeftText(block, range)
    if (isEmptyNode(block)) {
        block.empty()
        block.append('<br />')
    }
}
  
const processMark = function(e, range){
    const bookmark = createBookmark(range)
  
    if (!bookmark) {
        return
    }
    const prevNode = getNodeModel(bookmark.anchor).prev()
    const prevText = prevNode && prevNode.isText() ? prevNode[0].nodeValue : ''
    moveToBookmark(range, bookmark)
    // 行内代码：<p>foo `bar`<cursor /></p>
    // 高亮文字：<p>foo ==bar==<cursor /></p>
    // 粗体：<p>foo **bar**<cursor /></p>
    // 斜体：<p>foo _bar_<cursor /></p>
    // 删除线：<p>foo ~~bar~~<cursor /></p>
    // 上标：<p>foo ^bar^<cursor /></p>
    // 下标：<p>foo ~bar~<cursor /></p>
    // 快捷键
    const options = this.options.markdown || defaultOptions

    const markTypeKeys = Object.keys(markType)
    for(let i = 0;i < markTypeKeys.length;i++){
        const markKey = markTypeKeys[i]
        const key = markKey.replace(/(\*|\^)/g, "\\$1")
        const match = new RegExp("^(.*)".concat(key, "(.+?)").concat(key, "$")).exec(prevText)
        if(match){
            const visibleChar = match[1] && /\S$/.test(match[1])
            const codeChar = match[2]
            const markName = markType[markKey]
            if(markName === "" || !this.command.queryEnabled(markName) || !options.items[markName].enabled){
                return
            }
            e.preventDefault()
            let leftText = prevText.substr(0, prevText.length - codeChar.length - 2 * markKey.length)
            prevNode[0].splitText((leftText + codeChar).length + 2 * markKey.length)
            if(visibleChar){
                leftText += " "
            }
            prevNode[0].nodeValue = leftText + codeChar
            range.setStart(prevNode[0], leftText.length)
            range.setEnd(prevNode[0], (leftText + codeChar).length)
            this.change.select(range)
            this.history.stop()
            this.command.execute(markName)
            range = this.change.getRange()
            range.collapse(false)
            this.change.select(range)
            this.change.insertText("\xa0")
            this.history.save()
            return false
        }
    }
}
  
const processLink = function(e, range) {
    const bookmark = createBookmark(range)
    if (!bookmark) {
        return
    }

    const options = this.options.markdown || defaultOptions
    if(!options.items.link.enabled)
        return

    const prevNode = getNodeModel(bookmark.anchor).prev()
    const prevText = prevNode && prevNode.isText() ? prevNode[0].nodeValue : ''
    moveToBookmark(range, bookmark)
    const match = /\[(.+?)\]\(([\S]+?)\)$/.exec(prevText)

    if (match) {
        e.preventDefault()
        const text = match[1]
        const url = match[2]
        const target = isCurrentPageUrl(window.location.href,url) ? '' : ' target="_blank"'
        const linkNode = getNodeModel("<a href=\"".concat(sanitizeUrl(url), "\"").concat(target, ">").concat(text, "</a>"))
        this.history.stop()
        // 移除 markdown 语法
        const markdownText = prevNode[0].splitText(prevText.length - match[0].length)
        markdownText.splitText(match[0].length)
        getNodeModel(markdownText).remove()
        this.change.insertInline(linkNode)
        this.change.insertText("\xA0")
        this.history.save()
        return false
    }
}
  
const handleKeydownSpace = function(e) {
    const range = this.change.getRange()
    if (!range.collapsed) {
        return
    }
    if (processMark.call(this, e, range) === false) {
        return
    }
    if (processLink.call(this, e, range) === false) {
        return
    }
  
    const block = getClosestBlock(range.startContainer)
    if (!block.isHeading()) {
        return
    }
  
    const chars = getBlockLeftText(block, range)
    const type = getType(chars) 

    const options = this.options.markdown || defaultOptions

    // 标题
    if (/^h\d$/i.test(type) && this.command.queryEnabled('heading') && options.items[type].enabled) {
        e.preventDefault()
        removeLeftText(block, range)
        this.history.save()
        this.command.execute('heading', type)
        return
    } 
    // fix: 列表、引用等 markdown 快捷方式不应该在标题内生效
    if (/^h\d$/i.test(block.name)) {
        return
    } 
    // 列表
    if (listTypeMap[type] && this.command.queryEnabled('list') && options.items[type].enabled) {
        e.preventDefault()
        removeLeftText(block, range)
        this.history.save()
        this.command.execute('list', type, chars)
        return
    } 
    // 任务列表
    if (['tasklist', 'checkedtasklist'].indexOf(type) >= 0 && this.command.queryEnabled('tasklist') && options.items[type].enabled) {
        e.preventDefault()
        removeLeftText(block, range)
        this.history.save()
        this.command.execute('tasklist', 'tasklist', type !== 'tasklist')
        return
    } 
    // 其它
    if (type === 'quote' && this.command.queryEnabled(type) && options.items[type].enabled) {
        e.preventDefault()
        removeLeftText(block, range)
        this.history.save()
        this.command.execute(type)
        return
    }
}

export default {
    initialize:function() {
        // 快捷键
        this.on('keydown:space', e => {
            handleKeydownSpace.call(this, e)
        })
    }
}