/* eslint no-eval: 0 */
/* eslint no-unused-vars: 0 */

import React from 'react';
import ReactDOM from 'react-dom';

import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import saveAs from 'file-saver';

import Portal from '../modules/Portal';
import Mailbox from '../modules/Mailbox';
import Sendmail from '../modules/Sendmail';
import BBoard from '../modules/BBoard';
import Upload from '../modules/Upload';
import Backup from '../modules/Backup';
import Configure from '../modules/Configure';
import Spawn from '../modules/Spawn';

import Connection from './connection';
import Emulator from './emulator';
import UserInput from './userinput';
import JSONAPI from './jsonapi';
import Templates from './templates';

import 'jspanel4/dist/jspanel.min.css';

import { jsPanel } from 'jspanel4';

import shortid from 'shortid';

//import 'jspanel4/es6module/extensions/hint/jspanel.hint.js';
//import 'jspanel4/es6module/extensions/modal/jspanel.modal.js';
//import 'jspanel4/es6module/extensions/contextmenu/jspanel.contextmenu.js';
//import 'jspanel4/es6module/extensions/tooltip/jspanel.tooltip.js';
//import 'jspanel4/es6module/extensions/layout/jspanel.layout.js';
//import 'jspanel4/es6module/extensions/dock/jspanel.dock.js';

const EventEmitter = require('events');
const TinyCon = require('tinycon');
const Colors = require('@material-ui/core/colors');

const LOGINFAIL = [
  /There is no player with that name\./,
  /That is not the correct password\./,
  /Either that player does not exist, or has a different password\./,
  /You cannot connect to that player at this time\./,
  /Guest connections not allowed\./,
  /Connection to .* (Non-GUEST) not allowed from .* (.*)/,
  /Too many guests are connected now\./
];

const UnicodeMap = {
  "\u2013": '-',
  "\u2014": '-',
  "\u2018": '\'',
  "\u2019": '\'',
  "\u201B": '\'',
  "\u201C": '"',
  "\u201D": '"',
  "\u201F": '"',
  "\u2032": '\'',
  "\u2033": '"',
  "\u2035": '\'',
  "\u2036": '"',
}

class Client {

  constructor() {
    // Client colors and theme
    this.colors = Colors;
    this.theme = this.createTheme();
    this.mobile = !window.matchMedia(this.theme.breakpoints.up('md').substring(7)).matches;
    
    // client settings
    this.defaultSettings = {
      // font
      fontFamily: "Courier New",
      fontSize: 10,
      // default text colors
      ansiFG: 'ansi-37',
      ansiBG: 'ansi-40',
      invertHighlight: false,
      // terminal settings
      terminalWidth: 100,
      terminalAutoScroll: true,
      // upload editor
      decompileEditor: true,
      decompileKey: 'FugueEdit > ',
      // sidebar navigation
      sidebarOpen: true,
      sidebarAnchor: "right",
      sidebarDense: true,
      sidebarAlwaysShow: false,
      sidebarShowPlayers: true,
      sidebarShowThings: true,
      sidebarShowExits: true,
      sidebarShowCompass: true,
      sidebarLargeCompass: true,
      // debugging
      debugEvents: false,
      debugActions: false,
      // default connection settings, can override in public/local.js
      allowServerChange: true,
      serverAddress: "node.grapenut.org",
      serverSSL: window.location.protocol === "https:",
      serverPort: window.location.protocol === "https:" ? 2001 : 2000,
      // history settings
      historySize: 1000,
      historySpawnSize: 100,
      // command recall
      recallButtons: true,
      recallAnchor: "right",
      recallSize: 1000,
      // mobile settings
      mobileFontSize: 6,
      mobileHideTaskbar: true,
      mobileHideStatusbar: true,
      // user defined actions
      timersEnabled: false,
    };
    this.settings = null;
    
    // map react components to strings
    this.components = {
      "Mailbox": Mailbox,
      "Sendmail": Sendmail,
      "BBoard": BBoard,
      "Upload": Upload,
      "Backup": Backup,
      "Configure": Configure,
      "Spawn": Spawn,
    };
    
    this.templates = new Templates();
    
    this.buttons = [];
    this.triggers = [];
    this.timers = [];
    this.macros = [];
    this.keys = [];
    this.scripts = [{ name: "onLoad.js", text: "" }];
    this.css = [{ name: "ansi.css", text: "" },
                { name: "inverse.css", text: "" }];
    
    this.loadButtons();
    this.loadTriggers();
    this.loadTimers();
    this.loadMacros();
    this.loadKeys();
    this.loadCSS();
    this.loadScripts();
    
    // must come after client .css definitions
    this.loadSettings();
    
    // Terminal UI elements
    this.output = null;
    this.prompt = null;
    this.input = null;
    
    // External Components
    this.events = new EventEmitter();
    this.panels = jsPanel;
    this.tinycon = TinyCon;
    
    // React Components
    this.react = {
      portal: null,
      taskbar: null,
      terminal: null,
      input: null,
      statusbar: null,
      login: null,
      mailbox: null,
      sendmail: null,
      bboard: null,
      upload: null,
      backup: null,
      configure: null,
      spawns: [],
    };
    
    // client variables
    this.conn = null;
    this.container = null;
    
    // app instance toggles
    this.loggedIn = false;
    this.jsonapi = false;
    this.hidden = false;
    this.updateCounter = 0;
    this.updateLines = 0;
    this.eatNewline = false;
    
    // delay time for auto-contents
    this.delayContents = 500;
    
    // number of lines of scroll within which the output scroll down when new items are received
    this.scrollThreshold = 5;
    
    // handle auto-reconnects
    this.reconnectTimer = 2000;
    this.reconnectCount = 0;
    this.reconnectMaxCount = 10;
    
    // init other libraries
    window.client = this;
    this.initPanels();
    this.initNotifications();
    
    // render the app
    this.render();
    
    // start cron timer loop
    this.startTimers();
  }
  
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // rendering, themeing, and styling react components
  
