import { createBookmark,moveToBookmark } from '../utils/range'
import { unwrapNode,getClosestBlock,getBlockLeftText,removeBlockLeftText } from '../changes/utils'

const PLUGIN_NAME = 'alert'
const typeList = ['info', 'warning', 'danger', 'success', 'tips']

export default {
    initialize:function() {
        // 添加被允许的标签
        this.schema.add({
            blockquote: {
                class: ['lake-alert', 'lake-alert-info', 'lake-alert-warning', 'lake-alert-danger', 'lake-alert-success', 'lake-alert-tips']
            }
        })
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState:() => {
                const blocks = this.change.blocks
                if (blocks.length === 0) {
                    return false
                }
                return blocks[0].closest('.lake-alert').length > 0
            },
            execute:type =>{
                if (typeList.indexOf(type) < 0) {
                    type = 'info'
                } 
                // 取消警告提示
                if (this.command.queryState(PLUGIN_NAME)) {
                    const range = this.change.getRange()
                    const blocks = this.change.blocks
                    const alertBlock = blocks[0].closest('.lake-alert')
                    const bookmark = createBookmark(range)
                    unwrapNode(alertBlock)
                    moveToBookmark(range, bookmark)
                    this.history.save()
                    return
                } 
                // 添加警告提示
                this.change.wrapBlock("<blockquote class=\"lake-alert lake-alert-".concat(type, "\" />"))
            }
        })
        // Markdown 快捷键
        this.on('keydown:enter', e =>{
            const range = this.change.getRange()
            if (!range.collapsed) {
                return
            }
    
            const block = getClosestBlock(range.startContainer)
    
            if (block.name !== 'p') {
                return
            }
    
            const chars = getBlockLeftText(block, range)
            const match = /^:::(\w*)$/.exec(chars)
    
            if (match) {
                e.preventDefault()
                removeBlockLeftText(block, range)
                if (!block.first()) {
                    block.append('<br />')
                }
                this.history.save()
                const type = match[1].toLowerCase()
                this.command.execute('alert', type)
                return false
            }
        })
    }
}