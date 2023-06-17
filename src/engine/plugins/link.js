import getNodeModel from '../models/node'
import tooltip from '../embed-toolbar/tooltip'
import EmbedToolbar from '../embed-toolbar'
import { sanitizeUrl,isCurrentPageUrl , escapeRegExp} from '../utils/string'
import { shrinkRange } from '../utils/range'

const PLUGIN_NAME = 'link'
let toolbarList = []
let canCreateLinkToolbar = true
let canRemoveLinkToolbar = true

const handleWindowScroll = function() {
    toolbarList.forEach(item => {
        item.toolbar.setPosition()
    })
}

const removeAllLinkToolbar = function() {
    window.removeEventListener('scroll', handleWindowScroll, true)
    tooltip.hide()
    toolbarList.forEach(item => {
        item.toolbar.destroy()
    })
    getNodeModel('div[data-lake-element=embed-link-toolbar]').remove()
    toolbarList = []
}

const removeLinkToolbar = function(linkNode) {
    window.removeEventListener('scroll', handleWindowScroll, true)
    tooltip.hide()
    toolbarList.filter(item => {
        return item.node && item.node[0] === linkNode[0]
    }).forEach(item => {
        if (item.toolbar.root[0]) {
            const parent = item.toolbar.root.parent()
            item.toolbar.destroy()
            if(parent)
                parent.remove()
        }
    })
}

const delayRemoveLinkToolbar = function(linkNode) {
    canRemoveLinkToolbar = true
    window.setTimeout(() => {
        if (!canRemoveLinkToolbar) {
            return
        }
        removeLinkToolbar.call(this, linkNode)
    }, 300)
}

const isMailto = function(url) {
    return isCurrentPageUrl(window.location.href, url) || url.startsWith("mailto:")
}

const getUrl = function(url){
    const { origin , pathname } = window.location
    const path = escapeRegExp(origin + pathname.replace("/edit", ""))
    const reg = new RegExp("^".concat(path, "#"))
    return url.replace(reg, "#").trim()
}

const insertLink = function(url, text){
    url = getUrl(url)
    const target = isMailto(url) ? "" : ' target="_blank"'
    const linkNode = getNodeModel("<a href=\"".concat(sanitizeUrl(url), "\"").concat(target, ">").concat(text || url, "</a>"))
    this.change.insertInline(linkNode)
    return linkNode
}

const updateLink = function(linkNode, url) {
    url = getUrl(url)
    linkNode.attr('href', sanitizeUrl(url))

    if (isMailto(url)) {
        linkNode.removeAttr('target')
    }else{
        linkNode.attr("target", "_blank")
    }
    this.history.save()
}

