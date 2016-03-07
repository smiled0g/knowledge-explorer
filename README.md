Knowledge Explorer
===================
![david-dm](https://david-dm.org/smiled0g/knowledge-explorer.svg)

A tool for visualizing and editing knowledge graph.

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
npm start
```
It will install all the missing dependencies, and start the app.

If you want to run the app without checking for missing dependencies, runs
```
./node_modules/.bin/electron .
```
