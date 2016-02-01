Knowledge Explorer
===================
![david-dm](https://david-dm.org/smiled0g/aimind-explorer.svg)

A tool for visualizing and editing AIMind XML file. The work is under progress and subjected to changes. 

What technology does it use
-------------
The app is made with [Electron](http://electron.atom.io/). We use [Data-Driven Documents (D3)](http://d3js.org/) for the data visualization.

Since the technology stack is compatible to run in all modern browser with some help form [Browserify](http://browserify.org/), we are planning to build the project for browsers at some point of time.

How to install
-------------
Install nodejs from [its official website](https://nodejs.org/en/). After you clone the repository, under project's root directory, runs
```
npm install
```

How to run
-------------
In the project's root directory, runs
```
./node_modules/.bin/electron .
```

Running in high resolution monitor
-------------
High resolution monitor/laptop can make the UI really small and hard to read. To fix this issue, go to `index.html` and uncomment the line
```
// require('web-frame').setZoomFactor(1.25);
```

This will set zoom factor to be slightly higher than normal, so everything looks as we expect it to be. We will make this progress automatic later, but we'll leave it for later ;)
