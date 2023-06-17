import getNodeModel from '../models/node'
import { HEADING_TAG_MAP } from '../constants/tags'
import { CURSOR,ANCHOR,LAKE_ELEMENT } from '../constants/bookmark'
import { getAnchorUrl , randomId } from '../utils/string'
import tooltip from '../embed-toolbar/tooltip'
import { copyText } from '../utils/clipboard'
import { getRangeBlocks,unwrapNode,brToParagraph } from '../changes/utils'
import { createBookmark,moveToBookmark } from '../utils/range'
import { fetchAllChildren } from '../utils/node'
const TAGS = Object.keys(HEADING_TAG_MAP)
let getHeadingId;
// 更新标题锚点 ID
export const updateHeadingId = function() {
    if(getHeadingId){
        return getHeadingId.call(this)
    }
    const ids = {}
    this.editArea.find('h1,h2,h3,h4,h5,h6').each(node => {
        node = getNodeModel(node)

        if (!node.parent().isRoot()) {
            node.removeAttr('id')
            return
        }

        let id = node.attr("id")
        if(!id){
            id = randomId()
            node.attr("id",id)
        }
        if(ids[id]){
            while(ids[id]){
                id = randomId()
            }
            node.attr("id",id)
        }
        ids[id] = true
    })
} 

// 重新定位锚点图标位置
const updateAnchorIconPosition = function() {
    const button = getNodeModel('.lake-anchor-button')

    if (button.length === 0) {
        return
    }

    const range = this.change.getRange()
    const block = getNodeModel(range.startContainer).closest('h1,h2,h3,h4,h5,h6')

    if (block.length === 0) {
        button.remove()
        return
    }
    const parentRect = this.parentNode[0].getBoundingClientRect()
    const rect = block[0].getBoundingClientRect()
    const left = Math.round(rect.left - parentRect.left - button[0].clientWidth - 5)
    const top = Math.round(rect.top - parentRect.top + rect.height / 2 - button[0].clientHeight / 2)
    button.css({
        top: "".concat(top, "px"),
        left: "".concat(left, "px")
    })
} 

export const setCustomUpdateHeadingId = function(getCustomId){
    getHeadingId = getCustomId
}

// 显示或隐藏锚点图标
const showAnchorIcon = function() {
    const range = this.change.getRange()
    let button = getNodeModel('.lake-anchor-button')
    const block = getNodeModel(range.startContainer).closest('h1,h2,h3,h4,h5,h6')

    if (block.length === 0 || button.length > 0 && button.find(".lake-icon-".concat(block.name)).length === 0) {
        button.remove()
    }

    if (block.length === 0) {
        return
    }

    if (!block.parent().isRoot()) {
        return
    }

    if (button.find(".lake-icon-".concat(block.name)).length > 0) {
        updateAnchorIconPosition.call(this)
        return
    }

    button = getNodeModel("<span class=\"lake-anchor-button\"><span class=\"lake-icon lake-icon-".concat(block.name, "\"></span></span>"))
    this.parentNode.append(button)
    const parentRect = this.parentNode[0].getBoundingClientRect()
    const rect = block[0].getBoundingClientRect()
    const left = Math.round(rect.left - parentRect.left - button[0].clientWidth - 5)
    const top = Math.round(rect.top - parentRect.top + rect.height / 2 - button[0].clientHeight / 2)
    button.css({
        top: "".concat(top, "px"),
        left: "".concat(left, "px")
    });
    button.addClass('lake-anchor-button-active')
    button.on('mouseenter', () => {
        tooltip.show(button, this.lang.copyAnchor.tips)
    })
    button.on('mouseleave', () => {
        tooltip.hide()
    })
    button.on('mousedown', () => {
        tooltip.hide()
    })
    button.on('click',e => {
        e.preventDefault()
        e.stopPropagation()
        const url = getAnchorUrl(window.location.href, block.attr('id'))

        if (copyText(url)) {
            this.messageSuccess(this.lang.copy.success)
        } else {
            this.messageError(this.lang.copy.error)
        }
    })
}