  // render the main react component
  render() {
    ReactDOM.render(React.createElement(Portal, { theme: this.theme }, null), document.getElementById('root'));
  }
  
  // load additional scripts for custom events
  loadScript(src) {
    var tag = document.createElement('script');
    tag.async = false;
    tag.src = src;
    document.getElementsByTagName('body')[0].appendChild(tag);
  }
  
  execUserScript(name) {
    // load user customization file
    const client = this;
    const Window = (w,c,e) => this.getSpawn(w,c,e);
    const SendAPI = (cmd) => this.sendAPI(cmd);
    const SendCommand = (cmd) => this.sendCommand(cmd);
    const SendText = (cmd) => this.sendText(cmd);
    const Output = (text) => this.output.appendText(text);
    
    var script = null;
    for (let i=0; i < client.scripts.length; i++) {
      if (client.scripts[i].name === name) {
        script = client.scripts[i];
        break;
      }
    }
    
    if (script && script.text !== "") {
      try {
        eval(this.filterUnicode(script.text));
      } catch (e) {
        client.debugActions && console.log("Error executing `" + name + "'.");
      }
    }
  }
  
  // evaluate an action javascript with a limited context
  execActionScript(txt, event) {
    const client = this;
    const Window = (w,c,e) => this.getSpawn(w,c,e);
    const SendAPI = (cmd) => this.sendAPI(cmd);
    const SendCommand = (cmd) => this.sendCommand(cmd);
    const SendText = (cmd) => this.sendText(cmd);
    const Output = (text) => this.output.appendText(text);
    
    try {
      eval(this.filterUnicode(txt));
    } catch (e) {
      client.settings.debugActions && console.log("Error executing action:", e);
    }
  }
  
  // load custom CSS style sheet
  loadStyle(src) {
    const file = src.split('/').slice(-1)[0];

    // see if we have a matching css override
    var css = null;
    for (let i=0; i < this.css.length; i++) {
      if (this.css[i].name === file) {
        css = this.css[i];
        break;
      }
    }
    
    var style;
    if (css) {
      // just update the <style> element
      style = this.updateCSS(css);
      if (css.text !== "") return;
    }
    
    // css is not overridden, try to load a <link>
    style = document.createElement("link");
    style.setAttribute("rel", "stylesheet");
    style.setAttribute("type", "text/css");
    style.setAttribute("href", src);
    document.head.appendChild(style);
  }
  
  // update the css object's rules on its <style> element 
  updateCSS(css, erase=false) {
    if (!css) return null;
    
    var style = document.getElementById("override_" + css.name);
    if (style) {
      // remove what's already there
      while (style.firstChild) {
        style.removeChild(style.firstChild);
      }
    } else {
      // create a new style element
      style = document.createElement('style');
      style.setAttribute('id', 'override_' + css.name);
      document.head.appendChild(style);
    }
    
    // update the CSS text on the <style> element
    if (!erase) style.appendChild(document.createTextNode(css.text));
    
    return style;
  }
  
  // unload custom CSS style sheet
  unloadStyle(src) {
    // remove the <link> if it exists
    var links = document.getElementsByTagName("link");
    for (var i = links.length; i >= 0; i--) {
      if (links[i] && links[i].getAttribute("href") !== null && links[i].getAttribute("href").indexOf(src) !== -1) {
        links[i].parentNode.removeChild(links[i]);
      }
    }
    
    // see if we have a css override to erase
    const file = src.split('/').slice(-1)[0];
    var css = null;
    for (let i=0; i < this.css.length; i++) {
      if (this.css[i].name === file) {
        css = this.css[i];
        break;
      }
    }
    
    // we found a css override, delete the contents
    if (css) {
      this.updateCSS(css, true);
    }
  }
  
  // create a theme
  createTheme(theme) {
    const defaultTheme = {
      typography: {
        useNextVariants: true,
      },
      palette: {
        primary: this.colors.indigo,
        secondary: this.colors.blueGrey,
        type: 'dark',
      },
    };
    
    return createMuiTheme(Object.assign(defaultTheme, theme));
  }
  
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // save and load objects from localStorage
  
  // save a text string to a local file
  saveText(filename, text, type) {
    if (!type) {
      type = "text/plain";
    }
    
    if (text.length > 0) {
      var blob = new Blob([text], { type });
      saveAs(blob, filename);
      return true;
    } else {
      return false;
    }
  }
  
