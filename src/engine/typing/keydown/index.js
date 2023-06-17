import { isHotkey } from '../../utils/is-hotkey'
import { CARD_TYPE_KEY } from '../../constants/card'
import inlineCard from './inline-card'
import blockCard from './block-card'
import tab from './tab'
import backspace from './backspace'
import shiftEnter from './shift-enter'
import shiftTab from './shift-tab'
import enter from './enter'
export default function(e) {
    if (this.isReadonly) {
        return
    }
  
    if (this.card.closest(e.target)) {
        return
    }
  
    if (isHotkey('enter',e) && this.event.trigger('keydown:enter', e) !== false) {
        enter.call(this, e)
        return
    }
  
    if (isHotkey('shift+enter',e)) {
        shiftEnter.call(this, e)
        return
    }

    if (isHotkey('backspace',e) && this.event.trigger('keydown:backspace', e) !== false) {
        backspace.call(this, e)
        return
    }

    if (isHotkey('tab',e) && this.event.trigger('keydown:tab', e) !== false) {
        tab.call(this, e)
        return
    }

    if (isHotkey('shift+tab',e)) {
        shiftTab.call(this, e)
        return
    }
  
    const range = this.change.getRange()
    const cardRoot = this.card.closest(range.commonAncestorContainer)
  
    if (cardRoot) {
        let result
        if (cardRoot.attr(CARD_TYPE_KEY) === 'inline') {
            result = inlineCard.call(this, cardRoot, e)
        } else {
            result = blockCard.call(this, cardRoot, e)
        }
    
        if (result === false) {
            return
        }
    }
  
    if (e.key === ' ') {
        this.event.trigger('keydown:space', e)
        return
    } 
    // 在 Windows 下使用中文输入法， keyCode 为 229，需要通过 code 判断
    if (e.key === '@' || e.shiftKey && e.keyCode === 229 && e.code === 'Digit2') {
        this.event.trigger('keydown:at', e)
        return
    } 
    // 搜狗输入法在中文输入状态下，输入“/”变成“、”，所以需要加额外的 keyCode 判断
    // Windows 下用微软拼音输入法（即系统默认输入法）时，输入“/”后，keyCode 为 229
    if (e.key === '/' || isHotkey('/',e) || e.keyCode === 229 && e.code === 'Slash') {
        this.event.trigger('keydown:slash', e)
        return
    }
  
    if (isHotkey('mod+a',e)) {
        this.event.trigger('keydown:selectall', e)
        return
    }
}