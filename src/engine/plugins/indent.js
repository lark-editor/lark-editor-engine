import { INDENT_KEY,MAX_INDENT,MAX_PADDING } from '../constants/indent'
import { HEADING_TAG_MAP } from '../constants/tags'
import { removeUnit,addUnit } from '../utils/string'
import { setNodeProps,getClosestBlock,getActiveBlocks } from '../changes/utils'
// value > 0：增加缩进
// value < 0：减少缩进
const addPadding = (block, value , n) => {
    if (['ul', 'ol'].includes(block.name)) {
        const currentValue = parseInt(block.attr(INDENT_KEY), 10) || 0
        let newValue = currentValue + (value < 0 ? -1 : 1)
    
        if (newValue > MAX_INDENT) {
            newValue = MAX_INDENT
        }
        if (newValue < 1) {
            block.removeAttr(INDENT_KEY)
        } else {
            block.attr(INDENT_KEY, newValue)
        }
        return
    } 
    // 标题、正文
    if (block.isHeading()) {
        addTextIndent(block, value , n)
    }
} 
// value > 0：增加缩进，第一次先进行文本缩进
// value < 0：减少缩进，第一次先取消文本缩进
const addTextIndent = (block, value,n) => {
    if (value > 0) {
        if (removeUnit(block.css('text-indent')) || n === undefined) {
            const currentValue = block.css('padding-left')
            let newValue = removeUnit(currentValue) + value
            newValue = Math.min(newValue, MAX_PADDING)
            setNodeProps(block, {
                style: {
                    'padding-left': addUnit(newValue > 0 ? newValue : 0, 'em')
                }
            })
        } else {
            setNodeProps(block, {
                style: {
                'text-indent': '2em'
                }
            })
        }
    } else if (removeUnit(block.css('text-indent'))) {
        setNodeProps(block, {
            style: {
                'text-indent': ''
            }
        })
    } else {
        const currentValue = block.css('padding-left')
        const newValue = removeUnit(currentValue) + value
        setNodeProps(block, {
            style: {
                'padding-left': addUnit(newValue > 0 ? newValue : 0, 'em')
            }
        })
    }
    
}

export default {
    initialize:function() {
        // 添加被允许的标签
        const tags =  Object.keys(HEADING_TAG_MAP)
        tags.forEach(tag => {
            const rule = {}
            rule[tag] = {
                style: {
                    'text-indent': '@length',
                    'padding-left': '@length'
                }
            }
            this.schema.add(rule)
        })
        // 创建命令
        this.command.add('indent', {
            queryState:() => {
                const range = this.change.getRange()
                const block = getClosestBlock(range.startContainer)
                if (block.name === 'li') {
                    return parseInt(block.closest('ul,ol').attr(INDENT_KEY), 10) || 0
                }
        
                if (block.isHeading()) {
                    const padding = removeUnit(block.css('padding-left'))
                    const textIndent = removeUnit(block[0].style.textIndent)
                    return padding || textIndent
                }
                return 0
            },
            execute:(t) => {
                this.history.stop()
                this.change.separateBlocks()
                const range = this.change.getRange()
                const blocks = getActiveBlocks(range) 
                // 没找到目标 block
                if (!blocks) {
                    this.history.start()
                    return
                } 
                // 其它情况
                blocks.forEach(block => {
                    addPadding(block, 2,t)
                })
                this.change.mergeAdjacentList()
                this.history.save()
            }
        })
        this.command.add('outdent', {
            execute:() => {
                this.history.stop()
                this.change.separateBlocks()
                const range = this.change.getRange()
                const blocks = getActiveBlocks(range);
                // 没找到目标 block
                if (!blocks) {
                    this.history.start()
                    return
                } // 其它情况
                blocks.forEach(block => {
                    addPadding(block, -2)
                })
                this.change.mergeAdjacentList()
                this.history.save()
            }
            
        })

        // 快捷键
        const indentOptions = this.options["indent"] || {
            hotkey:'mod+]'
        }

        if(!!indentOptions.hotkey){
            this.hotkey.set(indentOptions.hotkey, "indent")
        }

        const outdentOptions = this.options["outdent"] || {
            hotkey:'mod+['
        }
        
        if(!!outdentOptions.hotkey){
            this.hotkey.set(outdentOptions.hotkey, "outdent")
        }
    }
}