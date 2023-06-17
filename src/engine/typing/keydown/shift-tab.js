// shift + Tab 键
const shiftTab = function(e){
    e.preventDefault()
    this.command.execute('outdent')
    return false
}
export default shiftTab