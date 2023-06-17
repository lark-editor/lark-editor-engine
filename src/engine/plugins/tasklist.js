import getNodeModel from '../models/node'
import { safari } from '../utils/ua'
import { getClosestBlock,getActiveBlocks } from '../changes/utils'
import { fetchAllChildren } from '../utils/node'
import { createBookmark,moveToBookmark,shrinkRange,getRootBlock, scrollIntoView } from '../utils/range'
import { cancelList,getListType,toTaskList,isAllListedByType,isListLastOffset,isListFirstOffset,isTaskListBlock,repairListblock } from '../utils/list'

const PLUGIN_NAME = 'tasklist'
const typeTagMap = {
    orderedlist: 'ol',
    unorderedlist: 'ul',
    tasklist: 'ul'
}

// 节点里添加待创建的 checkbox，用于粘贴
const prependReadyCheckbox = function(node) {
    node = getNodeModel(node)
    const tempNode = getNodeModel('<span />')
    node.prepend(tempNode)
    this.card.replaceNode(tempNode, 'checkbox', false)
} 
// 回车键
const enter = function(e) {
    let range = this.change.getRange()
    shrinkRange(range)
    const startBlock = getClosestBlock(range.startContainer)
    const endBlock = getClosestBlock(range.endContainer)

    if ("li" === startBlock.name || "li" === endBlock.name) {
        if (!range.collapsed) {
            backspace.call(this, e, startBlock.name !== endBlock.name)
            range = this.change.getRange()
        }
        e.preventDefault()
        this.history.stop()
        if (isListLastOffset(range) && isListFirstOffset(range)) {
            const nodes = getActiveBlocks(range)
            const listType = getListType(nodes)
            this.command.execute("tasklist", listType)
        } else {
            const isTaskList = isTaskListBlock(startBlock)
            this.change.splitBlock()
            range = this.change.getRange()
            const bookmark = createBookmark(range)
            const block = getClosestBlock(range.endContainer)
            repairListblock.call(this, block.prev(), isTaskList)
            repairListblock.call(this, block, isTaskList)
            repairListblock.call(this, block.next(), isTaskList)
            moveToBookmark(range, bookmark)
            range.collapse(false) 
            this.change.select(range)
            this.change.mergeAdjacentList()
        }
        this.history.save()
        scrollIntoView(range)
        return false
    }
} 

function backspace(e, isOnlyOne) {
    let range = this.change.getRange()
    if (range.collapsed) {
        const block = getClosestBlock(range.startContainer)
        if ("li" === block.name && isListFirstOffset(range)) {
            e.preventDefault()
            if (this.command.queryState("indent")) {
                this.command.execute("outdent")
                return false
            }
            const blocks = getActiveBlocks(range)
            const listType = getListType(blocks)
            if (listType) {
                this.command.execute("tasklist", listType)
                return false
            }
        }
    } else {
        const startBlock = getClosestBlock(range.startContainer)
        const endBlock = getClosestBlock(range.endContainer)
        if ("li" === startBlock.name || "li" === endBlock.name) {
            e.preventDefault()
            this.history.stop()
            if(!safari){
                this.change.separateBlocks()
            }
            const cloneRange = range.cloneRange()
            this.change.deleteContent(isOnlyOne)
            repairListblock(startBlock)
            repairListblock(endBlock)
            range.setStart(cloneRange.startContainer, cloneRange.startOffset)
            range.collapse(true)
            this.change.mergeAdjacentList()
            this.change.select(range)
            this.history.save()
            return false
        }
    }
}

function tab(e) {
    const range = this.change.getRange()
    if (range.collapsed && isListFirstOffset(range)) {
        e.preventDefault()
        this.command.execute("indent")
        return false
    }
}

export default {
    initialize: function() {
        this.schema.add([{
            ul: {
                class: ['lake-list']
            }
        }, {
            li: {
                class: ['lake-list-node', 'lake-list-task']
            }
        }])
            // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState:() => {
                return getListType(this.change.blocks)
            },
            execute:(type, checked) =>{
                const tagName = typeTagMap[type]
        
                if (!tagName) {
                    return
                }
                if (type !== 'tasklist') {
                    this.command.execute('list', type, checked)                          
                    return
                }
                this.history.stop()
                this.change.separateBlocks()
                const range = this.change.getRange()
                const blocks = getActiveBlocks(range)
        
                if (!blocks) {
                    this.history.start()
                    return
                }
        
                const bookmark = createBookmark(range)
                const allListed = isAllListedByType(blocks, type)
                // 任务列表
        
                if (allListed) {
                    cancelList(blocks)
                } else {
                    toTaskList.call(this, blocks, checked)
                }
                moveToBookmark(range, bookmark)
                this.change.select(range)
                this.change.mergeAdjacentList()
                this.history.save()
            }
        }) 
        // 定制键盘事件
        this.on('keydown:enter', e => {
            return enter.call(this, e)
        })
        this.on('keydown:backspace', e => {
            return backspace.call(this, e)
        })
        this.on('keydown:tab', e => {
            return tab.call(this, e)
        })
        let hasList
        this.on('paste:before', fragment => {
            const nodes = fetchAllChildren(fragment)
            nodes.forEach(node => {
                node = getNodeModel(node)
                if (node.name === 'li' && node.hasClass('lake-list-task')) {
                    node.closest('ul').addClass('lake-list')
                    if(node.find("[data-ready-card=checkbox]").length === 0)
                        prependReadyCheckbox.call(this, node)
                }
            })
            hasList = nodes.some(node => {
                return "li" === node.name
            })
        })
        this.on('paste:insert', () => {
            const range = this.change.getRange()
            const rootBlock = getRootBlock(range)
            const nextBlock = rootBlock.next()
            if(nextBlock && nextBlock.find("li.lake-list-task").length > 0){
                nextBlock.find("li.lake-list-task").each(node => {
                    node = getNodeModel(node)
                    if(0 === node.find("[data-lake-card=checkbox],[data-ready-card=checkbox]").length)
                        prependReadyCheckbox.call(this, node)
                })
            }
        }) 
        this.on('paste:after',() => {
            if (hasList) {
                this.change.mergeAdjacentList()
            }
        })
        // 快捷键
        let options = this.options['orderedlist'] || {
            hotkey:'mod+shift+7'
        }
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, 'orderedlist')
        }

        options = this.options['unorderedlist'] || {
            hotkey:'mod+shift+8'
        }
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, 'unorderedlist')
        }

        options = this.options['tasklist'] || {
            hotkey:'mod+shift+9'
        }
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, 'tasklist')
        }
    }
}
export {
    backspace,
    tab,
    enter
}