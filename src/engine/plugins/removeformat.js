import { getRangeBlocks } from '../changes/utils'
const PLUGIN_NAME = 'removeformat'
export default {
    initialize: function() {
        this.command.add(PLUGIN_NAME, {
            execute:() => {
                const range = this.change.getRange()
                const blocks = getRangeBlocks(range)
                this.history.stop()
                blocks.forEach(block => {
                    block.removeAttr('style')
                })
                this.change.removeMark()
                this.history.save()
            }
        })

        // 快捷键
        const options = this.options[PLUGIN_NAME] || {
            hotkey:'mod+\\'
        }
        
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, PLUGIN_NAME)
        }
    }
}