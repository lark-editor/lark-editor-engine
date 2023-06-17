import { toHex } from '../utils/string'

const PLUGIN_NAME = 'backcolor'

export default {
    initialize: function () {
        // 添加被允许的标签
        this.schema.add({
            span: {
                style: {
                    'background-color': '@color'
                }
            }
        })
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState:() => {
                const values = this.change.marks.map(node => {
                    let color = ''
                    if (node.name === 'span') {
                        color =toHex(node.css('background-color') || '')
                    }
                    return color
                }).filter(color => {
                    return color
                })
                if (values.length > 0) {
                    return values[0]
                }
                return ''
            },
            execute:(color, defaultColor) => {
                const mark = "<span style=\"background-color: ".concat(color, ";\" />")
        
                if (defaultColor === undefined || color !== defaultColor) {
                    this.change.addMark(mark)
                } else {
                    this.change.removeMark(mark)
                }
            }
        })
    }
}