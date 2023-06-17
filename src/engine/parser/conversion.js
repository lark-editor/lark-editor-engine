import conversion from '../constants/conversion'
import lodashCloneDeep from 'lodash/cloneDeep'

class Conversion {
    constructor(){
        this.data = conversion
    }

    getValue() {
        return this.data
    }

    clone() {
        const dupData = lodashCloneDeep(this.data)
        const dupConversion = new Conversion()
        dupConversion.data = dupData
        return dupConversion
    }
}
export default Conversion