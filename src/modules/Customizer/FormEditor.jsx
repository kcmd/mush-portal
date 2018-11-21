
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';


import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';
import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';

import SaveIcon from '@material-ui/icons/Save';
import UndoIcon from '@material-ui/icons/Undo';
import DeleteIcon from '@material-ui/icons/Delete';

import AceEditor from 'react-ace';
import 'brace/mode/mushcode';
import 'brace/mode/javascript';
import 'brace/mode/css';
import 'brace/theme/tomorrow_night_bright';


//////////////////////////////////////////////////////////////////////


const styles = theme => ({
  frame: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflowX: "hidden",
    overflowY: "auto",
  },
  form: {
    height: "100%",
    width: "100%",
    display: "flex",
    flexFlow: "column nowrap", 
  },
  top: {
    display: "flex",
    flexFlow: "row nowrap",
    width: "100%",
  },
  bottom: {
    position: "relative",
    display: "flex",
    flexFlow: "row nowrap",
    bottom: 0,
    width: "100%",
  },
  middle: {
    display: "flex",
    flexFlow: "row nowrap",
    flex: 1,
    alignItems: "center",
  },
  align: {
    width: "100%",
    textAlign: "center",
    verticalAlign: "middle",
  },
  flex: {
    flex: 1,
  },
  block: {
    display: "flex",
    "flex-direction": "column",
  },
});


//////////////////////////////////////////////////////////////////////


class FormEditor extends React.Component {
  constructor(props) {
    super(props);
    
    const { list, listName, selected } = props;

    const template = window.client.actionTemplates[listName];
    
    this.state = {
      list: list,
      item: Object.assign({}, list && selected > -1 ? list[selected] : template),
      selected: selected,
      status: "",
      error: false,
      javascript: true,
      needsToResize: false,
    };
    
    this.editor = React.createRef();
  }
  
  componentDidMount() {
    const { panel } = this.props;
    panel.options.resizeit.resize = this.onResize;
    window.client.panels.resizeit(panel, panel.options.resizeit);
  }
  
  componentWillUnmount() {
    this.props.panel.options.resizeit.resize = null;
    clearTimeout(this.clearStatus);
  }

  static getDerivedStateFromProps(props, state) {
    const { list, listName, selected } = props;
    
    const template = window.client.actionTemplates[listName];
    
    var newState = {};
    
    if (list !== state.list) {
      newState.list = list;
      newState.selected = selected;
      newState.item = Object.assign({}, list && selected > -1 ? list[selected] : template);
      newState.needsToResize = true;
      return newState;
    }
    
    if (selected !== state.selected) {
      newState.selected = selected;
      newState.item = Object.assign({}, list && selected > -1 ? list[selected] : template);
      return newState;
    }
    
    return null;
  }
  
  defaultText() {
    const { list, listName, selected, immutable } = this.props;
    const { item } = this.state;
    const name = item.name;
    const filetype = name.endsWith('.css') ? 'css' : 'js';
    
    if (!immutable) return "";
    
    if (list && selected > -1 && list[selected].text !== "") {
      return list[selected].text.slice();
    } else if (filetype === 'css') {
      const sheets = document.styleSheets;
      
      for (let i = 0; i < sheets.length; i++) {
        if (sheets[i].href) {
          let href = sheets[i].href.split('/').slice(-1)[0];
          if (href === name) {
            return Array(...sheets[i].cssRules).map((rule) => rule.cssText).join('\n');
          }
        }
      }
    }
    
    var req = new window.XMLHttpRequest();
    req.onreadystatechange = () => {
      if (req.readyState === 4) {
        // The request is done; did it work?
        if (req.status === 200) {
          item.name = name;
          item.text = req.responseText;
          this.setState({ item, list, selected });
        } else {
          alert("Unable to download file! See console for more information.");
        }
      }
    };
    req.open("GET", "./" + name);
    req.send();

    return window.client.actionTemplates[listName].text.slice();
  }

  setStatus = (error, status) => {
    this.setState({ error: error, status: status });
    clearTimeout(this.clearStatus);
    setTimeout(this.clearStatus, 3000);
  };

  clearStatus = () => {
    this.setState({ error: false, status: "" });
  };
  
  handleChange = (key) => (e) => {
    const { item } = this.state;
    item[key] = e.target.value;
    this.setState({ item });
  };
  
  handleNumber = (key) => (e) => {
    const { item } = this.state;
    item[key] = parseInt(e.target.value);
    this.setState({ item });
  };
  
  handleSwitch = (key) => (e) => {
    const { item } = this.state;
    if (item.hasOwnProperty(key)) {
      item[key] = e.target.checked;
      this.setState({ item });
    } else {
      this.setState({ [key]: e.target.checked });
    }
  };
  
  changeText = (text) => {
    const { item } = this.state;
    item.text = text;
    this.setState({ item });
  };

  onResize = () => {
    this.setState({ needsToResize: false });
    this.editor.current.editor.resize();
  };
  