  // convert local storage to text
  localStorageToText(indent) {
    const store = window.localStorage;
    var keys = { };
    Object.keys(store).forEach(key => { keys[key] = store[key]; });
    
    if (indent) {
      return JSON.stringify(keys, (key,value) => {
        switch (key) {
          case 'buttons':
          case 'triggers':
          case 'timers':
          case 'macros':
          case 'keys':
          case 'css':
          case 'scripts':
          case 'settings':
          case 'recall_history':
            return JSON.parse(value);
          default:
            return value;
        }
      }, indent);
    } else {
      return JSON.stringify(keys);
    }
  }
    
  // restore window.localStorage from a string
  restoreLocalStorage(text) {
    var store;
    try {
      store = JSON.parse(text, (key,value) => {
        switch (key) {
          case 'buttons':
          case 'triggers':
          case 'timers':
          case 'macros':
          case 'keys':
          case 'css':
          case 'scripts':
          case 'settings':
          case 'recall_history':
            return JSON.stringify(value);
          default:
            return value;
        }
      });
    } catch (e) {
      alert("Failed to parse local storage file!");
      return false;
    }
    
    if (store) {
      Object.keys(store).forEach(key => {
        window.localStorage[key] = store[key];
        
        if (key === "output_history") {
          this.output.loadHistory(key);
        } else if (key.startsWith("output_history_")) {
          let name = key.split('_').slice(2).join('_');
          let panel = this.findSpawn(name);
          panel && panel.react && panel.react.output.loadHistory(key);
        }
      });
      
      this.loadRecallHistory();
      this.loadButtons();
      this.loadTriggers();
      this.loadTimers();
      this.loadMacros();
      this.loadKeys();
      this.loadCSS();
      this.loadScripts();
      this.loadSettings();
      
      this.react.portal.forceUpdate();
    } else {
      alert("Failed to parse local storage file!");
      return false;
    }
    return true;
  }
  
  // load object from localstorage
  loadLocalStorage(obj, key) {
    if (window.localStorage.hasOwnProperty(key)) {
      obj = Object.assign(obj, JSON.parse(window.localStorage[key]));
    }
  }
  
  // clear localStorage keys starting with prefix
  clearLocalStorage(key) {
    delete window.localStorage[key];
  }
  
  // save object to localstorage
  saveLocalStorage(obj, key) {
    window.localStorage[key] = JSON.stringify(obj);
  }
  
  // load a string directly from localstorage
  loadHistoryBuffer(key) {
    if (window.localStorage.hasOwnProperty(key)) {
      return window.localStorage[key];
    }
    return "";
  }
  
  // save a string directly to localstorage
  saveHistoryBuffer(key, text) {
    window.localStorage[key] = text;
  }
  
  // casting a string argument to the correct type
  castString(obj, key, value) {
    if (!obj.hasOwnProperty(key)) return;
    
    var type = typeof obj[key];
    
    if (typeof value === type) {
      obj[key] = value;
    } else {
      switch (type) {
        case "string":
          obj[key] = String.bind(null, value)();
          break;
        case "number":
          obj[key] = Number.bind(null, value)();
          break;
        case "boolean":
          obj[key] = (value === "true" ? true : false);
          break;
        default:
          obj[key] = value;
          break;
      }
    }
  }
  
  // change a setting, performing a secondary action if necessary
  changeSetting(key, value) {
    this.castString(this.settings, key, value);
    
    if (key === 'invertHighlight') {
      if (this.settings[key]) {
        this.loadStyle('./inverse.css');
      } else {
        this.unloadStyle('./inverse.css');
      }
    } else if (key === 'terminalWidth') {
      // send the screen dimensions
      this.output.calcDimensions();
      this.sendText("SCREENWIDTH " + this.settings.terminalWidth);
      this.sendText("SCREENHEIGHT " + Math.floor(this.output.root.parentNode.clientHeight / this.output.dims.height));
    } else if (key === 'timersEnabled') {
      if (this.settings[key]) {
        this.startTimers();
      } else {
        this.stopTimers();
      }
    }
  }
  
  // load user defined taskbar buttons
  loadButtons() {
    this.loadLocalStorage(this.buttons, "buttons");
//    this.react.taskbar && this.react.taskbar.forceUpdate();
  }
  
  // load regex/wildcard pattern triggers
  loadTriggers() {
    this.loadLocalStorage(this.triggers, "triggers");
  }
  
  // load automatic timers
  loadTimers() {
    this.loadLocalStorage(this.timers, "timers");
  }
  
  // load slash command macros
  loadMacros() {
    this.loadLocalStorage(this.macros, "macros");
  }
  
  // load custom keybindings
  loadKeys() {
    this.loadLocalStorage(this.keys, "keys");
  }
  
  // load custom css overrides
  loadCSS() {
    this.loadLocalStorage(this.css, "css");
    
    for (let i=0; i < this.css.length; i++) {
      // override CSS, first check existing styles
      let css = this.css[i];
      
      // autoload CSS changes, except inverse.css
      if (css.name !== "inverse.css") {
        this.updateCSS(css);
      }
    }
  }
  
  // load custom scrips
  loadScripts() {
    this.loadLocalStorage(this.scripts, "scripts");
  }
  
