import { isHotkey } from '../utils/is-hotkey'

class Hotkey{
    constructor(command){
        this.data = {}
        this.command = command
        this.editArea = command.change.editArea
        this.disabled = false
        this.editArea.on('keydown', this.handleKeydown)
    }

    handleKeydown = e => {
        if (this.disabled) {
            return
        }
        Object.keys(this.data).forEach(hotkey => {
            const callback = this.data[hotkey]
            if (isHotkey(hotkey,e)) {
                e.preventDefault()
                callback()
                return false
            }
        })
    }

    set() {
        const args = Array.prototype.slice.call(arguments)
        const hotkey = args.shift()
        if(!hotkey || hotkey === "")
            return
        this.data[hotkey] = () => {
            this.command.execute.apply(this.command, args)
        }
    }

    enable() {
        this.disabled = false
    }

    disable() {
        this.disabled = true
    }

    destroy() {
        this.editArea.off('keydown', this.handleKeydown)
    }
}
export default Hotkey