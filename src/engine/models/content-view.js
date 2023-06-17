import langEn from '../lang/en'
import langZhCn from '../lang/zh-cn'
import ParserSchema from '../parser/schema'
import ParserConversion from '../parser/conversion'
import constantsSchema from '../constants/schema'
import Event from './event'

const language = {
    'en': langEn,
    'zh-cn': langZhCn
}

class ContentView {
    constructor(editArea, options) {
        this.editArea = editArea
        this.options = options || {}
        this.lang = language[this.options.lang || "zh-cn"]
        this.card = this.options.card
        this.plugin = this.options.plugin
        this.schema = new ParserSchema()
        this.schema.add(constantsSchema)
        this.conversion = new ParserConversion()
        this.event = new Event(this)
    }
    on(eventType, listener, rewrite) {
        this.event.on(eventType, listener, rewrite)
        return this
    }

    off(eventType, listener) {
        this.event.off(eventType, listener)
        return this
    }
}

export default {
    create: (editArea, options) => {
        return new ContentView(editArea, options)
    }
}
  