// 前置处理
const beforeProcess = function() {
    const range = this.change.getRange()
    const blocks = getRangeBlocks(range)
    const bookmark = createBookmark(range)
  
    if (!bookmark) {
        return
    }
    let start
    blocks.forEach(block => {
        const parent = block.parent()
        let first = block.first()
    
        if ([CURSOR,ANCHOR].includes(first.attr(LAKE_ELEMENT))) {
            first = first.next()
        }
    
        if (block.name === 'li' && parent && parent.name === 'ol' && first && first.isText()) {
            start = parseInt(parent.attr('start'), 10) || 1
            first[0].nodeValue = "".concat(start, ". ") + first[0].nodeValue
        }
        brToParagraph(block)
    })
    moveToBookmark(range, bookmark)
    return start
} 
// 后续处理
const afterProcess = function(start) {
    const range = this.change.getRange()
    const blocks = getRangeBlocks(range)
    const bookmark = createBookmark(range)
    if (!bookmark) {
        return
    }
  
    blocks.forEach(block => {
        fetchAllChildren(block).forEach(node => {
            node = getNodeModel(node)
            if (node.name === 'strong' || node.name === 'span' && /^lake-fontsize-\d+$/.test(node[0].className)) {
                unwrapNode(node[0])
                return
            }
    
            if (node.name === 'span') {
                const match = /(?:^|\b)(lake-fontsize-\d+)(?:$|\b)/.exec(node[0].className)
                if (match) {
                    node.removeClass(match[1])
                }
            }
        })
        const parent = block.parent()
        if (start) {
            const parentNext = parent.next()
            if (parentNext && parentNext.name === 'ol' && parentNext.attr('start')) {
                parentNext.attr('start', start + 1)
            }
        }
        if (parent && ['ul', 'ol'].includes(parent.name)) {
            parent.find("[data-lake-card=checkbox]").remove()
            unwrapNode(parent[0])
        }
    })
    moveToBookmark(range, bookmark)
}
const PLUGIN_NAME = 'heading'
export default {
    initialize: function () {
        const options = this.options.heading || {
            showAnchor: true
        }
        const items = Object.assign({} , options.items , {
            h1:{
                hotkey:'mod+opt+1'
            },
            h2:{
                hotkey:'mod+opt+2'
            },
            h3:{
                hotkey:'mod+opt+3'
            },
            h4:{
                hotkey:'mod+opt+4'
            },
            h5:{
                hotkey:'mod+opt+5'
            },
            h6:{
                hotkey:'mod+opt+6'
            }
        })
        // 添加被允许的标签
        this.schema.add(TAGS.map(tag => {
            const item = {}
            item[tag] = {
                id: /^[\w\.\-]+$/
            }
            return item
        }))
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState:() => {
                const blocks = this.change.blocks
        
                if (blocks.length === 0) {
                    return ''
                }
                return TAGS.indexOf(blocks[0].name) >= 0 ? blocks[0].name : ''
            },
            execute:tagName => {
                const currentTagName = this.command.queryState(PLUGIN_NAME)
                if(currentTagName === tagName)
                    tagName = "p"

                this.history.stop()
                const start = beforeProcess.call(this)
                this.change.separateBlocks()
                this.change.setBlocks("<".concat(tagName, " />"))    
                afterProcess.call(this,start)
                this.history.save()
            }
        }) 
        // 展示复制锚点图标
        if (options.showAnchor) {
            this.on('setvalue',() => {
                updateHeadingId.call(this)
            })
            this.on('change',() => {
                updateHeadingId.call(this)
                showAnchorIcon.call(this)
            })
            this.on('select',() => {
                showAnchorIcon.call(this)
            })
        }
        
        // 快捷键
        Object.keys(items).forEach(key => {
            const item = items[key]
            if(item && !!item['hotkey']){
                this.hotkey.set(item['hotkey'], PLUGIN_NAME,key)
            }
        })
    }
}