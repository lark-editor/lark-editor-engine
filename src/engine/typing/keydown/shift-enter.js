import getNodeModel from '../../models/node'
import { isBlockLastOffset } from '../../changes/utils'
// shift 键 + 回车键
export default function(e){
    e.preventDefault()
    const range = this.change.getRange()
    const br = getNodeModel('<br />')
    this.history.stop()
    this.change.insertInline(br) 
    // Chrome 问题：<h1>foo<br /><cursor /></h1> 时候需要再插入一个 br，否则没有换行效果
    if (isBlockLastOffset(range, 'end')) {
        if (!br.next() || br.next().name !== 'br') {
            br.after('<br />')
        }
    }
    this.history.save()
}