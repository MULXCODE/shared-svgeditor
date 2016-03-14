import React from "react"
import ReactDOM from "react-dom"
import Immutable from "immutable"

import MainCSS from "./main.css"

/*
toolbar
main canvas
button to add rect
button to delete selected rect
button to undo
button to redo
click to select rect
show selection handles on the rect
drag rect
 */


var arr = [{ x:20, y:30, w:40, h:50}, { x:100, y:30, w:40, h:20} ];

var DocumentModel = {
    listeners:[],
    rects: Immutable.fromJS(arr),
    history:[],
    historyIndex:0,
    getModel: function() {
        return this.rects;
    },
    moved: function(rect,diff) {
        this.history = this.history.slice(0,this.historyIndex+1)
        var n = this.rects.indexOf(rect);
        var newrects = this.rects.updateIn([n],function(r){
            return r.set('x',r.get('x')+diff.x).set('y',r.get('y')+diff.y);
        });
        this.history.push(newrects);
        this.historyIndex++;
        this.rects = newrects;
        this.fireUpdate();
    },
    on: function(type, cb) {
        this.listeners.push(cb);
    },
    fireUpdate: function() {
        var self = this;
        this.listeners.forEach(function(cb) {
            cb(self.getModel())
        })
    },
    addNewRect: function() {
        var rect = Immutable.fromJS({x:50,y:50, w:50, h:50});
        this.rects = this.rects.push(rect);
        this.fireUpdate();
    },
    undo: function() {
        if(this.historyIndex <= 0) return;
        console.log("undoing");
        this.rects = this.history.pop();
        this.historyIndex--;
        this.fireUpdate();
    }
};

class Rect extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,
            prev: null
        }
    }
    render() {
        var rect = <rect width={this.props.model.get('w')}
                     height={this.props.model.get('h')}
                     x={this.props.model.get('x')}
                     y={this.props.model.get('y')}
                     fill="cyan" stroke="black"
                     className={this.state.pressed?"selected":""}
                     onMouseDown={this.mouseDown.bind(this)}
                     onMouseMove={this.mouseMove.bind(this)}
                     onMouseUp={this.mouseUp.bind(this)}
                    />
        return rect
    }
    mouseDown(e) {
        this.setState({
            pressed:true,
            prev: {
                x: e.clientX,
                y: e.clientY
            }
        })
    }
    mouseMove(e) {
        if(!this.state.pressed) return;
        var curr = { x: e.clientX, y: e.clientY };
        DocumentModel.moved(this.props.model, { x: curr.x-this.state.prev.x, y: curr.y-this.state.prev.y });
        this.setState({
            prev:curr
        });
    }
    mouseUp(e) {
        this.setState({
            pressed:false
        })
    }

}

class DrawingCanvas extends React.Component {
    renderRects() {
        return this.props.rects.map(function(rect,i) {
            return <Rect model={rect} key={"id"+i}/>
        })
    }
    render() {
        return <svg className="main-canvas"><g>{this.renderRects()}</g></svg>
    }
}
class Toolbar extends React.Component {
    render() {
        return <div className="toolbar">
            <button onClick={DocumentModel.addNewRect.bind(DocumentModel)}>add</button>
            <button>delete selection</button>
            <button onClick={DocumentModel.undo.bind(DocumentModel)}>undo</button>
            <button>redo</button>
        </div>
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        console.log("starting the constructor")
        this.state = {
            rects: DocumentModel.getModel(),
            selected:null
        }
    }
    componentWillMount() {
        var self = this;
        DocumentModel.on("update",function(state) {
            self.setState({rects:state});
        })
    }

    render() {
        return <div className="main">
            <Toolbar/>
            <DrawingCanvas rects={this.state.rects}/>
        </div>
    }
}

ReactDOM.render(<App/>,document.getElementsByTagName("body")[0]);


