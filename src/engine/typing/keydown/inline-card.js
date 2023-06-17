import { isHotkey, isCharacter } from '../../utils/is-hotkey'
import getNodeModel from '../../models/node'
import { CARD_LEFT_SELECTOR,CARD_RIGHT_SELECTOR } from '../../constants/card'

export default function(cardRoot, e) {
    const range = this.change.getRange()
    const component = this.card.getComponent(cardRoot)
    const { constructor } = component
    const { singleSelectable } = constructor
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
        if (isHotkey('right',e) || isHotkey('ctrl+e',e) || isHotkey('ctrl+f',e)) {
            e.preventDefault()
            if(singleSelectable !== false){
                this.change.selectCard(cardRoot)
            }else{
                this.card.focus(range, cardRoot, false)
                this.change.select(range)
            }
            return false
        }
    
        if (isHotkey('left',e) || isHotkey('ctrl+a',e) || isHotkey('ctrl+b',e)) {
            range.setStartBefore(cardRoot[0])
            range.collapse(true)
            this.change.select(range)
        }
        return
    } 
    // 右侧光标
    const cardRight = getNodeModel(range.commonAncestorContainer).closest(CARD_RIGHT_SELECTOR)
    if (cardRight.length > 0) {
        if (isHotkey('left',e) || isHotkey('ctrl+a',e) || isHotkey('ctrl+b',e)) {
            e.preventDefault()
            if(singleSelectable !== false){
                this.change.selectCard(cardRoot)
            }else{
                this.card.focus(range, cardRoot, true)
                this.change.select(range)
            }
            return false
        }
    
        if (isHotkey('right',e) || isHotkey('ctrl+e',e) || isHotkey('ctrl+f',e)) {
            if (cardRoot.next() && cardRoot.next().isCard()) {
                e.preventDefault()
                this.change.selectCard(cardRoot.next())
                return false
            }else{
                range.setEndAfter(cardRoot[0])
                range.collapse(false)
                this.change.select(range)
            }
        }
    }

    const selectedCard = this.card.getSingleSelectedCard(range)
    if(selectedCard && isCharacter(e)){
        this.change.removeCard(selectedCard)
    }
}