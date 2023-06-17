const PLUGIN_NAME = 'sup'
const TAG_NAME = 'sup'

export default {
    initialize: function() {
        // 添加被允许的标签
        this.schema.add(TAG_NAME)
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState: () => {
                return this.change.marks.some(node => {
                    return node.name === TAG_NAME
                })
            },
            execute:() => {
                const mark = "<".concat(TAG_NAME, " />")
        
                if (!this.command.queryState(PLUGIN_NAME)) {
                    this.change.addMark(mark)
                } else {
                    this.change.removeMark(mark)
                }
            }
        })
        // 快捷键
        const options = this.options[PLUGIN_NAME] || {
            hotkey:'mod+.'
        }
        
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, PLUGIN_NAME)
        }
    }
}