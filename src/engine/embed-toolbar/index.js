import getNodeModel from '../models/node'
import Button from './button'
import InputUrl from './input-url'

const template = () => {
    return '<div class="lake-embed-toolbar lake-embed-toolbar-active" contenteditable="false"></div>'
}

class EmbedToolbar {
    constructor(config){
        this.addItems = group => {
            this.config.list.forEach(subConfig => {
                if (subConfig.type === 'button') {
                    new Button(subConfig).render(group)
                }
        
                if (subConfig.type === 'url') {
                    new InputUrl(subConfig).render(group)
                }
        
                if (subConfig.type === 'node') {
                    group.append(subConfig.node)
                }
            })
        }
      
        this.setPosition = () => {
            // 传入 range，定位在 range 下面
            const range = this.config.range
            if (!range)
                return

            const rect = range.getBoundingClientRect()
            let left = Math.round(window.pageXOffset + rect.left)
            const top = Math.round(window.pageYOffset + rect.top + rect.height) + 5
            const toolbarWidth = this.root[0].clientWidth
            const docWidth = document.body.clientWidth
        
            if (left + toolbarWidth > docWidth - 10) {
                left = docWidth - toolbarWidth - 10
            }
        
            this.root.css({
                left: left + 'px',
                top: top + 'px'
            })
        }
    
        this.config = config
        this.root = getNodeModel(template())
        this.image = this.find('image')
    }

    find(role) {
        const expr = "[data-role=".concat(role, "]")
        return this.root.find(expr)
    }

    destroy() {
        this.root.remove()
    }

    hide() {
        this.root.removeClass('lake-embed-toolbar-active')
    }

    show() {
        this.root.addClass('lake-embed-toolbar-active')
    }

    render(container) {
        const config = this.config
        const group = getNodeModel('<div class="lake-embed-toolbar-group"></div>')
        this.root.append(group)
        this.addItems(group)
        container.append(this.root)
        this.setPosition() 
        // inline 目前用于上传错误提示
        if (config.type === 'inline') {
            this.root.addClass('lake-embed-toolbar-inline')
        } else {
            this.root.addClass('lake-embed-toolbar-block')
        }
  
        if (['center', 'right'].indexOf(config.align) >= 0) {
            this.root.addClass("lake-embed-toolbar-" . concat(config.align))
        }

        this.root.on('click', e => {
            e.preventDefault()
            e.stopPropagation()
        })
    }
}

EmbedToolbar.Button = Button
EmbedToolbar.InputUrl = InputUrl

export default EmbedToolbar