
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';


//////////////////////////////////////////////////////////////////////


const styles = theme => ({
  frame: {
    "background-color": theme.palette.primary.main,
    display: "flex",
  },
  text: {
    flex: 1,
    "background-color": "black",
    color: "silver",
    margin: "1px 0 0 0",
    border: "none",
    outline: "none",
    "vertical-align": "middle",
    padding: "0.25em",
    resize: "none",
    height: "3em",
    "font-family": "'Courier New', monospace",
    "font-weight": "normal",
    "font-size": "16pt",
  },
});


//////////////////////////////////////////////////////////////////////


class Input extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
    this.input = React.createRef();
  }
  
  componentDidMount() {
    window.client.react.input = this;
    window.client.initInput(this.input.current);
  }
  
  render() {
    const { classes } = this.props;
    
    return (
      <div className={classes.frame}>
        <textarea ref={this.input} className={classes.text}  autoComplete="off" autoFocus></textarea>
      </div>
    );
  }
}

Input.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

export default withStyles(styles, { withTheme: true })(Input);
