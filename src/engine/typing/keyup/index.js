import { isHotkey } from '../../utils/is-hotkey'

export default function(e) {
    if (this.isReadonly) {
        return
    }
  
    if (this.card.closest(e.target)) {
        return
    }
  
    if (isHotkey('enter',e)) {
        this.event.trigger('keyup:enter', e)
        return
    }
  
    if (isHotkey('backspace',e)) {
        this.event.trigger('keyup:backspace', e)
        return
    }
  
    if (isHotkey('tab',e)) {
        this.event.trigger('keyup:tab', e)
        return
    }
  
    if (isHotkey('space',e)) {
        this.event.trigger('keyup:space', e)
        return
    }
}