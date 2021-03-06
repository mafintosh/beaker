// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, Menu, protocol } from 'electron'
import env from './env'

import * as windows from './background-process/windows'
import buildMenu from './background-process/window-menu'

import * as ipfsNetwork from './background-process/networks/ipfs'

import * as beakerProtocol from './background-process/protocols/beaker'
import * as datProtocol from './background-process/protocols/dat'
import * as viewDatProtocol from './background-process/protocols/view-dat'
import * as ipfsProtocol from './background-process/protocols/ipfs'

import * as datDebug from './background-process/networks/dat/debug'

var mainWindow;

protocol.registerStandardSchemes(['dat', 'view-dat']) // must be called before 'ready'
app.on('ready', function () {
  // ui
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(env)));
  windows.setup()

  // networks
  ipfsNetwork.setup()

  // protocols
  beakerProtocol.setup()
  datProtocol.setup()
  viewDatProtocol.setup()
  ipfsProtocol.setup()

  // debugging
  datDebug.hostDebugDat()
})

app.on('window-all-closed', function () {
  // it's normal for OSX apps to stay open, even if all windows are closed
  // but, since we have an uncloseable tabs bar, let's close when they're all gone
  app.quit()
})

app.once('will-quit', () => {
  ipfsNetwork.shutdown()
})