  onSubmit = (e) => {
    const { list, listName, selected, immutable } = this.props;
    const { item } = this.state;
    const client = window.client;
    const css = item.name.endsWith('.css');

    e.preventDefault();

    if (item.name === "") {
      this.setStatus(true, "Name must not be blank." );
      return;
    }
    
    var match = list.map((item) => item.name).indexOf(item.name);
    if (match > -1 && match !== selected) {
      this.setStatus(true, "Name already saved, choose another.");
      return;
    }
    
    if (immutable && selected === -1) {
      this.setStatus(true, "You may only edit existing items.");
      return;
    }
    
    this.setStatus(false, "Saved." );
    
    if (selected > -1) {
      list[selected] = item;
      client.react.customizer.setState({ selected: selected });
    } else {
      list.push(item);
      client.react.customizer.setState({ selected: list.length-1 });
    }
    
    if (css) {
      client.saveCSS();
    } else {
      client.saveLocalStorage(list, listName);
    }
  };
  
  onDelete = () => {
    const { list, listName, selected, immutable } = this.props;
    const { item } = this.state;
    const client = window.client;
    const css = item.name.endsWith('.css');
    
    if (window.confirm("Do you really want to delete that?") && list && selected > -1) {
      if (immutable) {
        let name = list[selected].name;
        list[selected] = Object.assign({}, client.actionTemplates[listName]);
        list[selected].name = name;
        this.setState({ item: Object.assign({}, list[selected]) });
      } else {
        list.splice(selected, 1);
        client.react.customizer.setState({ selected: -1 });
      }
      
      this.setStatus(false, "Deleted." );

      if (css) {
        client.saveCSS();
      } else {
        client.saveLocalStorage(list, listName);
      }
    }
  };
  
  onReset = () => {
    const { list, listName, selected, immutable } = this.props;
    const { item } = this.state;
    var template = Object.assign({}, window.client.actionTemplates[listName]);
    
    if (list && selected > -1) {
      if (immutable) {
        template.name = list[selected].name;
        if (item.text === "") {
          template.text = this.defaultText();
        }
      } else {
        template = list[selected];
      }
    }
    
    this.setState({
      item: Object.assign({}, template),
    });
    
    this.setStatus(false, "Reset.");
  };
  
  componentDidUpdate() {
    if (this.state.needsToResize) {
      this.onResize();
    }
  }

  render() {
    const { classes, selected, Form, immutable } = this.props;
    const { item, error, status } = this.state;
    
    var ltype = "MushCode";
    var rtype = "JavaScript";
    if (!Form) {
      ltype = "Text";
      if (item.name.endsWith('.css')) {
        rtype = "CSS";
      }
    }
    
    var mode = this.state.javascript;
    if (item.hasOwnProperty('javascript')) {
      mode = item.javascript;
    }
    
    return (
      <div className={classes.frame}>
        <form onSubmit={this.onSubmit} className={classes.form}>
        
          <div className={classes.top}>
            <TextField label="Name" className={classes.flex} value={item.name} onChange={this.handleChange('name')} disabled={immutable} />
            <span>
              <ListItem dense>
                <ListItemText primary={ltype} />
                <Switch color="default" checked={mode} onChange={this.handleSwitch('javascript')} />
                <ListItemText primary={rtype} />
              </ListItem>
            </span>
          </div>
          
          {Form && (<Form className={classes.top} item={item} handleNumber={this.handleNumber} handleChange={this.handleChange} handleSwitch={this.handleSwitch} />)}
          
          <AceEditor
            className={classes.flex}
            ref={this.editor}
            mode={mode ? rtype.toLowerCase() : ltype.toLowerCase()}
            width="100%"
            theme="tomorrow_night_bright"
            value={item.text}
            onChange={this.changeText}
            wrapEnabled={true}
            highlightActiveLine={false}
            editorProps={{ $blockScrolling: Infinity }}
          />
          
          <div className={classes.bottom}>
            <Button onClick={this.onDelete} classes={{ label: classes.block }} disabled={selected === -1}>
              <DeleteIcon /> Delete
            </Button>
            <span className={classes.middle}>
              <Typography className={classes.align} color={error ? "error" : "default"}>
                {status}
              </Typography>
            </span>
            <Button onClick={this.onSubmit} classes={{ label: classes.block }} disabled={immutable && selected === -1}>
              <SaveIcon /> Save
            </Button>
            <Button onClick={this.onReset} classes={{ label: classes.block }} disabled={immutable && selected === -1}>
              <UndoIcon /> {immutable && item.text === "" ? "Reset from Source" : "Reset"}
            </Button>
          </div>
          
        </form>
      </div>
    );
  }
}

FormEditor.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  panel: PropTypes.object.isRequired,
  list: PropTypes.array.isRequired,
  listName: PropTypes.string.isRequired,
  selected: PropTypes.number.isRequired,
  Form: PropTypes.func,
  immutable: PropTypes.bool,
};

export default withStyles(styles, { withTheme: true })(FormEditor);
