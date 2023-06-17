import { isBlockFirstOffset } from '../../changes/utils'
export default function(e) {
    const range = this.change.getRange()
    // <p><cursor />foo</p>
    if (!range.collapsed || isBlockFirstOffset(range, 'start')) {
        e.preventDefault()
        this.command.execute('indent',true)
        return false
    }
    e.preventDefault()
    this.change.insertText("\xa0 \xa0\xa0")
    return false
}