  // load client settings
  loadSettings() {
    this.settings = Object.assign({}, this.defaultSettings);
    this.loadLocalStorage(this.settings, "settings");
    
    if (this.settings['invertHighlight']) {
      this.loadStyle('./inverse.css');
    } else {
      this.unloadStyle('./inverse.css');
    }
  }
  
  // load command recall history
  loadRecallHistory() {
    this.loadLocalStorage(this.input.history, "recall_history");
  }
  
  // save command recall history
  saveRecallHistory() {
    const { recallSize } = this.settings;
    this.clearLocalStorage("recall_history");
    this.saveLocalStorage(this.input.history.slice(-recallSize), "recall_history");
  }
  
  // save user defined taskbar buttons
  saveButtons() {
    this.clearLocalStorage("buttons");
    this.saveLocalStorage(this.buttons, "buttons");
    this.react.taskbar && this.react.taskbar.forceUpdate();
  }
  
  // save regex/wildcard pattern triggers
  saveTriggers() {
    this.clearLocalStorage("triggers");
    this.saveLocalStorage(this.triggers, "triggers");
  }
  
  // save automatic timers
  saveTimers() {
    this.clearLocalStorage("timers");
    this.saveLocalStorage(this.timers, "timers");
  }
  
  // save slash command macros
  saveMacros() {
    this.clearLocalStorage("macros");
    this.saveLocalStorage(this.macros, "macros");
  }
  
  // save custom keybindings
  saveKeys() {
    this.clearLocalStorage("keys");
    this.saveLocalStorage(this.keys, "keys");
  }
  
  // save custom css overrides
  saveCSS() {
    this.clearLocalStorage("css");
    this.saveLocalStorage(this.css, "css");
    
    for (let i=0; i < this.css.length; i++) {
      // update rules in css <style> element
      let css = this.css[i];
      
      if (css.name === "inverse.css") {
        // only load inverse.css if we need it
        if (this.settings.invertHighlight) {
          // unload inverse.css if it is linked
          let links = document.getElementsByTagName("link");
          for (let j = links.length; j >= 0; j--) {
            if (links[j] && links[j].getAttribute("href") !== null) {
              let name = links[j].getAttribute("href").split("/").slice(-1)[0];
              if (name === css.name) {
                links[j].parentNode.removeChild(links[j]);
              }
            }
          }
          
          if (css.text === "") {
            // there is no override, so relink inverse.css
            this.loadStyle('./inverse.css');
          } else {
            // there is an override, update it
            this.updateCSS(css);
          }
        }
      } else {
        // autoload all files that aren't inverse.css
        this.updateCSS(css);
      }
    }
  }
  
  // save custom css overrides
  saveScripts() {
    this.clearLocalStorage("scripts");
    this.saveLocalStorage(this.css, "scripts");
  }
  
  // save client settings
  saveSettings() {
    this.clearLocalStorage("settings");
    this.saveLocalStorage(this.settings, "settings");
  }
  

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // miscellaneous logging and command links

  // detect if more user input is required for a pueblo command
  parseCommand(command) {
    var cmd = command;
    var regex = new RegExp('\\?\\?');
    
    // check for the search token '??'
    if (cmd.search(regex) !== -1) {
      var val = prompt(command);
      
      if (val === null) {
        // user cancelled the prompt, don't send any command
        cmd = '';
      } else {
        // replace the ?? token with the prompt value
        cmd = cmd.replace(regex, val);
      }
    }
    
    return cmd;
  }
  
  // pueblo command links, prompt for user input and replace ?? token if present
  onCommand(cmd) {
    this.sendCommand && this.sendCommand(this.parseCommand(cmd));
  }

