import React from 'react'
import Engine from '../engine'
import '../engine/index.less'
import './index.less'

class Editor extends React.Component{
    state = {}

    constructor(props){
        super(props)
        this.editArea = React.createRef()
    }

    componentDidMount(){
        this.engine = this.renderEditor()
    }

    componentWillUnmount(){
        this.engine && this.engine.destroy()
    }
    
    renderEditor() {
        const engine = Engine.create(this.editArea.current, {})
        engine.on("change", value => {
            console.log(value)
            this.updateState()
        })
        engine.on("select", () => {
            this.updateState()
        })
        return engine
    }

    updateState(){
        if(!this.engine) return 

        const boldState = {
            className:this.engine.command.queryState('bold') ? "active" : "",
            disabled:function(){
                const tag = this.engine.command.queryState('heading') || 'p'
                return /^h\d$/.test(tag)
            }.call(this)
        }

        const italicState = {
            className:this.engine.command.queryState('italic') ? "active" : ""
        }

        const underlineState = {
            className:this.engine.command.queryState('underline') ? "active" : ""
        }

        const quoteState = {
            className:this.engine.command.queryState('quote') ? "active" : ""
        }

        const h1State = {
            className:this.engine.command.queryState('heading') === "h1" ? "active" : ""
        }

        const h2State = {
            className:this.engine.command.queryState('heading') === "h2" ? "active" : ""
        }

        const h3State = {
            className:this.engine.command.queryState('heading') === "h3" ? "active" : ""
        }

        const orderedlistState = {
            className:this.engine.command.queryState('tasklist') === "orderedlist" ? "active" : ""
        }

        const unorderedlistState = {
            className:this.engine.command.queryState('tasklist') === "unorderedlist" ? "active" : ""
        }

        const tasklistState = {
            className:this.engine.command.queryState('tasklist') === "tasklist" ? "active" : ""
        }

        this.setState({
            boldState,
            italicState,
            underlineState,
            quoteState,
            h1State,
            h2State,
            h3State,
            orderedlistState,
            unorderedlistState,
            tasklistState
        })
    }

    onHeading = (event,type) => {
        event.preventDefault()
        if(this.engine){
            this.engine.command.execute('heading', type)
        }
    }

    onList = (event,type) => {
        event.preventDefault()
        if(this.engine){
            this.engine.command.execute('tasklist',type)
        }
    }

    onCommon = (event,type) => {
        event.preventDefault()
        if(this.engine){
            this.engine.command.execute(type)
        }
    }

    render() {
        const { boldState,
            italicState,
            underlineState,
            quoteState,
            h1State,
            h2State,
            h3State,
            orderedlistState,
            unorderedlistState,
            tasklistState } = this.state
        return (
            <div className="example-layout">
                <h2 className="example-title">LARK-EDITOR-ENGINE Example</h2>
                <button {...h1State} onClick={event => { this.onHeading(event,'h1') }}>h1</button>
                <button {...h2State} onClick={event => { this.onHeading(event,'h2') }}>h2</button>
                <button {...h3State} onClick={event => { this.onHeading(event,'h3') }}>h3</button>
                <button {...boldState} onClick={event => { this.onCommon(event,'bold') }}>bold</button>
                <button {...italicState} onClick={event => { this.onCommon(event,'italic') }}>italic</button>
                <button {...underlineState} onClick={event => { this.onCommon(event,'underline') }}>underline</button>
                <button {...quoteState} onClick={event => { this.onCommon(event,'quote') }}>quote</button>
                <button {...orderedlistState} onClick={event => { this.onList(event,'orderedlist') }}>orderedlist</button>
                <button {...unorderedlistState} onClick={event => { this.onList(event,'unorderedlist') }}>unorderedlist</button>
                <button {...tasklistState} onClick={event => { this.onList(event,'tasklist') }}>tasklist</button>
                <div className="lake-engine" ref={this.editArea}></div>
            </div>
        )
    }
}
export default Editor