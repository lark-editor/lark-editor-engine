import { createBookmark,moveToBookmark } from '../utils/range'
import { unwrapNode } from '../changes/utils'

const PLUGIN_NAME = 'quote'
const TAG_NAME = 'blockquote'

export default {
    initialize: function() {
        // 添加被允许的标签
        this.schema.add(TAG_NAME)
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState: () => {
                const blocks = this.change.blocks
                if (blocks.length === 0) {
                    return false
                }
                const blockquote = blocks[0].closest(TAG_NAME)
                return blockquote.length > 0 && blockquote[0].className === ''
            },
            execute:() => {
                // 取消引用
                if (this.command.queryState(PLUGIN_NAME)) {
                    const range = this.change.getRange()
                    const blocks = this.change.blocks
                    const blockquote = blocks[0].closest(TAG_NAME)
                    const bookmark = createBookmark(range)
                    unwrapNode(blockquote)
                    moveToBookmark(range, bookmark)
                    this.history.save()
                    return
                } 
                // 添加引用
                this.change.wrapBlock("<".concat(TAG_NAME, " />"))
            }
        })
        // 快捷键
        const options = this.options[PLUGIN_NAME] || {
            hotkey:'mod+shift+u'
        }
        
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, PLUGIN_NAME)
        }
    }
}