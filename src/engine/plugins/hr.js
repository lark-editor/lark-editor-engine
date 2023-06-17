import { getClosestBlock,getBlockLeftText,removeBlockLeftText } from '../changes/utils'
const PLUGIN_NAME = "hr"
export default {
    initialize:function() {
        // 添加被允许的标签
        this.schema.add(PLUGIN_NAME)
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            execute:() => {
                this.change.insertCard(PLUGIN_NAME)
            }
        })
        // Markdown 快捷键
        this.on('keydown:enter', e => {
            const range = this.change.getRange()
    
            if (!range.collapsed) {
                return
            }
    
            const block = getClosestBlock(range.startContainer)
    
            if (!block.isHeading()) {
                return
            }
    
            const chars = getBlockLeftText(block, range)
            const match = /^---$/.exec(chars)
    
            if (match) {
                e.preventDefault();
                removeBlockLeftText(block, range)
                this.command.execute(PLUGIN_NAME)
                return false
            }
        })

        this.on("copy:each", node =>  {
            if (PLUGIN_NAME === node.name) {
                this.card.replaceNode(node, PLUGIN_NAME)
            }
        })

        // 快捷键
        const options = this.options[PLUGIN_NAME] || {
            hotkey:'mod+shift+e'
        }
        
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, PLUGIN_NAME)
        }
    }
}