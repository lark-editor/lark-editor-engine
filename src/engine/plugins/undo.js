export default {
    initialize:function() {
        this.command.add('undo', {
            queryState:() => {
                return this.history.hasUndo
            },
            execute:() => {
                this.readonly(false)
                this.history.undo()
            }
        })
        this.command.add('redo', {
            queryState:() => {
                return this.history.hasRedo
            },
            execute:() => {
                this.readonly(false)
                this.history.redo()
            }
        })
        // 快捷键
        let options = this.options['undo'] || {
            hotkey:'mod+z'
        }
        if(!!options.hotkey){
            this.hotkey.set(options.hotkey, 'undo')
        }

        options = this.options['redo'] || {
            hotkey:['mod+y','shift+mod+z']
        }
        if(!!options.hotkey){
            if(Array.isArray(options.hotkey)){
                options.hotkey.forEach(hotkey => {
                    this.hotkey.set(hotkey, 'redo')
                })
            }else{
                this.hotkey.set(options.hotkey, 'redo')
            }
        }
    }
}