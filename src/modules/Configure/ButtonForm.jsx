
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import TextField from '@material-ui/core/TextField';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';


//////////////////////////////////////////////////////////////////////


const styles = theme => ({
  frame: {
    position: "relative",
    width: "100%",
  },
  row: {
    width: "100%",
    display: "flex",
    flexFlow: "row wrap",
    justifyContent: "space-between",
  },
  switchText: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchBase: {
    [theme.breakpoints.down('sm')]: {
      height: "24px",
    },
  },
  inputBase: {
    padding: 0.25*theme.spacing.unit,
    [theme.breakpoints.up('md')]: {
      padding: theme.spacing.unit,
    },
  },
});


//////////////////////////////////////////////////////////////////////


class ButtonForm extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
    };
  }
  
  static save() {
    window.client.saveButtons();
  }
  
  componentDidMount() {
  }
  
  componentWillUnmount() {
  }

  render() {
    const { classes, item, handleChange } = this.props;
    
    const icon = item.icon.startsWith('icon-');
    
    return (
      <div className={classes.frame}>
        <Tooltip title="Button preview.">
          <IconButton>
            <Icon className={icon ? item.icon : null}>{!icon && item.icon}</Icon>
          </IconButton>
        </Tooltip>
        <TextField label="Icon" value={item.icon} onChange={handleChange('icon')} inputProps={{ classes: { input: classes.inputBase } }} />
        <TextField label="Badge Expression" fullWidth value={item.count} onChange={handleChange('count')} inputProps={{ classes: { input: classes.inputBase } }} />
        <TextField label="Tooltip" fullWidth value={item.tooltip} onChange={handleChange('tooltip')} inputProps={{ classes: { input: classes.inputBase } }} />
      </div>
    );
  }
}

ButtonForm.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  item: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleNumber: PropTypes.func.isRequired,
  handleSwitch: PropTypes.func.isRequired,
};

export default withStyles(styles, { withTheme: true })(ButtonForm);
