
const PLUGIN_NAME = 'code'
const TAG_NAME = 'code'

function execute() {
    const mark = "<".concat(TAG_NAME, " />")
    if (!this.command.queryState(PLUGIN_NAME)) {
        this.change.addMark(mark)
    } else {
        this.change.removeMark(mark)
    }
}

export default {
    initialize: function() {
        // 添加被允许的标签
        this.schema.add(TAG_NAME)
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState:() => {
                return this.change.marks.some(node => {
                    return node.name === TAG_NAME
                })
            },
            execute:() => {
                execute.call(this)
            }
        })
       
        // 快捷键
        const options = this.options[PLUGIN_NAME] || {
            hotkey:'mod+e'
        }
        
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, PLUGIN_NAME)
        }
    }
}