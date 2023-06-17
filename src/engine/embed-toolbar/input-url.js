import getNodeModel from '../models/node'
import { escape } from '../utils/string'
import { isHotkey } from '../utils/is-hotkey'

const template = data => {
    return "\n  <span class=\"lake-embed-toolbar-item lake-embed-toolbar-item-input\">\n    <input data-role=\"input\" placeholder=\"".concat(escape(data.placeholder), "\" class=\"lake-embed-toolbar-linkinput\" type=\"input\" value=\"").concat(escape(data.url), "\" />\n  </span>\n  ")
}

export default class {
    constructor(config){
        this.config = config
        this.root = getNodeModel(template(config))
        this.onEnter = config.onEnter || (() => {})
        this.onInput = config.onInput || (() => {})
        this.onChange = config.onChange || (() => {})
    }

    find(role) {
        const expr = "[data-role=".concat(role, "]")
        return this.root.find(expr)
    }

    render(container) {
        const config = this.config
        const input = this.find('input')
        input[0].value = config.url !== undefined ? config.url : '';
        input.on('keydown',e => {
            e.stopPropagation()
            if (isHotkey('enter',e)) {
                e.preventDefault()
                input[0].blur()
                this.onEnter(input[0].value)
            }
        })

        input.on('input',() => {
            this.onInput(input[0].value)
        })

        input.on('change',() =>{
            setTimeout(() =>{
                this.onChange(input[0].value)
            }, 10)
        });
        container.append(this.root)
    }
}