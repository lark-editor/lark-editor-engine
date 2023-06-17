import getNodeModel from '../models/node'

const PLUGIN_NAME = 'fontsize'
// https://websemantics.uk/articles/font-size-conversion/
const fontsizeMap = {
    9: 12,
    10: 13,
    11: 14,
    // 14px 是 10.5pt，页面上字号显示 11
    12: 16,
    14: 19,
    16: 22,
    18: 24,
    22: 29,
    24: 32,
    30: 40,
    36: 48
}
const fontsizeList = Object.keys(fontsizeMap).map(pt => {
    return parseInt(pt, 10)
})

const processFontsize = fontsize => {
    fontsize = fontsize || ''
    const match = /([\d\.]+)(pt|px)$/i.exec(fontsize)
    if (match) {
        const unit = match[2]
        if (unit === 'pt') {
            return match[1]
        } else if (unit === 'px') {
            for (var i = 0; i < fontsizeList.length; i++) {
                if (Math.round(match[1]) === fontsizeMap[fontsizeList[i]]) {
                    return String(fontsizeList[i])
                }
            }
            return String(Math.round(match[1] * 72 / 96))
        }
    }
    return ''
}

export default {
    initialize: function() {
        // 添加被允许的标签
        this.schema.add({
            span: {
                class: /^lake-fontsize-\d+$/
            }
        })
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState:() => {
                const values = this.change.marks.map(node => {
                    let value = ''
                    if (node.name === 'span') {
                        value = processFontsize(node.css('font-size'))
                    }
                    return value
                })
                .filter(value => {
                    return value
                })
                if (values.length > 0) {
                    return values[0]
                }
                return ''
            },
            execute:(value, defaultSize) => {
                const mark = "<span class=\"lake-fontsize-".concat(value, "\" />")
        
                if (defaultSize === undefined || value !== defaultSize) {
                    this.change.addMark(mark)
                } else {
                    this.change.removeMark(mark)
                }
            }
        }) 
        // 粘贴
        this.on('paste:each', node => {
            node = getNodeModel(node)
    
            if (node.name === 'span') {
                const value = parseInt(processFontsize(node[0].style.fontSize), 10)
        
                if (fontsizeList.indexOf(value) >= 0) {
                    node.addClass("lake-fontsize-".concat(value))
                }
        
                node.css('font-size', '')
            }
        })
    }
}