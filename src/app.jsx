import React from "react"
import ReactDOM from "react-dom"
import Immutable from "immutable"

import MainCSS from "./main.css"

/*
//toolbar
//main canvas
//button to add rect
//button to undo
//button to redo

 button to delete selected rect
 click to select rect
 show selection handles on the rect

//drag rect

 */


var arr = {
    selected:null,
    rects:[{ x:20, y:30, w:40, h:50, id:'00'}, { x:100, y:30, w:40, h:20, id:'01'} ]};

var DocumentModel = {
    listeners:[],
    model: Immutable.fromJS(arr),
    history:[],
    historyIndex:0,
    getModel: function() {
        return this.model;
    },
    setModel: function(newModel) {
        this.history.push(newModel);
        this.historyIndex++;
        this.model = newModel;
        this.fireUpdate();
    },
    moved: function(index,diff) {
        this.history = this.history.slice(0,this.historyIndex+1)
        this.setModel(this.model.updateIn(['rects',index], function(r) {
            return r.set('x',r.get('x')+diff.x).set('y',r.get('y')+diff.y);
        }));
    },
    on: function(type, cb) {
        this.listeners.push(cb);
    },
    fireUpdate: function() {
        var model = this.getModel();
        this.listeners.forEach(function(cb) {
            cb(model)
        })
    },
    addNewRect: function() {
        var rect = Immutable.fromJS({x:50,y:50, w:50, h:50, id:""+Math.floor(Math.random()*100)});
        this.setModel(this.model.updateIn(['rects'], function(rects) {
            return rects.push(rect)
        }));
    },
    undo: function() {
        if(this.historyIndex <= 0) return;
        this.historyIndex--;
        this.model = this.history[this.historyIndex];
        this.fireUpdate();
    },
    redo: function() {
        if(this.historyIndex >= this.history.length-1) return;
        this.historyIndex++;
        this.model = this.history[this.historyIndex];
        this.fireUpdate();
    },
    setSelected: function(val) {
        this.setModel(this.model.set('selected',val))
    },
    getSelected: function() {
        return this.model.get('selected')
    },
    isSelected: function(rect) {
        if(rect == null) return false;
        if(this.getSelected() == null) return false;
        if(this.getSelected().get('id') == rect.get('id')) return true;
        return false;
    },
    deleteSelection: function() {
        var sel = this.model.get('selected');
        if(!sel) return;
        this.setModel(this.model.updateIn(['rects'], function(rects) {
            var n = rects.indexOf(sel);
            return rects.splice(n,1);
        }));
        this.setModel(this.model.set('selected',null));
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
        var selected = DocumentModel.isSelected(this.props.model);
        var rect = <rect width={this.props.model.get('w')}
                     height={this.props.model.get('h')}
                     x={this.props.model.get('x')}
                     y={this.props.model.get('y')}
                     fill="cyan" stroke="black"
                     className={selected?"selected":"unselected"}
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
        });
        DocumentModel.setSelected(this.props.model);
    }
    mouseMove(e) {
        if(!this.state.pressed) return;
        var curr = { x: e.clientX, y: e.clientY };
        DocumentModel.moved(this.props.index, { x: curr.x-this.state.prev.x, y: curr.y-this.state.prev.y });
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
            return <Rect model={rect} key={"id"+i} index={i}/>
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
            <button onClick={DocumentModel.deleteSelection.bind(DocumentModel)}>delete selection</button>
            <button onClick={DocumentModel.undo.bind(DocumentModel)}>undo</button>
            <button onClick={DocumentModel.redo.bind(DocumentModel)}>redo</button>
        </div>
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            model: DocumentModel.getModel()
        }
    }
    componentWillMount() {
        var self = this;
        DocumentModel.on("update",function(state) {
            self.setState({model:state});
        })
    }

    render() {
        var selected = this.state.model.get("selected");
        return <div className="main">
            <Toolbar/>
            <DrawingCanvas rects={this.state.model.get('rects')}/>
            <label>selected = {selected==null?"null":selected.get('id')}</label>
        </div>
    }
}

ReactDOM.render(<App/>,document.getElementsByTagName("body")[0]);


