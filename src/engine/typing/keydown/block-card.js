import getNodeModel from '../../models/node'
import { isHotkey , isCharacter } from '../../utils/is-hotkey'
import { CARD_LEFT_SELECTOR,CARD_RIGHT_SELECTOR } from '../../constants/card'
// Card 里的输入操作
export default function(cardRoot, e) {
    const range = this.change.getRange()

    if (isHotkey('up',e) || isHotkey('ctrl+p',e)) {
        e.preventDefault()
        this.card.focusPrevBlock(range, cardRoot, false)
        this.change.select(range)
        return false
    }
  
    if (isHotkey('down',e) || isHotkey('ctrl+n',e)) {
        e.preventDefault()
        this.card.focusNextBlock(range, cardRoot, false)
        this.change.select(range)
        return false
    } 
    // 左侧光标
    const cardLeft = getNodeModel(range.commonAncestorContainer).closest(CARD_LEFT_SELECTOR)
    if (cardLeft.length > 0) {
        if (isHotkey('left',e) || isHotkey('ctrl+a',e) || isHotkey('ctrl+b',e)) {
            e.preventDefault()
            this.card.focusPrevBlock(range, cardRoot, false)
            this.change.select(range)
            return false
        }
    
        if (isHotkey('right',e) || isHotkey('ctrl+e',e) || isHotkey('ctrl+f',e)) {
            e.preventDefault()
            this.change.selectCard(cardRoot)
            return false
        } 
        // 其它情况
        if (!e.metaKey && !e.ctrlKey) {
            this.card.focusPrevBlock(range, cardRoot, true)
            this.change.select(range)
            this.history.save()
        }
        return
    } 
    // 右侧光标
    const cardRight = getNodeModel(range.commonAncestorContainer).closest(CARD_RIGHT_SELECTOR)
    if (cardRight.length > 0) {
        if (isHotkey('left',e) || isHotkey('ctrl+a',e) || isHotkey('ctrl+b',e)) {
            e.preventDefault()
            this.change.selectCard(cardRoot)
            return false
        }
    
        if (isHotkey('right',e) || isHotkey('ctrl+e',e) || isHotkey('ctrl+f',e)) {
            e.preventDefault()
            this.card.focusNextBlock(range, cardRoot, false)
            this.change.select(range)
            return false
        } 
        // 其它情况
        if (!e.metaKey && !e.ctrlKey) {
            this.card.focusNextBlock(range, cardRoot, true);
            this.change.select(range)
            this.history.save()
        }
    }

    const card = this.card.getSingleSelectedCard(range)
    if (card) {
        if (isHotkey("left", e) || isHotkey("ctrl+a", e) || isHotkey("ctrl+b", e)){
            e.preventDefault()
            this.card.focus(range, cardRoot, true)
            this.change.select(range)
            return false
        }

        if (isHotkey("right", e) || isHotkey("ctrl+e", e) || isHotkey("ctrl+f", e)){
            e.preventDefault()
            this.card.focus(range, cardRoot, false)
            this.change.select(range)
            return false
        }
        if (isCharacter(e)){
            this.change.removeCard(card)
            return 
        }
    }
}