
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';

import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import CreateIcon from '@material-ui/icons/Create';

import MailListItem from './MailListItem';


//////////////////////////////////////////////////////////////////////


const styles = theme => ({
  frame: {
    maxHeight: "100%",
    display: "flex",
    "flex-flow": "column nowrap",
  },
  header: {
  },
  title: {
  },
  overflow: {
    overflowY: "auto",
    flex: 1,
  },
  container: {
    display: "flex",
    paddingLeft: "2em",
  },
  flex: {
    flex: 1,
  },
});


//////////////////////////////////////////////////////////////////////


class MailList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { };
  }

  purgeMail = () => {
    window.client.react.mailbox.purgeMail();
  };

  sendMail = () => {
    window.client.react.mailbox.sendMail("", "", "");
  };
  
  render() {
    const { classes, openMail, maillist, unread } = this.props;
    
    return (
      <div className={classes.frame}>
        <div className={classes.header}>
          <Typography variant="subheading" className={classes.title}>
            <span className={classes.container}>
              {maillist.length} Messages ({unread} unread)
              <span className={classes.flex} />
              <Tooltip title="Purge deleted mail.">
                <IconButton onClick={this.purgeMail}>
                  <DeleteForeverIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Send a new message.">
                <IconButton onClick={this.sendMail}>
                  <CreateIcon />
                </IconButton>
              </Tooltip>
            </span>
          </Typography>
        </div>
        <div className={classes.overflow}>
          <List
            dense
            disablePadding
          >
            {maillist.map((mail,i) => (
              <MailListItem key={i} mail={mail} onOpen={() => openMail(i)} />
            ))}
          </List>
        </div>
      </div>
    );
  }
}

MailList.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  openMail: PropTypes.func,
  maillist: PropTypes.array,
  unread: PropTypes.number.isRequired,
};

export default withStyles(styles, { withTheme: true })(MailList);

