#!/bin/sh

mkdir -p build/
cp jsPlumb/src/*.js build/

cd build

replace ';\(function\(\) {' ';(function(global) {' *.js
replace '^}\)\(\);' '})(typeof exports !== 'undefined' ? exports : this);'
replace '^\s*}\)\.call\(this\);' '})(typeof exports !== 'undefined' ? exports : this);'
replace 'window\.' 'global.'
replace 'root = this' 'root = global';
replace '_ju = jsPlumbUtil' '_ju = global.jsPlumbUtil'
replace 'jsPlumbUtil\.' 'global.jsPlumbUtil.'
replace '\sjsPlumbAdapter' ' global.jsPlumbAdapter'
replace '\sjsPlumb\.' ' global.jsPlumb.'
replace '\sjsPlumbInstance\.' ' global.jsPlumbInstance.'
replace '(jsPlumbInstance\.' '(global.jsPlumbInstance.'
replace '!jsPlumb' '!global.jsPlumb'
replace '\(jsPlumb\.' '(global.jsPlumb.'
replace '\[jsPlumb\.' '[global.jsPlumb.'
replace ' == null' ' === null'
replace ' != null' ' !== null'
replace 'e== null' ' === null'
replace 'OverlayCapableJsPlumbUIComponent' 'global.OverlayCapableJsPlumbUIComponent'
replace 'jsPlumbInstance.prototype' 'global.jsPlumbInstance.prototype'

replace 'global.global' 'global'

# replace compat bit
replace -m '^.*AMD(.|\n)*AMD.*-\s+$' 'global.jsPlumb = new global.jsPlumbInstance(); global.jsPlumb.getInstance = function(_defaults) { var j = new global.jsPlumbInstance(_defaults); j.init(); return j; };'
replace 'global\.OverlayCapableJsPlumbUIComponent = global\.OverlayCapableJsPlumbUIComponent' 'OverlayCapableJsPlumbUIComponent = global.OverlayCapableJsPlumbUIComponent'

cat \
  util.js browser-util.js \
  dom-adapter.js jsPlumb.js \
  endpoint.js connection.js \
  anchors.js defaults.js \
  base-library-adapter.js \
  > ../index.js

cd ../
