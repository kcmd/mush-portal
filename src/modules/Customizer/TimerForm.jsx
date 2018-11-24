
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';


//////////////////////////////////////////////////////////////////////


const styles = theme => ({
  frame: {
    display: "flex",
    flexFlow: "row nowrap",
  },
  flex: {
    flex: 1,
  },
  switchText: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
});


//////////////////////////////////////////////////////////////////////


class TimerForm extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
    };
  }
  
  componentDidMount() {
  }
  
  componentWillUnmount() {
  }

  render() {
    const { classes, item, handleNumber, handleSwitch } = this.props;
    
    return (
      <div className={classes.frame}>
        <TextField type="number" label="Delay seconds" className={classes.flex} value={String(item.delay)} onChange={handleNumber('delay')} />
        <span className={classes.switchText}>
          <Typography>Repeat this timer?</Typography>
          <Switch checked={item.repeat} onChange={handleSwitch('repeat')} />
        </span>
        <TextField type="number" disabled={!item.repeat} label="Number of times" className={classes.flex} value={String(item.times)} onChange={handleNumber('times')} />
      </div>
    );
  }
}

TimerForm.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  item: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleNumber: PropTypes.func.isRequired,
  handleSwitch: PropTypes.func.isRequired,
};

export default withStyles(styles, { withTheme: true })(TimerForm);

