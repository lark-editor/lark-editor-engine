
class TinyCanvas { 
    constructor(options){
        if(!options.container)
            throw new Error("please set a dom cantainer!")
        this.options = Object.assign({
            container: null,
            limitHeight: 5e3,
            canvasCache: [],
            canvasCount: 0
        }, options)
        options.container.style["line-height"] = "0px"
    }

    _removeCanvas(){
        const { canvasCache } = this.options
        canvasCache.forEach(canvas => {
            canvas.parentElement.removeChild(canvas)
        })
        this.options.canvasCache = []
    }

    _getCanvas(key){
        const { canvasCache } = this.options
        key = key > 0 ? key - 1 : key
        return canvasCache[key]
    }

    resize( width , height ){
        const { limitHeight , canvasCount , container } = this.options
        let { canvasCache } = this.options
        const index = Math.ceil(height / limitHeight)
        if(index !== canvasCount){
            this._removeCanvas()
            canvasCache = []
            for (let i = 0; i < index; i++) {
                const canvas = document.createElement("canvas")
                canvas.style["vertical-align"] = "bottom"
                canvas.setAttribute("width", width)
                if(i === index - 1){
                    canvas.setAttribute("height", height % limitHeight)
                }else{
                    canvas.setAttribute("height", limitHeight)
                }
                container.appendChild(canvas)
                canvasCache.push(canvas)
            }
            this.options.canvasCache = canvasCache
        }else{
            const canvas = this._getCanvas(index)
            canvasCache.forEach(can => {
                can.setAttribute("width", width)
            })
            if(canvas){
                canvas.setAttribute("height", height % limitHeight)
            }
        }
    }

    _handleSingleRect(options){
        const { x , y , index , width , height , callback } = options
        const { limitHeight } = this.options
        const canvas = this._getCanvas(index)
        if(canvas){
            const context = canvas.getContext("2d")
            callback({
                x,
                y:y - limitHeight * (index - 1),
                width,
                height,
                context 
            })
        }
    }

    _drawRect(options){
        const { x , y , width , height , fill , stroke } = options
        const callback = opts => {
            const { context } = opts
            context.fillStyle = fill === undefined ? "#FFEC3D" : fill
            context.strokeStyle = stroke === undefined ? "#FFEC3D" : stroke
            context.fillRect(opts.x, opts.y, opts.width, opts.height)
        }
        this._handleRect({
            x,
            y,
            width,
            height,
            callback
        })
    }

    _handleRect(options){
        const { x , y , width , height , callback } = options
        const { limitHeight } = this.options
        const dft = {
            x,
            y
        },
        last = {
            x:x + width,
            y:y + height
        }
        const dftIndex = Math.ceil(dft.y / limitHeight)
        const lastIndex = Math.ceil(last.y / limitHeight)
        if(dftIndex === lastIndex){
            this._handleSingleRect(Object.assign({},dft,{
                index:dftIndex,
                width,
                height,
                callback
            }))
        }else{
            this._handleSingleRect(Object.assign({},dft,{
                index:dftIndex,
                width,
                height,
                callback
            }))
            this._handleSingleRect(Object.assign({},dft,{
                index:lastIndex,
                width,
                height,
                callback
            }))
        }
    }

    getImageData(options){
        const { x , y , width , height } = options
        const { limitHeight } = this.options
        const index = Math.ceil(height / limitHeight)
        const canvas = this._getCanvas(index)
        const context = canvas.getContext("2d")
        return context.getImageData(x,y,width,height)
    }

    draw(type,options){
        this["_draw" + type](options)
    }

    clearRect(options){
        const { x , y , width , height } = options
        const callback = opts => {
            const { context } = opts
            context.clearRect(opts.x,opts.y,opts.width,opts.height)
        }
        this._handleRect({
            x,
            y,
            width,
            height,
            callback
        })
    }

    clear(){
        const { canvasCache } = this.options
        canvasCache.forEach(canvas => {
            const context = canvas.getContext("2d")
            const width = Number(canvas.getAttribute("width"))
            const height = Number(canvas.getAttribute("height"));
            context.clearRect(0, 0, width, height)
        })
    }

    destroy(){
        this._removeCanvas()
    }
}
export default TinyCanvas