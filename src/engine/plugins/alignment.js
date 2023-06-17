import { repairListStylePosition } from '../utils/list'
const PLUGIN_NAME = "alignment"
export default {
    initialize:function() {
        // 添加被允许的标签
        this.schema.add({
            block: {
                style: {
                    'text-align': ['left', 'center', 'right', 'justify']
                }
            }
        })
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState:() => {
                const blocks = this.change.blocks
                
                if (blocks.length === 0) {
                    return
                }
        
                let checkBlock = blocks[0]
        
                if (['ul', 'ol', 'blockquote'].includes(checkBlock.name)) {
                    checkBlock = blocks[1] || checkBlock.first()
                }
        
                let state = checkBlock.css('text-align')
                // https://css-tricks.com/almanac/properties/t/text-align/
                if (state === 'start') {
                    state = 'left'
                }
        
                if (state === 'end') {
                    state = 'right'
                }
        
                return state
            },
            execute:value =>{
                this.history.stop()
                this.change.setBlocks({
                    style: {
                        'text-align': value
                    }
                })
                repairListStylePosition(this.change.blocks, value)
                this.history.save()
            }
        })

        const options = this.options[PLUGIN_NAME] || {}
        const items = Object.assign({} , options.items , {
            left:{
                hotkey:'mod+shift+l'
            },
            center:{
                hotkey:'mod+shift+c'
            },
            right:{
                hotkey:'mod+shift+r'
            },
            justify:{
                hotkey:'mod+shift+j'
            }
        })
        // 快捷键
        Object.keys(items).forEach(key => {
            const item = items[key]
            if(item && !!item['hotkey']){
                this.hotkey.set(item['hotkey'], PLUGIN_NAME,key)
            }
        })
    }
}