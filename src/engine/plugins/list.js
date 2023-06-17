import { getActiveBlocks } from '../changes/utils'
import { createBookmark,moveToBookmark } from '../utils/range'
import { getListType,isAllListedByType,cancelList,toCommonList } from '../utils/list'

const PLUGIN_NAME = 'list'
const typeTagMap = {
    orderedlist: 'ol',
    unorderedlist: 'ul'
}
const tagTypeMap = {
    ol: 'orderedlist',
    ul: 'unorderedlist'
}

export default {
    initialize: function() {
        // 添加被允许的标签
        this.schema.add(['li', {
            ul: {
                'data-lake-indent': '@number'
            }
        }, 
        {
            ol: {
                start: '@number',
                'data-lake-indent': '@number'
            }
        }]) 
        // 创建命令
        this.command.add(PLUGIN_NAME, {
            queryState: () => {
                return getListType(this.change.blocks)
            },
            // type：orderedlist，有序列表
            // type：unorderedlist，无序列表
            // start：起始序号，有序列表的 start 属性，支持从非 1 数值开始
            execute: type => {
                let start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1
                const tagName = typeTagMap[type]
                if (!tagName) {
                    return
                }
                this.history.stop()
                this.change.separateBlocks()
                const range = this.change.getRange()
                const blocks = getActiveBlocks(range)

                if (!blocks) {
                    this.history.start()
                    return
                }
                if (type === tagTypeMap.ol) {
                    start = parseInt(start, 10) || 1
                }
                const bookmark = createBookmark(range)
                const allListed = isAllListedByType(blocks, type)
                if (allListed) {
                    cancelList(blocks)
                } else {
                    toCommonList(blocks, type, start)
                }
                moveToBookmark(range, bookmark)
                this.change.select(range)
                this.change.mergeAdjacentList()
                this.history.save()
            }
        })
    }
}