import * as path from 'path';
import * as url from 'url';
import { BrowserWindow, Menu, app } from 'electron';

// handle squirrel events:
// https://github.com/electron/grunt-electron-installer#handling-squirrel-events
// if(require('electron-squirrel-startup')) { return; }

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: Electron.BrowserWindow | null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support'); // eslint-disable-line
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development') {
  require('electron-debug')({ showDevTools: true }); // eslint-disable-line global-require
  require('module').globalPaths.push(path.join(__dirname, '..', 'app', 'node_modules')); // eslint-disable-line
}

function installExtensions() {
  const installer = require('electron-devtools-installer');

  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  for (const name of extensions) {
    try {
      installer.default(installer[name], true || forceDownload);
    } catch (e) {
      // empty
    }
  }
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
  });

  if (process.env.NODE_ENV === 'development') {
    // install devtool extensions
    installExtensions();
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    // load the webpack dev server url
    mainWindow.loadURL('http://localhost:8080/');

    // add inspect element to the context menu
    mainWindow.webContents.on('context-menu', (e, props) => {
      if (mainWindow) {
        const { x, y } = props;

        Menu.buildFromTemplate([{
          label: 'Inspect element',
          click() {
            if (mainWindow) {
              (<any>mainWindow).inspectElement(x, y);
            }
          }
        }]).popup(mainWindow);
      }
    });
  } else {
    // load the index.html of the app.
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../', 'index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  mainWindow.webContents.on('did-finish-load', function() {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
