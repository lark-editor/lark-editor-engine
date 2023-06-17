import getNodeModel from '../models/node'
import { getClosestBlock,getRangeBlocks,getActiveMarks,getActiveBlocks } from '../changes/utils'

const listTagTypeMap = {
    ol: 'orderedlist',
    ul: 'unorderedlist'
}
  
const paintMarks = function(activeMarks){
    activeMarks.forEach(mark => {
        this.change.addMark(mark.clone())
    })
}
  
const paintBlocks = function(currentBlock, activeBlocks) {
    activeBlocks.forEach(block => {
        if (block.name !== currentBlock.name) {
            if (block.isHeading()) {
                this.command.execute('heading', block.name)
            }
            if (listTagTypeMap[block.name]) {
                this.command.execute('list', listTagTypeMap[block.name])
            }
        }
        const css = block.css()
        if (Object.keys(css).length > 0) {
            this.change.setBlocks({
                style: css
            })
        }
    })
}
  
const paintFormat = function(activeMarks, activeBlocks) {
    const range = this.change.getRange()
    this.history.stop()
    // 选择范围为折叠状态，应用在整个段落，包括段落自己的样式
    if (range.collapsed) {
        const dummy = getNodeModel('<img style="display: none;" />')
        range.insertNode(dummy[0])
        const currentBlock = getClosestBlock(range.startContainer)
        range.selectNodeContents(currentBlock[0])
        this.change.select(range)
        this.command.execute('removeformat')
        paintMarks.call(this, activeMarks)
        paintBlocks.call(this, currentBlock, activeBlocks)
        range.selectNode(dummy[0])
        range.collapse(true)
        dummy.remove()
        this.change.select(range)
    } else {
        // 选择范围为展开状态
        this.command.execute('removeformat')
        paintMarks.call(this, activeMarks)
        const blocks = getRangeBlocks(range)
        blocks.forEach(block => {
            paintBlocks.call(this, block, activeBlocks)
        })
    }
    this.history.save()
}

export default {
    initialize: function() {
        let activeMarks
        let activeBlocks
    
        const removeActiveNodes = () => {
            this.editArea.removeClass('lake-paintformat-mode')
            activeMarks = undefined
            activeBlocks = undefined
            this.event.trigger('select')
        }
        // 创建命令
        this.command.add('paintformat', {
            queryState: () => {
                return !!activeMarks
            },
            execute: () => {
                if (activeMarks) {
                    removeActiveNodes()
                    return
                }
                const range = this.change.getRange()
                activeMarks = getActiveMarks(range)
                activeBlocks = getActiveBlocks(range)
                this.event.trigger('select')
                this.editArea.addClass('lake-paintformat-mode')
            }
        }) 
        // 鼠标选中文本之后添加样式
        this.editArea.on('mouseup', e => {
            if (!activeMarks) {
                return
            } 
            // 在卡片里不生效
            if (this.card.closest(e.target)) {
                removeActiveNodes()
                return
            }
            paintFormat.call(this, activeMarks, activeBlocks)
            removeActiveNodes()
        })
    }
}