
class Hr {
    constructor(engine){
        if (engine) {
            this.engine = engine
            this.card = engine.card
        }
    }

    embedToolbar() {
        return [
            {
                type: 'dnd'
            }, 
            {
                type: 'copy'
            }, 
            {
                type: 'separator'
            }, 
            {
                type: 'delete'
            }
        ]
    }

    select = () => {
        const element = this.cardRoot.find('[data-card-element="center"]')
        element.addClass("lake-hr-select")
    }

    unselect = () => {
        const element = this.cardRoot.find('[data-card-element="center"]')
        element.removeClass("lake-hr-select")
    }

    activate = () => {
        const element = this.cardRoot.find('[data-card-element="center"]')
        element.addClass("lake-hr-active")
    }

    unactivate = () => {
        const element = this.cardRoot.find('[data-card-element="center"]')
        element.removeClass("lake-hr-active")
    }

    selectByOther = (cardRoot,value) => {
        const element = this.cardRoot.find('[data-card-element="center"]')
        element.css("background-color", value)
        element.find("hr").css("background-color", value)
    }

    unselectByOther = () => {
        const element = this.cardRoot.find('[data-card-element="center"]')
        element.css("background-color", "")
        element.find("hr").css("background-color", "")
    }

    activateByOther = (cardRoot , value) => {
        this.selectByOther(cardRoot, value)
    }

    unactivateByOther = () => {
        this.unselectByOther()
    }

    render(container) {
        container.append('<hr />')
    }
}

Hr.type = 'block'
export default Hr