  // log messages to the output terminal
  appendMessage(classid, msg) {
    var scroll = false;
    if (this.output) {
      if (this.output.nearBottom(this.scrollThreshold)) {
        scroll = true;
      }
      
      this.output.appendMessage(classid, msg);
      
      scroll && this.output.scrollDown();
      
      this.react.terminal && this.react.terminal.onChange();
    }
  }
  
  
  /////////////////////////////////////////////////////////////////////////////////////////////////
  // manage triggers, timers, macros, and keys
  createPattern(regex, pattern) {
    if (regex) {
      return new RegExp('^' + pattern + '$');
    } else {
      return new RegExp('^' + pattern.split(/\*+/).map(s => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')).join('(.*)') + '$');
    }
  }
  
  replaceArgs(args, text) {
    let newText = text.slice();
    for (let i = args.length-1; i > -1; i--) {
      let tmp = args[i] || "";
      
      try {
        let re = new RegExp('(^|[^\\%])%'+i, 'g');
        let escre = new RegExp('["\'`]', 'g');
        let esc = tmp.replace(escre, '\\$&');
        newText = newText.replace(re, '$1'+esc);
      } catch (e) {
        this.settings.debugActions && console.log("Unable to compile regular expression:", e);
      }
    }
    return newText;
  }
  

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // initialize terminal elements (input, output, prompt) and clear them
  
  // clear terminal
  clear() {
    this.output && this.output.clear();
    this.prompt && this.prompt.clear();
    this.input && this.input.clear();
  }

  // initialize terminal input window
  initInput(input) {
    // Input window
    if (input !== null) {
      this.input = new UserInput(input);
      this.loadRecallHistory();

      // enter key passthrough from UserInput.pressKey
      this.input.onEnter = (cmd) => {
        this.sendCommand(cmd);
        this.prompt && this.prompt.clear();
        this.settings.terminalAutoScroll && this.output.scrollDown();
      };

      // escape key passthrough from UserInput.pressKey
      this.input.onEscape = () => { this.input.clear(); };
      
      // pageup key passthrough from UserInput.pressKey
      this.input.onPageUp = () => { this.output && this.output.scrollPageUp(); };

      // pagedown key passthrough from UserInput.pressKey
      this.input.onPageDown = () => { this.output && this.output.scrollPageDown(); };
    }
  }

  // initialize terminal output window
  initOutput(output, container=null) {
    // Output window
    if (output !== null) {
      this.output = new Emulator(output);
      this.output.container = container;
      this.output.onCommand = (cmd) => { this.onCommand(cmd); };

      output.onunload = () => { this.sendText('QUIT'); this.close(); };
      output.onresize = () => { this.output && this.output.scrollDown(); };
    }
  }
  
  // initialize command prompt
  initPrompt(prompt) {
    // Prompt window
    if (prompt !== null) {
      this.prompt = new Emulator(prompt);
    }
  }
  
  /////////////////////////////////////////////////////////////////////////////////////////////////
  // handle input window focus and output window scrolling
  
  //////////////////////////////////////////////////////
  // animate scrolling the terminal window to the bottom
  scrollDown(root) {
    if (!root) {
      return;
    }

    root.scrollTop = this.root.scrollHeight;
    return;
/*    
    // animated scrolling alternative
    var scrollCount = 0;
    var scrollDuration = 500.0;
    var oldTimestamp = performance.now();
    
    var step = (newTimestamp) => {
      var bottom = root.scrollHeight - root.clientHeight;
      var delta = (bottom - root.scrollTop) / 2.0;

      scrollCount += Math.PI / (scrollDuration / (newTimestamp - oldTimestamp));
      if (scrollCount >= Math.PI) root.scrollTo(0, bottom);
      if (root.scrollTop === bottom) { return; }
      root.scrollTo(0, Math.round(root.scrollTop + delta));
      oldTimestamp = newTimestamp;
      window.requestAnimationFrame(step);
    };
    
    window.requestAnimationFrame(step);
*/
  }
  
  // input focus passthrough
  focus(force) {
    if (this.mobile) return;
    this.input && this.input.focus(force);
  }
  
  // wrapper that scrolls the output if needed
  scrollIfNeeded(fun) {
    var scroll = false;
    
    if (this.output) {
      if (this.output.nearBottom(this.scrollThreshold)) {
        scroll = true;
      }
      
      fun();
      
      scroll && this.output.scrollDown();
      
      this.react.terminal && this.react.terminal.onChange();
    }
  }


  /////////////////////////////////////////////////////////////////////////////////////////////////
  // spawn, focus and close window panels
  addPanel(id, cfg, component) {
    var spawn = this.findSpawn(id);
    
    if (spawn) {
      this.focusPanel(id);
      return spawn;
    }
    
    var comp = component || id;
    var el = this.components[comp];
    
    if (!el) {
      el = Spawn;
    }
    
    var config = cfg || {};
    
    if (!config.id) {
      config.id = id.toLowerCase();
    }
    
    if (!config.headerTitle) {
      config.headerTitle = id;
    }
    
    if (!config.icon) {
      config.icon = "tab";
    }
    
    if (!config.headerLogo) {
      var gameicon = config.icon.startsWith('icon-');
      
      if (gameicon) {
        config.headerLogo = "<i class='" + config.icon + "' style='margin-left: "+this.theme.spacing.unit+"px'></i>";
      } else {
        config.headerLogo = "<i class='material-icons' style='margin-left: "+this.theme.spacing.unit+"px'>" + config.icon + "</i>";
      }
    }
    
    if (!config.panelSize) {
      const margin = this.panels.defaults.maximizedMargin;
      let wstr = 'calc(50% - ' + 1.5*margin + 'px)';

      if (this.mobile) {
        wstr = 'calc(100% - ' + 2*margin + 'px)';
      }
    
      config.panelSize = {
        width: wstr,
        height: 'calc(100% - ' + 2*margin + 'px)',
      };
    }
    
    let ref = React.createRef();
    config.callback = (container) => {
      container.content.style.backgroundColor = this.theme.palette.background.paper;
      config.react = React.createElement(el, { innerRef: ref, id: id.toLowerCase(), panel: container, ...config.props }, null);
      ReactDOM.render(React.createElement(MuiThemeProvider, { theme: this.theme }, config.react), container.content, () => {
        // add the helpText() controlbar icon
        let obj = ref.current;
        if (obj && obj.helpText) {
          let helpButton = document.createElement('div');
          helpButton.classList.add("jsPanel-btn","jsPanel-btn-help");
          helpButton.innerHTML = `<svg class="jsPanel-icon" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512"><circle fill="currentColor" cx="255.984" cy="492" r="20"/><path fill="currentColor" d="M412.979,155.775C412.321,69.765,342.147,0,255.984,0c-86.57,0-157,70.43-157,157c0,11.046,8.954,20,20,20 s20-8.954,20-20c0-64.514,52.486-117,117-117s117,52.486,117,117c0,0.356,0.009,0.71,0.028,1.062 c-0.405,46.562-28.227,88.348-71.12,106.661c-40.038,17.094-65.908,56.675-65.908,100.839V412c0,11.046,8.954,20,20,20 c11.046,0,20-8.954,20-20v-46.438c0-28.117,16.334-53.258,41.614-64.051c57.979-24.754,95.433-81.479,95.418-144.516 C413.016,156.585,413.003,156.179,412.979,155.775z"/></svg>`;
          helpButton.style.color = this.panels.calcColors(this.panels.defaults.theme)[3];
          container.controlbar.insertBefore(helpButton, container.controlbar.firstChild);
          
          jsPanel.pointerup.forEach((which) => {
            helpButton.addEventListener(which, (evt) => {
              obj.helpText(evt.currentTarget);
            });
          });
        }
        
        window.client.react.spawns.push(obj);
      });
      
    };
    
    config.container = this.container;
    
    this.panels.create(config);
    return ref.current;
  }
  
  // create a Spawn window
  // don't focus if it already exists
  getSpawn(id, cfg, el) {
    let spawn = this.findSpawn(id);
    if (spawn) return spawn;
    
    return this.addPanel(id, cfg, el);
  }
  
  // delete spawn window from internal list
  delSpawn(id) {
    const spawns = this.react.spawns;
    const lower = id.toLowerCase();
    for (let i=0; i < spawns.length; i++) {
      if (spawns[i] && spawns[i].props.id === lower) {
        spawns.splice(i, 1);
      }
    }
  }
  
  // find spawn window in internal list
  findSpawn(id) {
    const spawns = this.react.spawns;
    const lower = id.toLowerCase();
    for (let i=0; i < spawns.length; i++) {
      if (spawns[i] && spawns[i].props.id.toLowerCase() === lower) {
        return spawns[i];
      }
    }
    return null;
  }
  
  // find and close a panel
  closePanel(id) {
    var panels = this.panels.getPanels(function() {
      return (this.id === id || this.headertitle.innerText === id);
    });
    
    if (panels.length > 0) {
      if (panels[0].status === 'minimized') {
        this.react.taskbar.popTask(panels[0]);
      }
      panels[0].close();
    }
  }
  
  // bring a panel into focus
  focusPanel(id) {
    var panels = this.panels.getPanels(function() {
      return (this.id === id || this.headertitle.innerText === id);
    });
    
    if (panels.length > 0) {
      if (panels[0].status === 'minimized') {
        this.react.taskbar.popTask(panels[0]);
      } else {
        panels[0].unsmallify();
        panels[0].front();
      }
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////

  // connect to the game server and setup message handlers
  connect() {
    var client = this;

    let serverProto = this.settings.serverSSL ? "wss://" : "ws://";

    // The connection URL is ws://host:port/wsclient (or wss:// for SSL connections)
    let serverUrl = serverProto + this.settings.serverAddress + ":" + this.settings.serverPort + '/wsclient'
    
    this.close();
    this.conn = new Connection(serverUrl);

    // just log a standard message on these socket status events
    this.conn.onOpen = function (evt) {
      client.appendMessage('logMessage', '%% Connected.');
      client.conn.hasData = false;
      client.reconnectCount = 0;
    };
    
    this.conn.onError = function (evt) {
      client.appendMessage('logMessage', '%% Connection error!');
      console.log(evt);
    };
    
    this.conn.onClose = function (evt) {
      client.appendMessage('logMessage', '%% Connection closed.');
      setTimeout(() => { client.reconnect() }, (client.serverSSL ? 2.0 : 1.0) * client.reconnectTimer);
    };
    
    // onMessage callback before data handler
    this.conn.onUpdate = function(channel, data) {
      if (!client.conn.hasData) {
        // this is the first update, show the login screen
        client.react.login && client.react.login.openLogin();
        
        // send the screen dimensions
        client.sendText("SCREENWIDTH " + client.settings.terminalWidth);
        client.sendText("SCREENHEIGHT " + Math.floor(client.output.root.parentNode.clientHeight / client.output.dims.height));
      }
      
      if (client.hidden && data.endsWith('\n')) {
        client.updateCounter++;
        // eventually set client.updateLines to the number of new lines
        // and show that instead

        /* use a timer to prevent update spamming */
        clearTimeout(client.setBubble);
        setTimeout(client.setBubble, 1000);
      }
    }
    
    // handle incoming text
    this.conn.onText = function (text) {
      if (!client.loggedIn) {
        // match some login error conditions
        for (let i = 0; i < LOGINFAIL.length; i++) {
          if (text.match(LOGINFAIL[i])) {
            client.react.login && client.react.login.openLogin(text);
            break;
          }
        }
        
        // we logged in
        if (text.match(/Last( FAILED)? connect was from/)) {
          client.loggedIn = true;
          setTimeout(() => {
            if (!client.jsonapi) {
              client.sendAPI("listcontents");
            }
          }, client.delayContents);
        }
      }
    
      // implement @dec/tf
      var re_fugueedit = new RegExp('^'+client.settings.decompileKey);
      if (text.match(re_fugueedit)) {
        var str = text.replace(re_fugueedit, "");
        client.eatNewline = true;
        
        // send @dec/tf to the upload editor, or the command window
        if (client.settings.decompileEditor) {
          client.addPanel("Upload", { icon: 'cloud_upload' });
          client.react.upload.editor.current.editor.insert(str+"\n");
        } else {
          client.input.root.value = str;
        }
        return;
      }
      
      // handle text triggers
      let suppress = false;
      client.triggers.forEach((trigger, i) => {
        if (trigger.disabled) return;
        
        let re = client.createPattern(trigger.regex, trigger.pattern);
        let args = text.match(re);
        
        if (args) {
          let txt = client.replaceArgs(args, trigger.text);
          if (trigger.javascript) {
            client.execActionScript(txt);
          } else {
            client.sendText(txt);
          }
        
          if (trigger.suppress) {
            client.eatNewline = true;
            suppress = true;
          }
        }
      });
      
      if (suppress) return;
      
      if (client.eatNewline && (text === "\n" || text === "\r\n")) {
        client.eatNewline = false;
        return;
      }
      
      client.eatNewline = false;
      
      client.scrollIfNeeded(() => client.output.appendText(text));
    };
    
    // handle incoming html
    this.conn.onHTML = function (fragment) {
      if (client.output) {
        client.scrollIfNeeded(() => client.output.appendHTML(fragment));
      }
    };
    
    // handle incoming pueblo
    this.conn.onPueblo = function (tag, attrs) {
      if (client.output) {
        client.scrollIfNeeded(() => client.output.appendPueblo(tag, attrs));
      }
    };
    
    // handle incoming command prompts
    this.conn.onPrompt = function (text) {
      if (client.prompt !== null) {
        client.prompt.clear();
        client.prompt.appendText(text + '\r\n');
      }
    };

    // handle incoming JSON objects
    // use the Events handler collection
    this.conn.onObject = function (obj) {
      var op = "";
      if (obj.hasOwnProperty('gmcp')) {
        op = obj.gmcp;
      } else if (obj.hasOwnProperty('op')) {
        op = obj.op;
      }
      
      if (op && op !== "") {
        client.settings.debugEvents && console.log("JSON "+op+":", obj);
        client.events.emit(op, obj);
      } else {
        client.settings.debugEvents && console.log("JSON (unknown):", obj);
      }
    };
  }

  reconnect(force=false) {
    if (!force && this.isConnected()) {
      return;
    }
    
    if (force || this.reconnectCount < this.reconnectMaxCount) {
      // The connection URL is ws://host:port/wsclient (or wss:// for SSL connections)
      let serverProto = window.location.protocol === "https:" || this.settings.serverSSL ? "wss://" : "ws://";
      let serverUrl = serverProto + this.settings.serverAddress + ":" + this.settings.serverPort + '/wsclient';
      
      this.reconnectCount++;
      this.conn && this.conn.reconnect(serverUrl);
    } else {
      this.appendMessage('logMessage', '%% Auto-reconnect aborted.');
    }
  }
  
  isConnected() {
    return (this.conn && this.conn.isConnected());
  }
  
  close() {
    this.conn && this.conn.close();
  }
  
  filterUnicode(text) {
    if (!text) return "";
    try {
      let re = new RegExp("[\u2013\u2014\u2018\u2019\u201B\u201C\u201D\u201F\u2032\u2033\u2035\u2036]","g");
      return text.replace(re, code => UnicodeMap[code]);
    } catch (e) {
      this.settings.debugActions && console.log("Unable to filter Unicode:", e);
    }
    return text;
  }

  sendText(data) {
    this.conn && this.conn.sendText(this.filterUnicode(data));
  }
  
  /////////////////////////////////////////////////////////////////////////////////////////////////

  // function to send a user input command string to the server
  sendCommand(cmd) {
  
    if (!this.isConnected()) {
      // connection was broken, let's force a reconnect
      this.conn && this.conn.reconnect();
      this.scrollIfNeeded(() => this.appendMessage('logMessage', '%% Reconnecting to server...'));
      return;
    }
    
    if (cmd === '') return;
    
    this.sendMacro(cmd);
    this.scrollIfNeeded(() => this.appendMessage('localEcho', cmd));
    this.saveRecallHistory();
  }
    
  sendMacro(cmds) {
    let matched = false;
    this.macros.forEach((m) => {
      if (m.disabled) return;
      
      let re = this.createPattern(m.regex, m.pattern);
      
      cmds.split('\n').forEach((cmd) => {
        let args = cmd.match(re);
      
        if (args) {
          matched = true;
          let text = this.replaceArgs(args, m.text);
          if (m.javascript) {
            this.execActionScript(text);
          } else {
            this.sendMacro(text);
          }
        }
      });
    });
    
    if (!matched) {
      this.sendText(cmds);
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////
  
  // send an API command, falling back to the raw softcode if the server doesn't support it
  sendAPI(cmd, args) {
    if (this.jsonapi) {
      var str = String(cmd);
      
      if (args) {
        var astr = String(args);
        if (astr.length > 0) {
          str += " "+astr;
        }
      }
      
      this.sendText("jsonapi/"+str);
    } else {
      if (JSONAPI.hasOwnProperty(cmd)) {
        JSONAPI[cmd](this, args);
      }
    }
  }
  
  execString(code, callback) {
    var id = "exec_"+shortid.generate();
    var cmd = "th null(oob(%#,"+id+",json(object,result,json(string,"+code+"))))";
    
    this.events.on(id, (obj) => {
      callback(obj.result);
      this.events.removeAllListeners([id]);
    });
    
    this.sendText(cmd);
  }

  execJSON(code, callback) {
    var id = "exec_"+shortid.generate();
    var cmd = "th null(oob(%#,"+id+","+code+"))";
    
    this.events.on(id, (obj) => {
      callback(obj);
      this.events.removeAllListeners([id]);
    });
    
    this.sendText(cmd);
  }
  
  
  /////////////////////////////////////////////////////////////////////////////////////////////////
  
  // save the current display to a log file
  saveLog(filename) {
    if (!this.output) return;
    var node = this.output.root;
    var text = (node.innerText || node.textContent);
    if (!this.saveText(filename, text, "text/html;charset=utf-8")) {
      alert("File not saved! The current output is empty.");
    }
  }
  
  // save the current local storage to a backup
  saveBackup(filename) {
    var text = this.localStorageToText(2);
    if (!this.saveText(filename, text)) {
      alert("File not saved! Local storage is empty.");
    }
  }
  
  
  /////////////////////////////////////////////////////////////////////////////////////////////////
  
  
  setBubble = () => {
    if (this.hidden) {
      this.tinycon.setBubble(this.updateCounter);
    } else {
      this.tinycon.setBubble(0);
    }
  };
  
  initNotifications() {
    // Set the name of the hidden property and the change event for visibility
    var hidden, visibilityChange; 
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }
    
    // Warn if the browser doesn't support addEventListener or the Page Visibility API
    if (typeof document.addEventListener === "undefined" || hidden === undefined) {
      console.log("This browser does not support background notifications.");
    } else {
      // Handle page visibility change   
      document.addEventListener(visibilityChange, () => {
        this.updateCounter = 0;
        this.updateLines = 0;
        if (document[hidden]) {
          this.hidden = true;
        } else {
          this.hidden = false;
        }
        this.setBubble();
      }, false);
    }
    
    // set tinycon options
    this.tinycon.setOptions({
      fallback: true,
      abbreviate: true,
    });
  }

  // set panel default parameters and event handlers
  initPanels() {
    this.panels.defaults.minimizeTo = false;
    this.panels.defaults.onminimized = function(container) {
      window.client.react.taskbar.pushTask(this);
      window.client.focus();
    };
    
    this.panels.defaults.onclosed = function(container) {
      ReactDOM.unmountComponentAtNode(container.content);
      window.client.delSpawn(this.id);
      window.client.focus();
    };
    
    this.panels.defaults.dragit.start = function() {
      window.client.input.saveCursor();
    };
    
    this.panels.defaults.resizeit.start = function() {
      window.client.input.saveCursor();
    };
    
    this.panels.defaults.dragit.stop = function() {
      window.client.focus();
      window.client.input.resetCursor();
    };
    
    this.panels.defaults.resizeit.stop = function() {
      window.client.focus();
      window.client.input.resetCursor();
    };
  }
  
  
  /////////////////////////////////////////////////////////
  
  enableTimers = () => {
    if (this.settings.timersEnabled) return;
    
    this.changeSetting("timersEnabled", true);
  };
  
  disableTimers = () => {
    if (!this.settings.timersEnabled) return;
    
    this.changeSetting("timersEnabled", false);
  };
  
  startTimers = () => {
    if (this.settings.timersEnabled) {
      clearTimeout(this.runTimers);
      setTimeout(this.runTimers,  1000);
    }
  };
  
  stopTimers = () => {
    clearTimeout(this.runTimers);
  };
  
  runTimers = () => {
    if (!this.settings.timersEnabled) return;
    
    for (let i = 0; i < this.timers.length; i++) {
      const timer = this.timers[i];
      if (timer.disabled) {
        if (timer.timeleft) {
          delete timer.timeleft;
        }
        
        continue;
      }
      
      if (typeof(timer.timeleft) === "undefined") {
        // set initial time
        timer.timeleft = Math.max(1, timer.delay);
      }
      
      if (timer.timeleft > 0) {
        // subtract time
        timer.timeleft--;
      } else {
        // execute timer
        if (timer.javascript) {
          this.execActionScript(timer.text);
        } else {
          this.sendText(timer.text);
        }
        
        if (timer.repeat && timer.times !== 0) {
          // repeat timer, reset time left
          if (timer.times > 0) {
            timer.times--;
          }
          timer.timeleft = timer.delay;
        } else {
          // don't repeat, disable timer
          delete timer.timeleft;
          timer.disabled = true;
        }
      }
    }
  
    setTimeout(this.runTimers, 1000);
  };



}



export default Client;
export { Connection, Emulator, UserInput };

