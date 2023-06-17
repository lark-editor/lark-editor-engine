const PLUGIN_NAME = 'selectall'

export default {
    initialize: function() {
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            execute:() => {
                const range = this.change.getRange()
                range.selectNodeContents(this.editArea[0])
                this.change.select(range)
                this.history.update()
                this.event.trigger("select")
            }
        }) 
        // 快捷键
        this.on('keydown:selectall',e => {
            e.preventDefault()
            this.command.execute(PLUGIN_NAME)
        })
    }
}