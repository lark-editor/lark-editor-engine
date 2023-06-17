import getNodeModel from '../models/node'
import tooltip from './tooltip'
import { escape } from '../utils/string'

const template = config => {
    return "\n  <span class=\"lake-embed-toolbar-item\">\n    <a class=\"lake-embed-toolbar-btn\">\n      <span class=\"lake-icon lake-icon-".concat(escape(config.iconName), "\"></span>\n    </a>\n  </span>\n  ")
}

export default class {
    constructor(config){
        this.config = config
        this.root = getNodeModel(template(config));
    }

    render(container) {
        const config = this.config
        container.append(this.root)
  
        if (config.title) {
            this.root.on('mouseenter', () => {
                tooltip.show(this.root, config.title)
            });
            this.root.on('mouseleave', () => {
                tooltip.hide()
            })
            this.root.on('mousedown', () => {
                tooltip.hide()
            })
        }
  
        this.root.find('a').on('click', e => {
            e.preventDefault()
            e.stopPropagation()
            config.onClick()
        })
    }
}