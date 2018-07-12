
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';


//////////////////////////////////////////////////////////////////////


const styles = theme => ({
  frame: {
    display: "flex",
    "flex-flow": "column nowrap",
    margin: 0,
    padding: 0,
    border: "none",
    "background-color": theme.palette.primary.main,
    width: "100%",
    height: "100%",
  },
  terminal: {
    flex: 1,
    margin: 0,
    padding: "0.25em",
    position: "relative",
    overflow: "hidden",
  },
  output: {
    "overflow-y": "scroll",
    "overflow-x": "hidden",
    "white-space": "pre-wrap",
    "word-wrap": "break-word",
    position: "absolute",
    margin: 0,
    border: 0,
    padding: 0,
    top: "0.25em",
    left: "0.25em",
    bottom: "0.25em",
    right: "0.25em",
  },
  taskbar: {
    padding: "0",
    position: "relative",
    overflow: "hidden",
  },
  links: {
    "overflow-y": "hidden",
    "overflow-x": "auto",
    "vertical-align": "middle",
    "text-align": "center",
    height: "1em",
    padding: "0.25em",
  },
  prompt: {
    overflow: "hidden",
    "white-space": "pre-wrap",
    "text-align": "left",
    "vertical-align": "middle",
    height: "1em",
    padding: "0.25em",
  },
});


//////////////////////////////////////////////////////////////////////


class Terminal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { inputid: props.ids.input };
  }
  
  focusInput = () => {
    this.state.input && this.state.input.focus();
  };

  componentDidMount() {
    this.setState({ input: document.getElementById(this.state.inputid) });
  }

  render() {
    const { classes, theme, ids} = this.props;
    
    return (
      <div className={classes.frame} onClick={this.focusInput}>
        <div className={classNames(classes.terminal, "ansi-37 ansi-40")}>
          <div id={ids.output} className={classNames(classes.output, "ansi-37 ansi-40")}></div>
        </div>
        <div className={classes.taskbar}>
          <div id={ids.links} className={classNames(classes.links, "ansi-1-34 ansi-40")}></div>
          <div id={ids.prompt} className={classNames(classes.prompt, "ansi-37 ansi-40")}></div>
        </div>
      </div>
    );
  }

}

export default withStyles(styles, { withTheme: true })(Terminal);

