import getNodeModel from '../models/node'
import { getClosestBlock } from '../changes/utils'

class Checkbox {
    constructor(engine){
      this.hasFocus = false
      if (engine) {
        this.engine = engine
        this.card = engine.card
      }
    }

    onClick(node){
      if (!this.card) {
          return
      }
      const isChecked = node.hasClass('lake-checkbox-checked')
      if (isChecked) {
          node.removeClass('lake-checkbox-checked')
          this.cardRoot.find(".lake-checkbox-input").removeAttr("checked")
      } else {
          node.addClass('lake-checkbox-checked')
          this.cardRoot.find(".lake-checkbox-input").attr("checked", "checked")
      }
      this.value = !isChecked
      this.card.setValue(this.cardRoot, this.value)
      this.engine.history.save()
    }

    setListChecked = value => {
      const block = getClosestBlock(this.cardRoot)
      if(block && block.hasClass("lake-list-task")){
        block.attr("data-lake-checked", value)
      }
    }

    render(container, value) {
      const html = '\n    <span class="lake-checkbox">\n      <input type="checkbox" class="lake-checkbox-input" value="">\n      <span class="lake-checkbox-inner"></span>\n    </span>\n    '
      const node = getNodeModel(html)
      if (value) {
        node.addClass('lake-checkbox-checked')
        node.find(".lake-checkbox-input").attr("checked", "checked")
      }
      container.append(node)
      this.setListChecked(value)
      if (!this.engine) {
        return
      }

      node.on('click',() => {
        return this.onClick(node)
      })
    }
}

Checkbox.type = 'inline'
Checkbox.singleSelectable = false
Checkbox.canCollab = true
export default Checkbox