const createLinkToolbar = function(linkNode) {
    const locale = this.lang.link
    if (!linkNode) {
        linkNode = insertLink.call(this, '', locale.linkText)
    }

    let range = this.change.getRange()
    let toolbar
    removeAllLinkToolbar.call(this)

    const itemList = []
    itemList.push({
        type: 'url',
        name: 'link',
        placeholder: locale.linkPlaceholder,
        url: linkNode.attr('href') || '',
        onEnter: () => {
            toolbar.destroy()
        },
        onChange:url => {
            linkNode.each(node => {
                updateLink.call(this, getNodeModel(node), url)
            })
        }
    })
    itemList.push({
        type: 'node',
        node: getNodeModel('<span class="lake-embed-toolbar-item-split"></span>')
    });
    itemList.push({
        type: 'button',
        name: 'openlink',
        iconName: 'openlink',
        title: locale.linkOpen,
        onClick: () => {
            const url = linkNode.attr('href')
            if(url){
                window.open(sanitizeUrl(url))
            }
        }
    });
    itemList.push({
        type: 'button',
        name: 'delete',
        iconName: 'delete',
        title: locale.linkDelete,
        onClick: () => {
            linkNode.each(node => {
                range = this.change.getRange()
                range.selectNode(node)
                this.change.select(range)
                this.change.unwrapInline('<a />')
            })
            toolbar.destroy()
        }
    })
    const lastNode = linkNode[linkNode.length - 1]
    if(lastNode){
        const node = getNodeModel('<div data-lake-element="embed-link-toolbar" />')
        document.body.appendChild(node[0])
        // dupRange 用于内嵌工具栏的定位
        const dupRange = range.cloneRange()
        dupRange.selectNode(lastNode)
        toolbar = new EmbedToolbar({
            range: dupRange,
            list: itemList
        })
        // 卡片最大化

        if (linkNode.closest('.lake-card-block-max').length > 0) {
            toolbar.root.addClass('lake-link-toolbar-in-max')
        }
        toolbar.render(node)
        if (toolbar.find('input')[0].value === '') {
            toolbar.find('input')[0].focus()
        } 
        // 事件绑定
        toolbar.root.on('mouseenter', () => {
            canRemoveLinkToolbar = false
        })

        const listener = () => {
            delayRemoveLinkToolbar.call(this, linkNode)
        }

        toolbar.root.on('mouseleave', listener)
        toolbar.root.on('click', () => {
            toolbar.root.off('mouseleave', listener)
        })
        toolbarList.push({
            node: linkNode,
            toolbar: toolbar
        })
        window.addEventListener('scroll', handleWindowScroll, true)
    }
}

const delayCreateLinkToolbar = function(linkNode) {
    canCreateLinkToolbar = true
    window.setTimeout(() => {
        if (!canCreateLinkToolbar) {
            return
        }
        createLinkToolbar.call(this, linkNode)
    }, 300)
}

const bindEvents = function() {
    canCreateLinkToolbar = true
    canRemoveLinkToolbar = true 
    // 鼠标悬停在链接上面，显示内嵌工具栏

    this.editArea.on('mouseover', e => {
        e.stopPropagation()
        const linkNode = getNodeModel(e.target).closest('a')

        if (linkNode.length > 0 && !this.card.closest(linkNode)) {
            delayCreateLinkToolbar.call(this, linkNode)

            const listener = () => {
                canCreateLinkToolbar = false
                linkNode.off('mouseleave', listener)
                delayRemoveLinkToolbar.call(this, linkNode)
            }

            linkNode.off('mouseleave', listener)
            linkNode.on('mouseleave', listener)
        }
    })
    // 点击页面其它地方之后关闭
    this.domEvent.onDocument('click', e => {
        if (getNodeModel(e.target).closest('.lake-button-link,.lake-embed-toolbar').length > 0) {
            return
        }
        removeAllLinkToolbar.call(this)
    })
}

export default {
    initialize: function() {
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            execute: () => {
                const range = this.change.getRange()
                // 新建
                if (range.collapsed) {
                    createLinkToolbar.call(this)
                    return
                } 
                // 修改
                this.history.stop()
                this.change.unwrapInline('<a />')
                this.change.wrapInline('<a href="" target="_blank" class="lake-link-marker" />')
                shrinkRange(range)
                this.change.select(range)
                this.history.save()
                let linkNode = getNodeModel(range.commonAncestorContainer)
                if (linkNode.name !== 'a') {
                    linkNode = linkNode.find('.lake-link-marker')
                }
                linkNode.removeClass('lake-link-marker')
                createLinkToolbar.call(this, linkNode)
                return linkNode
            }
        });
        // 绑定相关 DOM 事件
        bindEvents.call(this)
        // 定制粘贴过程
        this.on('paste:each', node => {
            if (node.name !== 'a') {
                return
            }
            const url = node.attr('href') || ''
            if (!isMailto(url) && !node.attr('target')) {
                node.attr('target', '_blank')
            }
        })
        // 快捷键
        const options = this.options[PLUGIN_NAME] || {
            hotkey:'mod+k'
        }
        
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, PLUGIN_NAME)
        }
    }
}
export {
    removeAllLinkToolbar,
    removeLinkToolbar,
    createLinkToolbar,
    updateLink
}