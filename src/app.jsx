import React from "react"
import ReactDOM from "react-dom"
import Immutable from "immutable"

import MainCSS from "./main.css"

import PubNub from "pubnub";

/*
//toolbar
//main canvas
//button to add rect
//button to undo
//button to redo

 //button to delete selected rect
 //click to select rect
 //show rect as selected
 //drag rect

 connect two instances together using naive algorithm
 only capture history when doing end of moving rect, or deleting, or creating, or changing selection.
    don't capture history during the rect move
 connect to the same PN channel
 test that i don't receive my own messages
 send events
    change:  nodeid, property id, new value
    add:  nodeid, placed after other nodeid (or
    delete: nodeid

 */

var CHANNEL = "joshdemo76";
var uuid = "id"+Math.floor(Math.random()*100);

var pn = PubNub.init({
    subscribe_key:"sub-c-a076eb0a-eaf8-11e5-baae-0619f8945a4f",
    publish_key:"pub-c-b0117d93-cf4b-4061-8f17-c1ca705066a6",
    error: function(err){
        console.log("error happened",err);
    },
    uuid: uuid
});

pn.subscribe({
    channel:CHANNEL,
    message:function(mess,env,chgrp,time, ch){
        if(mess.uuid == uuid) {
            //console.log("my own");
            return;
        }
        //console.log("message",mess);
        //console.log("envelope",env);
        //console.log("channel or group",chgrp);
        //console.log("time",time);
        //console.log("channel",ch);
        DocumentModel.processEvent(mess);
    },
    presence: function(pres){
        //console.log("presence",pres);
    }
});


function publish(msg) {
    msg.uuid = uuid;
    pn.publish({
        channel:CHANNEL,
        message:msg
    })
}

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
            publish({
                nodeid:r.get('id'),
                props:[
                    { id:'x', value:r.get('x')+diff.x },
                    { id:'y', value:r.get('y')+diff.y }
                ]
            });
            return r.set('x',r.get('x')+diff.x).set('y',r.get('y')+diff.y);
        }));
    },
    processEvent: function(obj) {
        //console.log("processing",obj);
        var rects = this.model.get('rects');
        var found = rects.find(function(r){
            return r.get('id') == obj.nodeid;
        });
        //console.log("found = ", found);
        var n = rects.indexOf(found);
        //console.log("n = ", n);
        this.setModel(this.model.updateIn(['rects',n], function(r){
            for(var i=0; i<obj.props.length; i++) {
                var prop = obj.props[i];
                //console.log("prop = ", prop);
                r = r.set(prop.id, prop.value);
            }
            return r;
            //return r.set('x',r.get('x')+diff.x).set('y',r.get('y')+diff.y);
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


