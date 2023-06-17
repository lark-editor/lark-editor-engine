import getNodeModel from './node'
import { DiffDOM } from 'diff-dom/dist'
import { CARD_SELECTOR , CARD_VALUE_KEY } from '../constants/card'
import { CURSOR_SELECTOR , ANCHOR_SELECTOR , FOCUS_SELECTOR } from '../constants/bookmark'
import { encodeCardValue , removeBookmarkTags } from '../utils/string'
import { moveToBookmark } from '../utils/range'

const MAX_UNDO_COUNT = 100

const updateStatus = function() {
    this.hasUndo = !!this.data[this.index - 1]
    this.hasRedo = !!this.data[this.index + 1]
}

function setRange(dom) {
    getNodeModel(dom).attr("contenteditable", "true")
    const { change } = this
    const { engine } = change
    const { editArea , card } = engine
    const dd = new DiffDOM({
        filterOuterDiff: function(t1, t2, diffs) {
            if(!diffs.length && t1.attributes && t1.attributes["data-lake-card"]){
                t1.innerDone = true
            }
        }
    })
    const diff = dd.diff(editArea[0], dom)
    dd.apply(editArea[0], diff)
    editArea.find(CARD_SELECTOR).each(child => {
        const node = getNodeModel(child)
        const component = card.getComponent(node)
        if(!component || encodeCardValue(component.value) !== node.attr(CARD_VALUE_KEY)){
            card.reRenderAll(node, engine)
        }
    })
    const cursor = editArea.find(CURSOR_SELECTOR)
    let curRange;
    if(cursor.length > 0){
        curRange = {
            anchor: cursor[0],
            focus: cursor[0]
        }
    }
    const anchor = editArea.find(ANCHOR_SELECTOR)
    const focus = editArea.find(FOCUS_SELECTOR);
    if (anchor.length > 0 && focus.length > 0){
        curRange = {
            anchor: anchor[0],
            focus: focus[0]
        }
    }
    if(curRange) {
        const range = change.getRange()
        moveToBookmark(range, curRange)
        change.select(range)
    }
}

class History {
    constructor(change, options){
        this.onSave = options.onSave
        this.hasUndo = false
        this.hasRedo = false
        this.data = []
        this.index = -1
        this.canSave = true
        this.change = change
    }

    undo() {
        const value = this.change.getValue()
        const id = removeBookmarkTags(value)
  
        while (this.data[this.index - 1] && this.data[this.index - 1].id === id) {
            this.index--
        }
  
        updateStatus.call(this)
  
        if (!this.hasUndo) {
            this.onSave(value)
            return
        }
  
        const prevData = this.data[--this.index]
        updateStatus.call(this)
        setRange.call(this,prevData.dom)
        this.onSave(prevData.value)
    }

    redo() {
        const value = this.change.getValue()
        const id = removeBookmarkTags(value)
  
        while (this.data[this.index + 1] && this.data[this.index + 1].id === id) {
            this.index++
        }
  
        updateStatus.call(this)
  
        if (!this.hasRedo) {
            return
        }
  
        const prevData = this.data[++this.index]
        updateStatus.call(this)
        setRange.call(this,prevData.dom)
        this.onSave(prevData.value)
    }

    start() {
        this.canSave = true
    }

    stop() {
        this.canSave = false
    }

    clear() {
        this.index = 0
        const lastItem = this.data.pop()
        this.data = [lastItem]
        updateStatus.call(this)
    }

    update(removeRedo) {
        let redo = removeRedo
        const { value , dom } = this.change.getValueAndDOM()
        const id = removeBookmarkTags(value)
        const data = this.data[this.index]
        const data_id = data ? data.id : ""
        if(data_id === id){
            redo = false
        }

        if (removeRedo) {
            this.data = this.data.slice(0, this.index)
            updateStatus.call(this)
        }

        this.data[this.index] = {
            id,
            dom
        }
  
        if (redo) {
            this.onSave(value)
        }
    }

    save(force, triggerEvent) {
        force = force === undefined ? true : force
        triggerEvent = triggerEvent === undefined ? true : triggerEvent
  
        if (force) {
            this.start()
        }
  
        if (!this.canSave) {
            return
        }
  
        const { value , dom } = this.change.getValueAndDOM()
        const id = removeBookmarkTags(value)
        const data = this.data[this.index]
        const data_id = data ? data.id : ""
        if(data_id === id){
            triggerEvent = false
        }
        this.index++
  
        while (this.data[this.index - 1] && this.data[this.index - 1].id === id) {
            this.index--
        }
  
        this.data = this.data.slice(0, this.index)
        if (this.data.length >= MAX_UNDO_COUNT) {
            this.data.shift()
            this.index--
        }
  
        updateStatus.call(this)

        this.data[this.index] = {
            id,
            dom
        }

        updateStatus.call(this)
        if (triggerEvent) {
            this.onSave(value)
        }
        return value
    }
}
export default History