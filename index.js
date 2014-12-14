/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains utility functions that run in both browsers and headless.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */

;
(function(global) {

    var _isa = function(a) {
            return Object.prototype.toString.call(a) === "[object Array]";
        },
        _isnum = function(n) {
            return Object.prototype.toString.call(n) === "[object Number]";
        },
        _iss = function(s) {
            return typeof s === "string";
        },
        _isb = function(s) {
            return typeof s === "boolean";
        },
        _isnull = function(s) {
            return s === null;
        },
        _iso = function(o) {
            return o === null ? false : Object.prototype.toString.call(o) === "[object Object]";
        },
        _isd = function(o) {
            return Object.prototype.toString.call(o) === "[object Date]";
        },
        _isf = function(o) {
            return Object.prototype.toString.call(o) === "[object Function]";
        },
        _ise = function(o) {
            for (var i in o) {
                if (o.hasOwnProperty(i)) return false;
            }
            return true;
        },
        pointHelper = function(p1, p2, fn) {
            p1 = _isa(p1) ? p1 : [p1.x, p1.y];
            p2 = _isa(p2) ? p2 : [p2.x, p2.y];
            return fn(p1, p2);
        };

    var root = global;
    var exports = root.jsPlumbUtil = {
        isArray: _isa,
        isString: _iss,
        isBoolean: _isb,
        isNull: _isnull,
        isObject: _iso,
        isDate: _isd,
        isFunction: _isf,
        isEmpty: _ise,
        isNumber: _isnum,
        clone: function(a) {
            if (_iss(a)) return "" + a;
            else if (_isb(a)) return !!a;
            else if (_isd(a)) return new Date(a.getTime());
            else if (_isf(a)) return a;
            else if (_isa(a)) {
                var b = [];
                for (var i = 0; i < a.length; i++)
                    b.push(this.clone(a[i]));
                return b;
            } else if (_iso(a)) {
                var c = {};
                for (var j in a)
                    c[j] = this.clone(a[j]);
                return c;
            } else return a;
        },
        merge: function(a, b, collations) {
            // first change the collations array - if present - into a lookup table, because its faster.
            var cMap = {},
                ar, i;
            collations = collations || [];
            for (i = 0; i < collations.length; i++)
                cMap[collations[i]] = true;

            var c = this.clone(a);
            for (i in b) {
                if (c[i] === null)
                    c[i] = b[i];
                else if (_iss(b[i]) || _isb(b[i])) {
                    if (!cMap[i]) c[i] = b[i]; // if we dont want to collate, just copy it in.
                    else {
                        ar = [];
                        // if c's object is also an array we can keep its values.
                        ar.push.apply(ar, _isa(c[i]) ? c[i] : [c[i]]);
                        ar.push.apply(ar, _isa(b[i]) ? b[i] : [b[i]]);
                        c[i] = ar;
                    }
                } else {
                    if (_isa(b[i])) {
                        ar = [];
                        // if c's object is also an array we can keep its values.
                        if (_isa(c[i])) ar.push.apply(ar, c[i]);
                        ar.push.apply(ar, b[i]);
                        c[i] = ar;
                    } else if (_iso(b[i])) {
                        // overwite c's value with an object if it is not already one.
                        if (!_iso(c[i]))
                            c[i] = {};
                        for (var j in b[i])
                            c[i][j] = b[i][j];
                    }
                }
            }
            return c;
        },
        replace: function(inObj, path, value) {
            if (inObj === null) return;
            var q = inObj,
                t = q;
            path.replace(/([^\.])+/g, function(term, lc, pos, str) {
                var array = term.match(/([^\[0-9]+){1}(\[)([0-9+])/),
                    last = pos + term.length >= str.length,
                    _getArray = function() {
                        return t[array[1]] || (function() {
                            t[array[1]] = [];
                            return t[array[1]];
                        })();
                    };

                if (last) {
                    // set term = value on current t, creating term as array if necessary.
                    if (array)
                        _getArray()[array[3]] = value;
                    else
                        t[term] = value;
                } else {
                    // set to current t[term], creating t[term] if necessary.
                    if (array) {
                        var a = _getArray();
                        t = a[array[3]] || (function() {
                            a[array[3]] = {};
                            return a[array[3]];
                        })();
                    } else
                        t = t[term] || (function() {
                            t[term] = {};
                            return t[term];
                        })();
                }
            });

            return inObj;
        },
        //
        // chain a list of functions, supplied by [ object, method name, args ], and return on the first
        // one that returns the failValue. if none return the failValue, return the successValue.
        //
        functionChain: function(successValue, failValue, fns) {
            for (var i = 0; i < fns.length; i++) {
                var o = fns[i][0][fns[i][1]].apply(fns[i][0], fns[i][2]);
                if (o === failValue) {
                    return o;
                }
            }
            return successValue;
        },
        // take the given model and expand out any parameters.
        populate: function(model, values) {
            // for a string, see if it has parameter matches, and if so, try to make the substitutions.
            var getValue = function(fromString) {
                    var matches = fromString.match(/(\${.*?})/g);
                    if (matches !== null) {
                        for (var i = 0; i < matches.length; i++) {
                            var val = values[matches[i].substring(2, matches[i].length - 1)] || "";
                            if (val !== null) {
                                fromString = fromString.replace(matches[i], val);
                            }
                        }
                    }
                    return fromString;
                },
                // process one entry.
                _one = function(d) {
                    if (d !== null) {
                        if (_iss(d)) {
                            return getValue(d);
                        } else if (_isa(d)) {
                            var r = [];
                            for (var i = 0; i < d.length; i++)
                                r.push(_one(d[i]));
                            return r;
                        } else if (_iso(d)) {
                            var s = {};
                            for (var j in d) {
                                s[j] = _one(d[j]);
                            }
                            return s;
                        } else {
                            return d;
                        }
                    }
                };

            return _one(model);
        },
        convertStyle: function(s, ignoreAlpha) {
            // TODO: jsPlumb should support a separate 'opacity' style member.
            if ("transparent" === s) return s;
            var o = s,
                pad = function(n) {
                    return n.length == 1 ? "0" + n : n;
                },
                hex = function(k) {
                    return pad(Number(k).toString(16));
                },
                pattern = /(rgb[a]?\()(.*)(\))/;
            if (s.match(pattern)) {
                var parts = s.match(pattern)[2].split(",");
                o = "#" + hex(parts[0]) + hex(parts[1]) + hex(parts[2]);
                if (!ignoreAlpha && parts.length == 4)
                    o = o + hex(parts[3]);
            }
            return o;
        },
        findWithFunction: function(a, f) {
            if (a)
                for (var i = 0; i < a.length; i++)
                    if (f(a[i])) return i;
            return -1;
        },
        indexOf: function(l, v) {
            return l.indexOf ? l.indexOf(v) : exports.findWithFunction(l, function(_v) {
                return _v == v;
            });
        },
        removeWithFunction: function(a, f) {
            var idx = exports.findWithFunction(a, f);
            if (idx > -1) a.splice(idx, 1);
            return idx != -1;
        },
        remove: function(l, v) {
            var idx = exports.indexOf(l, v);
            if (idx > -1) l.splice(idx, 1);
            return idx != -1;
        },
        // TODO support insert index
        addWithFunction: function(list, item, hashFunction) {
            if (exports.findWithFunction(list, hashFunction) == -1) list.push(item);
        },
        addToList: function(map, key, value, insertAtStart) {
            var l = map[key];
            if (l === null) {
                l = [];
                map[key] = l;
            }
            l[insertAtStart ? "unshift" : "push"](value);
            return l;
        },
        //
        // extends the given obj (which can be an array) with the given constructor function, prototype functions, and
        // class members, any of which may be null.
        //
        extend: function(child, parent, _protoFn) {
            var i;
            parent = _isa(parent) ? parent : [parent];

            for (i = 0; i < parent.length; i++) {
                for (var j in parent[i].prototype) {
                    if (parent[i].prototype.hasOwnProperty(j)) {
                        child.prototype[j] = parent[i].prototype[j];
                    }
                }
            }

            var _makeFn = function(name, protoFn) {
                return function() {
                    for (i = 0; i < parent.length; i++) {
                        if (parent[i].prototype[name])
                            parent[i].prototype[name].apply(this, arguments);
                    }
                    return protoFn.apply(this, arguments);
                };
            };

            var _oneSet = function(fns) {
                for (var k in fns) {
                    child.prototype[k] = _makeFn(k, fns[k]);
                }
            };

            if (arguments.length > 2) {
                for (i = 2; i < arguments.length; i++)
                    _oneSet(arguments[i]);
            }

            return child;
        },
        uuid: function() {
            return ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }));
        },
        logEnabled: true,
        log: function() {
            if (exports.logEnabled && typeof console != "undefined") {
                try {
                    var msg = arguments[arguments.length - 1];
                    console.log(msg);
                } catch (e) {}
            }
        },

        /**
         * Wraps one function with another, creating a placeholder for the
         * wrapped function if it was null. this is used to wrap the various
         * drag/drop event functions - to allow jsPlumb to be notified of
         * important lifecycle events without imposing itself on the user's
         * drag/drop functionality.
         * @method global.jsPlumbUtil.wrap
         * @param {Function} wrappedFunction original function to wrap; may be null.
         * @param {Function} newFunction function to wrap the original with.
         * @param {Object} [returnOnThisValue] Optional. Indicates that the wrappedFunction should
         * not be executed if the newFunction returns a value matching 'returnOnThisValue'.
         * note that this is a simple comparison and only works for primitives right now.
         */
        wrap: function(wrappedFunction, newFunction, returnOnThisValue) {
            wrappedFunction = wrappedFunction || function() {};
            newFunction = newFunction || function() {};
            return function() {
                var r = null;
                try {
                    r = newFunction.apply(this, arguments);
                } catch (e) {
                    exports.log("jsPlumb function failed : " + e);
                }
                if (returnOnThisValue === null || (r !== returnOnThisValue)) {
                    try {
                        r = wrappedFunction.apply(this, arguments);
                    } catch (e) {
                        exports.log("wrapped function failed : " + e);
                    }
                }
                return r;
            };
        }
    };

    exports.EventGenerator = function() {
        var _listeners = {},
            eventsSuspended = false,
            // this is a list of events that should re-throw any errors that occur during their dispatch. it is current private.
            eventsToDieOn = {
                "ready": true
            };

        this.bind = function(event, listener, insertAtStart) {
            exports.addToList(_listeners, event, listener, insertAtStart);
            return this;
        };

        this.fire = function(event, value, originalEvent) {
            if (!eventsSuspended && _listeners[event]) {
                var l = _listeners[event].length,
                    i = 0,
                    _gone = false,
                    ret = null;
                if (!this.shouldFireEvent || this.shouldFireEvent(event, value, originalEvent)) {
                    while (!_gone && i < l && ret !== false) {
                        // doing it this way rather than catching and then possibly re-throwing means that an error propagated by this
                        // method will have the whole call stack available in the debugger.
                        if (eventsToDieOn[event])
                            _listeners[event][i].apply(this, [value, originalEvent]);
                        else {
                            try {
                                ret = _listeners[event][i].apply(this, [value, originalEvent]);
                            } catch (e) {
                                exports.log("jsPlumb: fire failed for event " + event + " : " + e);
                            }
                        }
                        i++;
                        if (_listeners === null || _listeners[event] === null)
                            _gone = true;
                    }
                }
            }
            return this;
        };

        this.unbind = function(event) {
            if (event)
                delete _listeners[event];
            else {
                _listeners = {};
            }
            return this;
        };

        this.getListener = function(forEvent) {
            return _listeners[forEvent];
        };
        this.setSuspendEvents = function(val) {
            eventsSuspended = val;
        };
        this.isSuspendEvents = function() {
            return eventsSuspended;
        };
        this.cleanupListeners = function() {
            for (var i in _listeners) {
                _listeners[i] = null;
            }
        };
    };

    exports.EventGenerator.prototype = {
        cleanup: function() {
            this.cleanupListeners();
        }
    };

    // thanks MDC
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FFunction%2Fbind
    if (!Function.prototype.bind) {
        Function.prototype.bind = function(oThis) {
            if (typeof this !== "function") {
                // closest thing possible to the ECMAScript 5 internal IsCallable function
                throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function() {},
                fBound = function() {
                    return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                        aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();

            return fBound;
        };
    }
})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains utility functions that run browsers only.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {

    "use strict";

    var root = global;
    var exports = root.jsPlumbUtil;

    exports.ieVersion = /MSIE\s([\d.]+)/.test(navigator.userAgent) ? (new Number(RegExp.$1)) : -1;

    exports.oldIE = exports.ieVersion > -1 && exports.ieVersion < 9;

    exports.matchesSelector = function(el, selector, ctx) {
        ctx = ctx || el.parentNode;
        var possibles = ctx.querySelectorAll(selector);
        for (var i = 0; i < possibles.length; i++) {
            if (possibles[i] === el)
                return true;
        }
        return false;
    };

    exports.consume = function(e, doNotPreventDefault) {
        if (e.stopPropagation)
            e.stopPropagation();
        else
            e.returnValue = false;

        if (!doNotPreventDefault && e.preventDefault)
            e.preventDefault();
    };

    /*
     * Function: sizeElement
     * Helper to size and position an element. You would typically use
     * this when writing your own Connector or Endpoint implementation.
     *
     * Parameters:
     *  x - [int] x position for the element origin
     *  y - [int] y position for the element origin
     *  w - [int] width of the element
     *  h - [int] height of the element
     *
     */
    exports.sizeElement = function(el, x, y, w, h) {
        if (el) {
            el.style.height = h + "px";
            el.height = h;
            el.style.width = w + "px";
            el.width = w;
            el.style.left = x + "px";
            el.style.top = y + "px";
        }
    };
})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains the base functionality for DOM type adapters.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {

    var root = global;

    var svgAvailable = !!global.SVGAngle || document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"),
        vmlAvailable = function() {
            if (vmlAvailable.vml === undefined) {
                var a = document.body.appendChild(document.createElement('div'));
                a.innerHTML = '<v:shape id="vml_flag1" adj="1" />';
                var b = a.firstChild;
                if (b !== null && b.style !== null) {
                    b.style.behavior = "url(#default#VML)";
                    vmlAvailable.vml = b ? typeof b.adj == "object" : true;
                } else
                    vmlAvailable.vml = false;
                a.parentNode.removeChild(a);
            }
            return vmlAvailable.vml;
        },
        // TODO: remove this once we remove all library adapter versions and have only vanilla jsplumb: this functionality
        // comes from Mottle.
        iev = (function() {
            var rv = -1;
            if (navigator.appName == 'Microsoft Internet Explorer') {
                var ua = navigator.userAgent,
                    re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) !== null)
                    rv = parseFloat(RegExp.$1);
            }
            return rv;
        })(),
        isIELT9 = iev > -1 && iev < 9,
        _genLoc = function(e, prefix) {
            if (e === null) return [0, 0];
            var ts = _touches(e),
                t = _getTouch(ts, 0);
            return [t[prefix + "X"], t[prefix + "Y"]];
        },
        _pageLocation = function(e) {
            if (e === null) return [0, 0];
            if (isIELT9) {
                return [e.clientX + document.documentElement.scrollLeft, e.clientY + document.documentElement.scrollTop];
            } else {
                return _genLoc(e, "page");
            }
        },
        _screenLocation = function(e) {
            return _genLoc(e, "screen");
        },
        _clientLocation = function(e) {
            return _genLoc(e, "client");
        },
        _getTouch = function(touches, idx) {
            return touches.item ? touches.item(idx) : touches[idx];
        },
        _touches = function(e) {
            return e.touches && e.touches.length > 0 ? e.touches :
                e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches :
                e.targetTouches && e.targetTouches.length > 0 ? e.targetTouches : [e];
        };

    /**
		Manages dragging for some instance of global.jsPlumb.
	*/
    var DragManager = function(_currentInstance) {
        var _draggables = {},
            _dlist = [],
            _delements = {},
            _elementsWithEndpoints = {},
            // elementids mapped to the draggable to which they belong.
            _draggablesForElements = {};

        /**
            register some element as draggable.  right now the drag init stuff is done elsewhere, and it is
            possible that will continue to be the case.
        */
        this.register = function(el) {
            var id = _currentInstance.getId(el),
                parentOffset = global.jsPlumbAdapter.getOffset(el, _currentInstance);

            if (!_draggables[id]) {
                _draggables[id] = el;
                _dlist.push(el);
                _delements[id] = {};
            }

            // look for child elements that have endpoints and register them against this draggable.
            var _oneLevel = function(p, startOffset) {
                if (p) {
                    for (var i = 0; i < p.childNodes.length; i++) {
                        if (p.childNodes[i].nodeType != 3 && p.childNodes[i].nodeType != 8) {
                            var cEl = global.jsPlumb.getElementObject(p.childNodes[i]),
                                cid = _currentInstance.getId(p.childNodes[i], null, true);
                            if (cid && _elementsWithEndpoints[cid] && _elementsWithEndpoints[cid] > 0) {
                                var cOff = global.jsPlumbAdapter.getOffset(cEl, _currentInstance);
                                _delements[id][cid] = {
                                    id: cid,
                                    offset: {
                                        left: cOff.left - parentOffset.left,
                                        top: cOff.top - parentOffset.top
                                    }
                                };
                                _draggablesForElements[cid] = id;
                            }
                            _oneLevel(p.childNodes[i]);
                        }
                    }
                }
            };

            _oneLevel(el);
        };

        // refresh the offsets for child elements of this element.
        this.updateOffsets = function(elId) {
            if (elId !== null) {
                var domEl = global.jsPlumb.getDOMElement(elId),
                    id = _currentInstance.getId(domEl),
                    children = _delements[id],
                    parentOffset = global.jsPlumbAdapter.getOffset(domEl, _currentInstance);

                if (children) {
                    for (var i in children) {
                        var cel = global.jsPlumb.getElementObject(i),
                            cOff = global.jsPlumbAdapter.getOffset(cel, _currentInstance);

                        _delements[id][i] = {
                            id: i,
                            offset: {
                                left: cOff.left - parentOffset.left,
                                top: cOff.top - parentOffset.top
                            }
                        };
                        _draggablesForElements[i] = id;
                    }
                }
            }
        };

        /**
			notification that an endpoint was added to the given el.  we go up from that el's parent
			node, looking for a parent that has been registered as a draggable. if we find one, we add this
			el to that parent's list of elements to update on drag (if it is not there already)
		*/
        this.endpointAdded = function(el, id) {

            id = id || _currentInstance.getId(el);

            var b = document.body,
                p = el.parentNode;

            _elementsWithEndpoints[id] = _elementsWithEndpoints[id] ? _elementsWithEndpoints[id] + 1 : 1;

            while (p !== null && p != b) {
                var pid = _currentInstance.getId(p, null, true);
                if (pid && _draggables[pid]) {
                    var pLoc = global.jsPlumbAdapter.getOffset(p, _currentInstance);

                    if (_delements[pid][id] === null) {
                        var cLoc = global.jsPlumbAdapter.getOffset(el, _currentInstance);
                        _delements[pid][id] = {
                            id: id,
                            offset: {
                                left: cLoc.left - pLoc.left,
                                top: cLoc.top - pLoc.top
                            }
                        };
                        _draggablesForElements[id] = pid;
                    }
                    break;
                }
                p = p.parentNode;
            }
        };

        this.endpointDeleted = function(endpoint) {
            if (_elementsWithEndpoints[endpoint.elementId]) {
                _elementsWithEndpoints[endpoint.elementId] --;
                if (_elementsWithEndpoints[endpoint.elementId] <= 0) {
                    for (var i in _delements) {
                        if (_delements[i]) {
                            delete _delements[i][endpoint.elementId];
                            delete _draggablesForElements[endpoint.elementId];
                        }
                    }
                }
            }
        };

        this.changeId = function(oldId, newId) {
            _delements[newId] = _delements[oldId];
            _delements[oldId] = {};
            _draggablesForElements[newId] = _draggablesForElements[oldId];
            _draggablesForElements[oldId] = null;
        };

        this.getElementsForDraggable = function(id) {
            return _delements[id];
        };

        this.elementRemoved = function(elementId) {
            var elId = _draggablesForElements[elementId];
            if (elId) {
                delete _delements[elId][elementId];
                delete _draggablesForElements[elementId];
            }
        };

        this.reset = function() {
            _draggables = {};
            _dlist = [];
            _delements = {};
            _elementsWithEndpoints = {};
        };

        //
        // notification drag ended. We check automatically if need to update some
        // ancestor's offsets.
        //
        this.dragEnded = function(el) {
            var id = _currentInstance.getId(el),
                ancestor = _draggablesForElements[id];

            if (ancestor) this.updateOffsets(ancestor);
        };

        this.setParent = function(el, elId, p, pId) {
            var current = _draggablesForElements[elId];
            if (current) {
                if (!_delements[pId])
                    _delements[pId] = {};
                _delements[pId][elId] = _delements[current][elId];
                delete _delements[current][elId];
                var pLoc = global.jsPlumbAdapter.getOffset(p, _currentInstance),
                    cLoc = global.jsPlumbAdapter.getOffset(el, _currentInstance);
                _delements[pId][elId].offset = {
                    left: cLoc.left - pLoc.left,
                    top: cLoc.top - pLoc.top
                };
                _draggablesForElements[elId] = pId;
            }
        };

        this.getDragAncestor = function(el) {
            var de = global.jsPlumb.getDOMElement(el),
                id = _currentInstance.getId(de),
                aid = _draggablesForElements[id];

            if (aid)
                return global.jsPlumb.getDOMElement(aid);
            else
                return null;
        };

    };

    // for those browsers that dont have it.  they still don't have it! but at least they won't crash.
    if (!global.console)
        global.console = {
            time: function() {},
            timeEnd: function() {},
            group: function() {},
            groupEnd: function() {},
            log: function() {}
        };


    // TODO: katavorio default helper uses this stuff.  should i extract to a support lib?
    var trim = function(str) {
            return str === null ? null : (str.replace(/^\s\s*/, '').replace(/\s\s*$/, ''));
        },
        _setClassName = function(el, cn) {
            cn = trim(cn);
            if (typeof el.className.baseVal != "undefined") // SVG
                el.className.baseVal = cn;
            else
                el.className = cn;
        },
        _getClassName = function(el) {
            return (typeof el.className.baseVal == "undefined") ? el.className : el.className.baseVal;
        },
        _classManip = function(el, add, clazz) {

            // TODO if classList exists, use it.

            var classesToAddOrRemove = global.jsPlumbUtil.isArray(clazz) ? clazz : clazz.split(/\s+/),
                className = _getClassName(el),
                curClasses = className.split(/\s+/);

            for (var i = 0; i < classesToAddOrRemove.length; i++) {
                if (add) {
                    if (global.jsPlumbUtil.indexOf(curClasses, classesToAddOrRemove[i]) == -1)
                        curClasses.push(classesToAddOrRemove[i]);
                } else {
                    var idx = global.jsPlumbUtil.indexOf(curClasses, classesToAddOrRemove[i]);
                    if (idx != -1)
                        curClasses.splice(idx, 1);
                }
            }
            _setClassName(el, curClasses.join(" "));
        },
        _classManipNew = function(el, classesToAdd, classesToRemove) {

            // TODO if classList exists, use it.

            classesToAdd = classesToAdd === null ? [] : global.jsPlumbUtil.isArray(classesToAdd) ? classesToAdd : classesToAdd.split(/\s+/);
            classesToRemove = classesToRemov === null ? [] : global.jsPlumbUtil.isArray(classesToRemove) ? classesToRemove : classesToRemove.split(/\s+/);

            var className = _getClassName(el),
                curClasses = className.split(/\s+/);

            var _oneSet = function(add, classes) {
                for (var i = 0; i < classes.length; i++) {
                    if (add) {
                        if (global.jsPlumbUtil.indexOf(curClasses, classes[i]) == -1)
                            curClasses.push(classes[i]);
                    } else {
                        var idx = global.jsPlumbUtil.indexOf(curClasses, classes[i]);
                        if (idx != -1)
                            curClasses.splice(idx, 1);
                    }
                }
            };

            _oneSet(true, classesToAdd);
            _oneSet(false, classesToRemove);

            _setClassName(el, curClasses.join(" "));
        },
        _each = function(spec, fn) {
            if (spec === null) return;
            if (typeof spec === "string")
                fn(global.jsPlumb.getDOMElement(spec));
            else if (spec.length !== null) {
                for (var i = 0; i < spec.length; i++)
                    fn(global.jsPlumb.getDOMElement(spec[i]));
            } else
                fn(spec); // assume it's an element.
        };

    global.jsPlumbAdapter = {

        headless: false,

        pageLocation: _pageLocation,
        screenLocation: _screenLocation,
        clientLocation: _clientLocation,

        getAttribute: function(el, attName) {
            return el.getAttribute(attName);
        },

        setAttribute: function(el, a, v) {
            el.setAttribute(a, v);
        },

        appendToRoot: function(node) {
            document.body.appendChild(node);
        },
        getRenderModes: function() {
            return ["svg", "vml"];
        },
        isRenderModeAvailable: function(m) {
            return {
                "svg": svgAvailable,
                "vml": vmlAvailable()
            }[m];
        },
        getDragManager: function(_jsPlumb) {
            return new DragManager(_jsPlumb);
        },
        setRenderMode: function(mode) {
            var renderMode;

            if (mode) {
                mode = mode.toLowerCase();

                var svgAvailable = this.isRenderModeAvailable("svg"),
                    vmlAvailable = this.isRenderModeAvailable("vml");

                // now test we actually have the capability to do this.
                if (mode === "svg") {
                    if (svgAvailable) renderMode = "svg";
                    else if (vmlAvailable) renderMode = "vml";
                } else if (vmlAvailable) renderMode = "vml";
            }

            return renderMode;
        },
        addClass: function(el, clazz) {
            _each(el, function(e) {
                _classManipNew(e, clazz);
            });
        },
        hasClass: function(el, clazz) {
            el = global.jsPlumb.getDOMElement(el);
            if (el.classList) return el.classList.contains(clazz);
            else {
                return _getClassName(el).indexOf(clazz) != -1;
            }
        },
        removeClass: function(el, clazz) {
            _each(el, function(e) {
                _classManipNew(e, null, clazz);
            });
        },
        updateClasses: function(el, toAdd, toRemove) {
            _each(el, function(e) {
                _classManipNew(e, toAdd, toRemove);
            });
        },
        setClass: function(el, clazz) {
            _each(el, function(e) {
                _setClassName(e, clazz);
            });
        },
        setPosition: function(el, p) {
            el.style.left = p.left + "px";
            el.style.top = p.top + "px";
        },
        getPosition: function(el) {
            var _one = function(prop) {
                var v = el.style[prop];
                return v ? v.substring(0, v.length - 2) : 0;
            };
            return {
                left: _one("left"),
                top: _one("top")
            };
        },
        getOffset: function(el, _instance, relativeToRoot) {
            el = global.jsPlumb.getDOMElement(el);
            var container = _instance.getContainer();
            var l = el.offsetLeft,
                t = el.offsetTop,
                op = (relativeToRoot || (container !== null && el.offsetParent != container)) ? el.offsetParent : null;
            while (op !== null) {
                l += op.offsetLeft;
                t += op.offsetTop;
                op = relativeToRoot ? op.offsetParent :
                    op.offsetParent == container ? null : op.offsetParent;
            }
            return {
                left: l,
                top: t
            };
        },
        //
        // return x+y proportion of the given element's size corresponding to the location of the given event.
        //
        getPositionOnElement: function(evt, el, zoom) {
            var box = typeof el.getBoundingClientRect !== "undefined" ? el.getBoundingClientRect() : {
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0
                },
                body = document.body,
                docElem = document.documentElement,
                offPar = el.offsetParent,
                scrollTop = global.pageYOffset || docElem.scrollTop || body.scrollTop,
                scrollLeft = global.pageXOffset || docElem.scrollLeft || body.scrollLeft,
                clientTop = docElem.clientTop || body.clientTop || 0,
                clientLeft = docElem.clientLeft || body.clientLeft || 0,
                pst = 0, //offPar ? offPar.scrollTop : 0,
                psl = 0, //offPar ? offPar.scrollLeft : 0,
                top = box.top + scrollTop - clientTop + (pst * zoom),
                left = box.left + scrollLeft - clientLeft + (psl * zoom),
                cl = global.jsPlumbAdapter.pageLocation(evt),
                w = box.width || (el.offsetWidth * zoom),
                h = box.height || (el.offsetHeight * zoom),
                x = (cl[0] - left) / w,
                y = (cl[1] - top) / h;

            return [x, y];
        },

        /**
         * Gets the absolute position of some element as read from the left/top properties in its style.
         * @method getAbsolutePosition
         * @param {Element} el The element to retrieve the absolute coordinates from. **Note** this is a DOM element, not a selector from the underlying library.
         * @return [Float, Float] [left, top] pixel values.
         */
        getAbsolutePosition: function(el) {
            var _one = function(s) {
                var ss = el.style[s];
                if (ss) return parseFloat(ss.substring(0, ss.length - 2));
            };
            return [_one("left"), _one("top")];
        },

        /**
         * Sets the absolute position of some element by setting the left/top properties in its style.
         * @method setAbsolutePosition
         * @param {Element} el The element to set the absolute coordinates on. **Note** this is a DOM element, not a selector from the underlying library.
         * @param {Float[]} xy x and y coordinates
         * @param {Float[]} [animateFrom] Optional previous xy to animate from.
         */
        setAbsolutePosition: function(el, xy, animateFrom, animateOptions) {
            if (animateFrom) {
                root.jsPlumb.animate(el, {
                    left: "+=" + (xy[0] - animateFrom[0]),
                    top: "+=" + (xy[1] - animateFrom[1])
                }, animateOptions);
            } else {
                el.style.left = xy[0] + "px";
                el.style.top = xy[1] + "px";
            }
        }




    };
})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains the core code.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {

    "use strict";

    var _ju = global.jsPlumbUtil,
        _getOffset = function(el, _instance, relativeToRoot) {
            return global.jsPlumbAdapter.getOffset(el, _instance, relativeToRoot);
        },

        /**
         * creates a timestamp, using milliseconds since 1970, but as a string.
         */
        _timestamp = function() {
            return "" + (new Date()).getTime();
        },

        // helper method to update the hover style whenever it, or paintStyle, changes.
        // we use paintStyle as the foundation and merge hoverPaintStyle over the
        // top.
        _updateHoverStyle = function(component) {
            if (component._jsPlumb.paintStyle && component._jsPlumb.hoverPaintStyle) {
                var mergedHoverStyle = {};
                global.jsPlumb.extend(mergedHoverStyle, component._jsPlumb.paintStyle);
                global.jsPlumb.extend(mergedHoverStyle, component._jsPlumb.hoverPaintStyle);
                delete component._jsPlumb.hoverPaintStyle;
                // we want the fillStyle of paintStyle to override a gradient, if possible.
                if (mergedHoverStyle.gradient && component._jsPlumb.paintStyle.fillStyle)
                    delete mergedHoverStyle.gradient;
                component._jsPlumb.hoverPaintStyle = mergedHoverStyle;
            }
        },
        //events = [ "click", "dblclick", "mouseenter", "mouseout", "mousemove", "mousedown", "mouseup", "contextmenu" ],
        events = ["click", "dblclick", "mouseover", "mouseout", "mousemove", "mousedown", "mouseup", "contextmenu"],
        eventFilters = {
            "mouseout": "mouseleave",
            "mouseexit": "mouseleave"
        },
        _updateAttachedElements = function(component, state, timestamp, sourceElement) {
            var affectedElements = component.getAttachedElements();
            if (affectedElements) {
                for (var i = 0, j = affectedElements.length; i < j; i++) {
                    if (!sourceElement || sourceElement != affectedElements[i])
                        affectedElements[i].setHover(state, true, timestamp); // tell the attached elements not to inform their own attached elements.
                }
            }
        },
        _splitType = function(t) {
            return t === null ? null : t.split(" ");
        },
        _applyTypes = function(component, params, doNotRepaint) {
            if (component.getDefaultType) {
                var td = component.getTypeDescriptor();

                var o = _ju.merge({}, component.getDefaultType());
                for (var i = 0, j = component._jsPlumb.types.length; i < j; i++)
                    o = _ju.merge(o, component._jsPlumb.instance.getType(component._jsPlumb.types[i], td), ["cssClass"]);

                if (params) {
                    o = _ju.populate(o, params);
                }

                component.applyType(o, doNotRepaint);
                if (!doNotRepaint) component.repaint();
            }
        },

        // ------------------------------ BEGIN jsPlumbUIComponent --------------------------------------------

        jsPlumbUIComponent = global.jsPlumbUIComponent = function(params) {

            global.jsPlumbUtil.EventGenerator.apply(this, arguments);

            var self = this,
                a = arguments,
                idPrefix = self.idPrefix,
                id = idPrefix + (new Date()).getTime();

            this._jsPlumb = {
                instance: params._jsPlumb,
                parameters: params.parameters || {},
                paintStyle: null,
                hoverPaintStyle: null,
                paintStyleInUse: null,
                hover: false,
                beforeDetach: params.beforeDetach,
                beforeDrop: params.beforeDrop,
                overlayPlacements: [],
                hoverClass: params.hoverClass || params._jsPlumb.Defaults.HoverClass,
                types: []
            };

            this.getId = function() {
                return id;
            };

            // all components can generate events

            if (params.events) {
                for (var i in params.events)
                    self.bind(i, params.events[i]);
            }

            // all components get this clone function.
            // TODO issue 116 showed a problem with this - it seems 'a' that is in
            // the clone function's scope is shared by all invocations of it, the classic
            // JS closure problem.  for now, jsPlumb does a version of this inline where 
            // it used to call clone.  but it would be nice to find some time to look
            // further at this.
            this.clone = function() {
                var o = {}; //new Object();
                this.constructor.apply(o, a);
                return o;
            }.bind(this);

            // user can supply a beforeDetach callback, which will be executed before a detach
            // is performed; returning false prevents the detach.			
            this.isDetachAllowed = function(connection) {
                var r = true;
                if (this._jsPlumb.beforeDetach) {
                    try {
                        r = this._jsPlumb.beforeDetach(connection);
                    } catch (e) {
                        _ju.log("jsPlumb: beforeDetach callback failed", e);
                    }
                }
                return r;
            };

            // user can supply a beforeDrop callback, which will be executed before a dropped
            // connection is confirmed. user can return false to reject connection.			
            this.isDropAllowed = function(sourceId, targetId, scope, connection, dropEndpoint, source, target) {
                var r = this._jsPlumb.instance.checkCondition("beforeDrop", {
                    sourceId: sourceId,
                    targetId: targetId,
                    scope: scope,
                    connection: connection,
                    dropEndpoint: dropEndpoint,
                    source: source,
                    target: target
                });
                if (this._jsPlumb.beforeDrop) {
                    try {
                        r = this._jsPlumb.beforeDrop({
                            sourceId: sourceId,
                            targetId: targetId,
                            scope: scope,
                            connection: connection,
                            dropEndpoint: dropEndpoint,
                            source: source,
                            target: target
                        });
                    } catch (e) {
                        _ju.log("jsPlumb: beforeDrop callback failed", e);
                    }
                }
                return r;
            };

            var boundListeners = [],
                bindAListener = function(obj, type, fn) {
                    boundListeners.push([obj, type, fn]);
                    obj.bind(type, fn);
                },
                domListeners = [];

            // sets the component associated with listener events. for instance, an overlay delegates
            // its events back to a connector. but if the connector is swapped on the underlying connection,
            // then this component must be changed. This is called by setConnector in the Connection class.
            this.setListenerComponent = function(c) {
                for (var i = 0; i < domListeners.length; i++)
                    domListeners[i][3] = c;
            };




        };

    var _removeTypeCssHelper = function(component, typeIndex) {
        var typeId = component._jsPlumb.types[typeIndex],
            type = component._jsPlumb.instance.getType(typeId, component.getTypeDescriptor());

        if (type !== null) {

            if (type.cssClass && component.canvas)
                component._jsPlumb.instance.removeClass(component.canvas, type.cssClass);
        }
    };

    global.jsPlumbUtil.extend(jsPlumbUIComponent, global.jsPlumbUtil.EventGenerator, {

        getParameter: function(name) {
            return this._jsPlumb.parameters[name];
        },

        setParameter: function(name, value) {
            this._jsPlumb.parameters[name] = value;
        },

        getParameters: function() {
            return this._jsPlumb.parameters;
        },

        setParameters: function(p) {
            this._jsPlumb.parameters = p;
        },

        addClass: function(clazz) {
            global.jsPlumbAdapter.addClass(this.canvas, clazz);
        },

        removeClass: function(clazz) {
            global.jsPlumbAdapter.removeClass(this.canvas, clazz);
        },

        updateClasses: function(classesToAdd, classesToRemove) {
            global.jsPlumbAdapter.updateClasses(this.canvas, classesToAdd, classesToRemove);
        },

        setType: function(typeId, params, doNotRepaint) {
            this.clearTypes();
            this._jsPlumb.types = _splitType(typeId) || [];
            _applyTypes(this, params, doNotRepaint);
        },

        getType: function() {
            return this._jsPlumb.types;
        },

        reapplyTypes: function(params, doNotRepaint) {
            _applyTypes(this, params, doNotRepaint);
        },

        hasType: function(typeId) {
            return global.jsPlumbUtil.indexOf(this._jsPlumb.types, typeId) != -1;
        },

        addType: function(typeId, params, doNotRepaint) {
            var t = _splitType(typeId),
                _cont = false;
            if (t !== null) {
                for (var i = 0, j = t.length; i < j; i++) {
                    if (!this.hasType(t[i])) {
                        this._jsPlumb.types.push(t[i]);
                        _cont = true;
                    }
                }
                if (_cont) _applyTypes(this, params, doNotRepaint);
            }
        },

        removeType: function(typeId, doNotRepaint) {
            var t = _splitType(typeId),
                _cont = false,
                _one = function(tt) {
                    var idx = _ju.indexOf(this._jsPlumb.types, tt);
                    if (idx != -1) {
                        // remove css class if necessary
                        _removeTypeCssHelper(this, idx);
                        this._jsPlumb.types.splice(idx, 1);
                        return true;
                    }
                    return false;
                }.bind(this);

            if (t !== null) {
                for (var i = 0, j = t.length; i < j; i++) {
                    _cont = _one(t[i]) || _cont;
                }
                if (_cont) _applyTypes(this, null, doNotRepaint);
            }
        },
        clearTypes: function(doNotRepaint) {
            var i = this._jsPlumb.types.length;
            for (var j = 0; j < i; j++) {
                _removeTypeCssHelper(this, 0);
                this._jsPlumb.types.splice(0, 1);
            }
            _applyTypes(this, {}, doNotRepaint);
        },

        toggleType: function(typeId, params, doNotRepaint) {
            var t = _splitType(typeId);
            if (t !== null) {
                for (var i = 0, j = t.length; i < j; i++) {
                    var idx = global.jsPlumbUtil.indexOf(this._jsPlumb.types, t[i]);
                    if (idx != -1) {
                        _removeTypeCssHelper(this, idx);
                        this._jsPlumb.types.splice(idx, 1);
                    } else
                        this._jsPlumb.types.push(t[i]);
                }

                _applyTypes(this, params, doNotRepaint);
            }
        },
        applyType: function(t, doNotRepaint) {
            this.setPaintStyle(t.paintStyle, doNotRepaint);
            this.setHoverPaintStyle(t.hoverPaintStyle, doNotRepaint);
            if (t.parameters) {
                for (var i in t.parameters)
                    this.setParameter(i, t.parameters[i]);
            }
        },
        setPaintStyle: function(style, doNotRepaint) {
            //		    	this._jsPlumb.paintStyle = global.jsPlumb.extend({}, style);
            // TODO figure out if we want components to clone paintStyle so as not to share it.
            this._jsPlumb.paintStyle = style;
            this._jsPlumb.paintStyleInUse = this._jsPlumb.paintStyle;
            _updateHoverStyle(this);
            if (!doNotRepaint) this.repaint();
        },
        getPaintStyle: function() {
            return this._jsPlumb.paintStyle;
        },
        setHoverPaintStyle: function(style, doNotRepaint) {
            //this._jsPlumb.hoverPaintStyle = global.jsPlumb.extend({}, style);
            // TODO figure out if we want components to clone paintStyle so as not to share it.		    	
            this._jsPlumb.hoverPaintStyle = style;
            _updateHoverStyle(this);
            if (!doNotRepaint) this.repaint();
        },
        getHoverPaintStyle: function() {
            return this._jsPlumb.hoverPaintStyle;
        },
        destroy: function() {
            this.cleanupListeners(); // this is on EventGenerator
            this.clone = null;
            this._jsPlumb = null;
        },

        isHover: function() {
            return this._jsPlumb.hover;
        },

        setHover: function(hover, ignoreAttachedElements, timestamp) {
            // while dragging, we ignore these events.  this keeps the UI from flashing and
            // swishing and whatevering.
            if (this._jsPlumb && !this._jsPlumb.instance.currentlyDragging && !this._jsPlumb.instance.isHoverSuspended()) {

                this._jsPlumb.hover = hover;

                if (this.canvas !== null) {
                    if (this._jsPlumb.instance.hoverClass !== null) {
                        var method = hover ? "addClass" : "removeClass";
                        this._jsPlumb.instance[method](this.canvas, this._jsPlumb.instance.hoverClass);
                    }
                    if (this._jsPlumb.hoverClass !== null) {
                        this._jsPlumb.instance[method](this.canvas, this._jsPlumb.hoverClass);
                    }
                }
                if (this._jsPlumb.hoverPaintStyle !== null) {
                    this._jsPlumb.paintStyleInUse = hover ? this._jsPlumb.hoverPaintStyle : this._jsPlumb.paintStyle;
                    if (!this._jsPlumb.instance.isSuspendDrawing()) {
                        timestamp = timestamp || _timestamp();
                        this.repaint({
                            timestamp: timestamp,
                            recalc: false
                        });
                    }
                }
                // get the list of other affected elements, if supported by this component.
                // for a connection, its the endpoints.  for an endpoint, its the connections! surprise.
                if (this.getAttachedElements && !ignoreAttachedElements)
                    _updateAttachedElements(this, hover, _timestamp(), this);
            }
        }
    });

    // ------------------------------ END jsPlumbUIComponent --------------------------------------------

    // ------------------------------ BEGIN OverlayCapablejsPlumbUIComponent --------------------------------------------

    var _internalLabelOverlayId = "__label",
        // helper to get the index of some overlay
        _getOverlayIndex = function(component, id) {
            var idx = -1;
            for (var i = 0, j = component._jsPlumb.overlays.length; i < j; i++) {
                if (id === component._jsPlumb.overlays[i].id) {
                    idx = i;
                    break;
                }
            }
            return idx;
        },
        // this is a shortcut helper method to let people add a label as
        // overlay.
        _makeLabelOverlay = function(component, params) {

            var _params = {
                    cssClass: params.cssClass,
                    labelStyle: component.labelStyle,
                    id: _internalLabelOverlayId,
                    component: component,
                    _jsPlumb: component._jsPlumb.instance // TODO not necessary, since the instance can be accessed through the component.
                },
                mergedParams = global.jsPlumb.extend(_params, params);

            return new global.jsPlumb.Overlays[component._jsPlumb.instance.getRenderMode()].Label(mergedParams);
        },
        _processOverlay = function(component, o) {
            var _newOverlay = null;
            if (_ju.isArray(o)) { // this is for the shorthand ["Arrow", { width:50 }] syntax
                // there's also a three arg version:
                // ["Arrow", { width:50 }, {location:0.7}] 
                // which merges the 3rd arg into the 2nd.
                var type = o[0],
                    // make a copy of the object so as not to mess up anyone else's reference...
                    p = global.jsPlumb.extend({
                        component: component,
                        _jsPlumb: component._jsPlumb.instance
                    }, o[1]);
                if (o.length == 3) global.jsPlumb.extend(p, o[2]);
                _newOverlay = new global.jsPlumb.Overlays[component._jsPlumb.instance.getRenderMode()][type](p);
            } else if (o.constructor == String) {
                _newOverlay = new global.jsPlumb.Overlays[component._jsPlumb.instance.getRenderMode()][o]({
                    component: component,
                    _jsPlumb: component._jsPlumb.instance
                });
            } else {
                _newOverlay = o;
            }

            component._jsPlumb.overlays.push(_newOverlay);
        },
        _calculateOverlaysToAdd = function(component, params) {
            var defaultKeys = component.defaultOverlayKeys || [],
                o = params.overlays,
                checkKey = function(k) {
                    return component._jsPlumb.instance.Defaults[k] || global.jsPlumb.Defaults[k] || [];
                };

            if (!o) o = [];

            for (var i = 0, j = defaultKeys.length; i < j; i++)
                o.unshift.apply(o, checkKey(defaultKeys[i]));

            return o;
        },
        OverlayCapableJsPlumbUIComponent = global.OverlayCapableJsPlumbUIComponent = function(params) {

            jsPlumbUIComponent.apply(this, arguments);
            this._jsPlumb.overlays = [];

            var _overlays = _calculateOverlaysToAdd(this, params);
            if (_overlays) {
                for (var i = 0, j = _overlays.length; i < j; i++) {
                    _processOverlay(this, _overlays[i]);
                }
            }

            if (params.label) {
                var loc = params.labelLocation || this.defaultLabelLocation || 0.5,
                    labelStyle = params.labelStyle || this._jsPlumb.instance.Defaults.LabelStyle;

                this._jsPlumb.overlays.push(_makeLabelOverlay(this, {
                    label: params.label,
                    location: loc,
                    labelStyle: labelStyle
                }));
            }

            this.setListenerComponent = function(c) {
                if (this._jsPlumb) {
                    for (var i = 0; i < this._jsPlumb.overlays.length; i++)
                        this._jsPlumb.overlays[i].setListenerComponent(c);
                }
            };
        };

    global.jsPlumbUtil.extend(global.OverlayCapableJsPlumbUIComponent, jsPlumbUIComponent, {
        applyType: function(t, doNotRepaint) {
            this.removeAllOverlays(doNotRepaint);
            if (t.overlays) {
                for (var i = 0, j = t.overlays.length; i < j; i++)
                    this.addOverlay(t.overlays[i], true);
            }
        },
        setHover: function(hover, ignoreAttachedElements) {
            if (this._jsPlumb && !this._jsPlumb.instance.isConnectionBeingDragged()) {
                for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++) {
                    this._jsPlumb.overlays[i][hover ? "addClass" : "removeClass"](this._jsPlumb.instance.hoverClass);
                }
            }
        },
        addOverlay: function(overlay, doNotRepaint) {
            _processOverlay(this, overlay);
            if (!doNotRepaint) this.repaint();
        },
        getOverlay: function(id) {
            var idx = _getOverlayIndex(this, id);
            return idx >= 0 ? this._jsPlumb.overlays[idx] : null;
        },
        getOverlays: function() {
            return this._jsPlumb.overlays;
        },
        hideOverlay: function(id) {
            var o = this.getOverlay(id);
            if (o) o.hide();
        },
        hideOverlays: function() {
            for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++)
                this._jsPlumb.overlays[i].hide();
        },
        showOverlay: function(id) {
            var o = this.getOverlay(id);
            if (o) o.show();
        },
        showOverlays: function() {
            for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++)
                this._jsPlumb.overlays[i].show();
        },
        removeAllOverlays: function(doNotRepaint) {
            for (var i = 0, j = this._jsPlumb.overlays.length; i < j; i++) {
                if (this._jsPlumb.overlays[i].cleanup) this._jsPlumb.overlays[i].cleanup();
            }

            this._jsPlumb.overlays.splice(0, this._jsPlumb.overlays.length);
            this._jsPlumb.overlayPositions = null;
            if (!doNotRepaint)
                this.repaint();
        },
        removeOverlay: function(overlayId) {
            var idx = _getOverlayIndex(this, overlayId);
            if (idx != -1) {
                var o = this._jsPlumb.overlays[idx];
                if (o.cleanup) o.cleanup();
                this._jsPlumb.overlays.splice(idx, 1);
                if (this._jsPlumb.overlayPositions)
                    delete this._jsPlumb.overlayPositions[overlayId];
            }
        },
        removeOverlays: function() {
            for (var i = 0, j = arguments.length; i < j; i++)
                this.removeOverlay(arguments[i]);
        },
        moveParent: function(newParent) {
            if (this.bgCanvas) {
                this.bgCanvas.parentNode.removeChild(this.bgCanvas);
                newParent.appendChild(this.bgCanvas);
            }

            this.canvas.parentNode.removeChild(this.canvas);
            newParent.appendChild(this.canvas);

            for (var i = 0; i < this._jsPlumb.overlays.length; i++) {
                if (this._jsPlumb.overlays[i].isAppendedAtTopLevel) {
                    this._jsPlumb.overlays[i].canvas.parentNode.removeChild(this._jsPlumb.overlays[i].canvas);
                    newParent.appendChild(this._jsPlumb.overlays[i].canvas);
                }
            }
        },
        getLabel: function() {
            var lo = this.getOverlay(_internalLabelOverlayId);
            return lo !== null ? lo.getLabel() : null;
        },
        getLabelOverlay: function() {
            return this.getOverlay(_internalLabelOverlayId);
        },
        setLabel: function(l) {
            var lo = this.getOverlay(_internalLabelOverlayId);
            if (!lo) {
                var params = l.constructor == String || l.constructor == Function ? {
                    label: l
                } : l;
                lo = _makeLabelOverlay(this, params);
                this._jsPlumb.overlays.push(lo);
            } else {
                if (l.constructor == String || l.constructor == Function) lo.setLabel(l);
                else {
                    if (l.label) lo.setLabel(l.label);
                    if (l.location) lo.setLocation(l.location);
                }
            }

            if (!this._jsPlumb.instance.isSuspendDrawing())
                this.repaint();
        },
        cleanup: function() {
            for (var i = 0; i < this._jsPlumb.overlays.length; i++) {
                this._jsPlumb.overlays[i].cleanup();
                this._jsPlumb.overlays[i].destroy();
            }
            this._jsPlumb.overlays.length = 0;
            this._jsPlumb.overlayPositions = null;
        },
        setVisible: function(v) {
            this[v ? "showOverlays" : "hideOverlays"]();
        },
        setAbsoluteOverlayPosition: function(overlay, xy) {
            this._jsPlumb.overlayPositions = this._jsPlumb.overlayPositions || {};
            this._jsPlumb.overlayPositions[overlay.id] = xy;
        },
        getAbsoluteOverlayPosition: function(overlay) {
            return this._jsPlumb.overlayPositions ? this._jsPlumb.overlayPositions[overlay.id] : null;
        }
    });

    // ------------------------------ END OverlayCapablejsPlumbUIComponent --------------------------------------------

    var _jsPlumbInstanceIndex = 0,
        getInstanceIndex = function() {
            var i = _jsPlumbInstanceIndex + 1;
            _jsPlumbInstanceIndex++;
            return i;
        };

    var jsPlumbInstance = global.jsPlumbInstance = function(_defaults) {

        this.Defaults = {
            Anchor: "Bottom",
            Anchors: [null, null],
            ConnectionsDetachable: true,
            ConnectionOverlays: [],
            Connector: "Bezier",
            Container: null,
            DoNotThrowErrors: false,
            DragOptions: {},
            DropOptions: {},
            Endpoint: "Dot",
            EndpointOverlays: [],
            Endpoints: [null, null],
            EndpointStyle: {
                fillStyle: "#456"
            },
            EndpointStyles: [null, null],
            EndpointHoverStyle: null,
            EndpointHoverStyles: [null, null],
            HoverPaintStyle: null,
            LabelStyle: {
                color: "black"
            },
            LogEnabled: false,
            Overlays: [],
            MaxConnections: 1,
            PaintStyle: {
                lineWidth: 4,
                strokeStyle: "#456"
            },
            ReattachConnections: false,
            RenderMode: "svg",
            Scope: "jsPlumb_DefaultScope"
        };
        if (_defaults) global.jsPlumb.extend(this.Defaults, _defaults);

        this.logEnabled = this.Defaults.LogEnabled;
        this._connectionTypes = {};
        this._endpointTypes = {};

        global.jsPlumbUtil.EventGenerator.apply(this);

        var _currentInstance = this,
            _instanceIndex = getInstanceIndex(),
            _bb = _currentInstance.bind,
            _initialDefaults = {},
            _zoom = 1,
            _info = function(el) {
                var _el = _currentInstance.getDOMElement(el);
                return {
                    el: _el,
                    id: (global.jsPlumbUtil.isString(el) && _el === null) ? el : _getId(_el)
                };
            };

        this.getInstanceIndex = function() {
            return _instanceIndex;
        };

        this.setZoom = function(z, repaintEverything) {
            if (!global.jsPlumbUtil.oldIE) {
                _zoom = z;
                _currentInstance.fire("zoom", _zoom);
                if (repaintEverything) _currentInstance.repaintEverything();
            }
            return !global.jsPlumbUtil.oldIE;

        };
        this.getZoom = function() {
            return _zoom;
        };

        for (var i in this.Defaults)
            _initialDefaults[i] = this.Defaults[i];

        var _container;
        this.setContainer = function(c) {

            // TODO if a _container already exists, unbind delegations from it

            c = this.getDOMElement(c);
            this.select().each(function(conn) {
                conn.moveParent(c);
            });
            this.selectEndpoints().each(function(ep) {
                ep.moveParent(c);
            });
            _container = c;

            var _oneDelegateHandler = function(id, e) {
                var t = e.srcElement || e.target,
                    jp = (t && t.parentNode ? t.parentNode._jsPlumb : null) || (t ? t._jsPlumb : null) || (t && t.parentNode && t.parentNode.parentNode ? t.parentNode.parentNode._jsPlumb : null);
                if (jp) {
                    jp.fire(id, jp, e);
                    // jsplumb also fires every event coming from components
                    _currentInstance.fire(id, jp, e);
                }
            };

            // delegate one event on the container to jsplumb elements. it might be possible to
            // abstract this out: each of endpoint, connection and overlay could register themselves with
            // jsplumb as "component types" or whatever, and provide a suitable selector. this would be
            // done by the renderer (although admittedly from 2.0 onwards we're not supporting vml anymore)
            var _oneDelegate = function(id) {
                // connections.
                _currentInstance.on(_container, id, "._jsPlumb_connector, ._jsPlumb_connector > *", function(e) {
                    _oneDelegateHandler(id, e);
                });
                // endpoints. note they can have an enclosing div, or not.
                _currentInstance.on(_container, id, "._jsPlumb_endpoint, ._jsPlumb_endpoint > *, ._jsPlumb_endpoint svg *", function(e) {
                    _oneDelegateHandler(id, e);
                });
                // overlays
                _currentInstance.on(_container, id, "._jsPlumb_overlay, ._jsPlumb_overlay *", function(e) {
                    _oneDelegateHandler(id, e);
                });
            };

            for (var i = 0; i < events.length; i++)
                _oneDelegate(events[i]);

        };
        this.getContainer = function() {
            return _container;
        };

        this.bind = function(event, fn) {
            if ("ready" === event && initialized) fn();
            else _bb.apply(_currentInstance, [event, fn]);
        };

        _currentInstance.importDefaults = function(d) {
            for (var i in d) {
                _currentInstance.Defaults[i] = d[i];
            }
            if (d.Container)
                _currentInstance.setContainer(d.Container);

            return _currentInstance;
        };

        _currentInstance.restoreDefaults = function() {
            _currentInstance.Defaults = global.jsPlumb.extend({}, _initialDefaults);
            return _currentInstance;
        };

        //_currentInstance.floatingConnections = {};ctions = {};

        var log = null,
            initialized = false,
            // TODO remove from window scope       
            connections = [],
            // map of element id -> endpoint lists. an element can have an arbitrary
            // number of endpoints on it, and not all of them have to be connected
            // to anything.         
            endpointsByElement = {},
            endpointsByUUID = {},
            // SP new
            managedElements = {},
            offsets = {},
            offsetTimestamps = {},

            draggableStates = {},
            connectionBeingDragged = false,
            sizes = [],
            _suspendDrawing = false,
            _suspendedAt = null,
            DEFAULT_SCOPE = this.Defaults.Scope,
            renderMode = null, // will be set in init()		
            _curIdStamp = 1,
            _idstamp = function() {
                return "" + _curIdStamp++;
            },

            //
            // appends an element to some other element, which is calculated as follows:
            // 
            // 1. if Container exists, use that element.
            // 2. if the 'parent' parameter exists, use that.
            // 3. otherwise just use the root element (for DOM usage, the document body).
            // 
            //
            _appendElement = function(el, parent) {
                if (_container)
                    _container.appendChild(el);
                else if (!parent)
                    this.appendToRoot(el);
                else
                    this.getDOMElement(parent).appendChild(el);
            }.bind(this),

            //
            // Draws an endpoint and its connections. this is the main entry point into drawing connections as well
            // as endpoints, since jsPlumb is endpoint-centric under the hood.
            // 
            // @param element element to draw (of type library specific element object)
            // @param ui UI object from current library's event system. optional.
            // @param timestamp timestamp for this paint cycle. used to speed things up a little by cutting down the amount of offset calculations we do.
            // @param clearEdits defaults to false; indicates that mouse edits for connectors should be cleared
            ///
            _draw = function(element, ui, timestamp, clearEdits) {

                // TODO is it correct to filter by headless at this top level? how would a headless adapter ever repaint?
                if (!global.jsPlumbAdapter.headless && !_suspendDrawing) {
                    var id = _getId(element),
                        repaintEls = _currentInstance.dragManager.getElementsForDraggable(id);

                    if (timestamp === null) timestamp = _timestamp();

                    // update the offset of everything _before_ we try to draw anything.
                    var o = _updateOffset({
                        elId: id,
                        offset: ui,
                        recalc: false,
                        timestamp: timestamp
                    });

                    if (repaintEls) {
                        for (var i in repaintEls) {
                            // TODO this seems to cause a lag, but we provide the offset, so in theory it 
                            // should not.  is the timestamp failing?
                            _updateOffset({
                                elId: repaintEls[i].id,
                                offset: {
                                    left: o.o.left + repaintEls[i].offset.left,
                                    top: o.o.top + repaintEls[i].offset.top
                                },
                                recalc: false,
                                timestamp: timestamp
                            });
                        }
                    }

                    _currentInstance.anchorManager.redraw(id, ui, timestamp, null, clearEdits);

                    if (repaintEls) {
                        for (var j in repaintEls) {
                            _currentInstance.anchorManager.redraw(repaintEls[j].id, ui, timestamp, repaintEls[j].offset, clearEdits, true);
                        }
                    }
                }
            },

            //
            // executes the given function against the given element if the first
            // argument is an object, or the list of elements, if the first argument
            // is a list. the function passed in takes (element, elementId) as
            // arguments.
            //
            _elementProxy = function(element, fn) {
                var retVal = null,
                    el, id, del;
                if (_ju.isArray(element)) {
                    retVal = [];
                    for (var i = 0, j = element.length; i < j; i++) {
                        el = _currentInstance.getElementObject(element[i]);
                        del = _currentInstance.getDOMElement(el);
                        id = _currentInstance.getAttribute(del, "id");
                        retVal.push(fn.apply(_currentInstance, [del, id])); // append return values to what we will return
                    }
                } else {
                    el = _currentInstance.getDOMElement(element);
                    id = _currentInstance.getId(el);
                    retVal = fn.apply(_currentInstance, [el, id]);
                }
                return retVal;
            },

            //
            // gets an Endpoint by uuid.
            //
            _getEndpoint = function(uuid) {
                return endpointsByUUID[uuid];
            },

            /**
             * inits a draggable if it's not already initialised.
             * TODO: somehow abstract this to the adapter, because the concept of "draggable" has no
             * place on the server.
             */
            _initDraggableIfNecessary = function(element, isDraggable, dragOptions, id) {
                // TODO move to DragManager?
                if (!global.jsPlumbAdapter.headless) {
                    var _draggable = isDraggable === null ? false : isDraggable;
                    if (_draggable) {
                        if (global.jsPlumb.isDragSupported(element, _currentInstance) && !global.jsPlumb.isAlreadyDraggable(element, _currentInstance)) {
                            var options = dragOptions || _currentInstance.Defaults.DragOptions;
                            options = global.jsPlumb.extend({}, options); // make a copy.
                            var dragEvent = global.jsPlumb.dragEvents.drag,
                                stopEvent = global.jsPlumb.dragEvents.stop,
                                startEvent = global.jsPlumb.dragEvents.start,
                                _del = _currentInstance.getDOMElement(element),
                                _ancestor = _currentInstance.dragManager.getDragAncestor(_del),
                                _noOffset = {
                                    left: 0,
                                    top: 0
                                },
                                _ancestorOffset = _noOffset,
                                _started = false;

                            _manage(id, element);

                            options[startEvent] = _ju.wrap(options[startEvent], function() {
                                _ancestorOffset = _ancestor !== null ? global.jsPlumbAdapter.getOffset(_ancestor, _currentInstance) : _noOffset;
                                _currentInstance.setHoverSuspended(true);
                                _currentInstance.select({
                                    source: element
                                }).addClass(_currentInstance.elementDraggingClass + " " + _currentInstance.sourceElementDraggingClass, true);
                                _currentInstance.select({
                                    target: element
                                }).addClass(_currentInstance.elementDraggingClass + " " + _currentInstance.targetElementDraggingClass, true);
                                _currentInstance.setConnectionBeingDragged(true);
                                if (options.canDrag) return dragOptions.canDrag();
                            }, false);

                            options[dragEvent] = _ju.wrap(options[dragEvent], function() {
                                // TODO: here we could actually use getDragObject, and then compute it ourselves,
                                // since every adapter does the same thing. but i'm not sure why YUI's getDragObject
                                // differs from getUIPosition so much						
                                var ui = _currentInstance.getUIPosition(arguments, _currentInstance.getZoom());
                                // adjust by ancestor offset if there is one: this is for the case that a draggable
                                // is contained inside some other element that is not the Container.
                                ui.left += _ancestorOffset.left;
                                ui.top += _ancestorOffset.top;
                                _draw(element, ui, null, true);
                                if (_started) _currentInstance.addClass(element, "jsPlumb_dragged");
                                _started = true;
                            });
                            options[stopEvent] = _ju.wrap(options[stopEvent], function() {
                                var ui = _currentInstance.getUIPosition(arguments, _currentInstance.getZoom(), true);
                                _draw(element, ui);
                                _started = false;
                                _currentInstance.removeClass(element, "jsPlumb_dragged");
                                _currentInstance.setHoverSuspended(false);
                                _currentInstance.select({
                                    source: element
                                }).removeClass(_currentInstance.elementDraggingClass + " " + _currentInstance.sourceElementDraggingClass, true);
                                _currentInstance.select({
                                    target: element
                                }).removeClass(_currentInstance.elementDraggingClass + " " + _currentInstance.targetElementDraggingClass, true);
                                _currentInstance.setConnectionBeingDragged(false);
                                _currentInstance.dragManager.dragEnded(element);
                            });
                            var elId = _getId(element); // need ID
                            draggableStates[elId] = true;
                            var draggable = draggableStates[elId];
                            options.disabled = draggable === null ? false : !draggable;
                            _currentInstance.initDraggable(element, options);
                            _currentInstance.dragManager.register(element);
                        }
                    }
                }
            },

            _scopeMatch = function(e1, e2) {
                var s1 = e1.scope.split(/\s/),
                    s2 = e2.scope.split(/\s/);
                for (var i = 0; i < s1.length; i++)
                    for (var j = 0; j < s2.length; j++)
                        if (s2[j] == s1[i]) return true;

                return false;
            },

            /*
             * prepares a final params object that can be passed to _newConnection, taking into account defaults, events, etc.
             */
            _prepareConnectionParams = function(params, referenceParams) {
                var _p = global.jsPlumb.extend({}, params);
                if (referenceParams) global.jsPlumb.extend(_p, referenceParams);

                // hotwire endpoints passed as source or target to sourceEndpoint/targetEndpoint, respectively.
                if (_p.source) {
                    if (_p.source.endpoint)
                        _p.sourceEndpoint = _p.source;
                    else
                        _p.source = _currentInstance.getDOMElement(_p.source);
                }
                if (_p.target) {
                    if (_p.target.endpoint)
                        _p.targetEndpoint = _p.target;
                    else
                        _p.target = _currentInstance.getDOMElement(_p.target);
                }

                // test for endpoint uuids to connect
                if (params.uuids) {
                    _p.sourceEndpoint = _getEndpoint(params.uuids[0]);
                    _p.targetEndpoint = _getEndpoint(params.uuids[1]);
                }

                // now ensure that if we do have Endpoints already, they're not full.
                // source:
                if (_p.sourceEndpoint && _p.sourceEndpoint.isFull()) {
                    _ju.log(_currentInstance, "could not add connection; source endpoint is full");
                    return;
                }

                // target:
                if (_p.targetEndpoint && _p.targetEndpoint.isFull()) {
                    _ju.log(_currentInstance, "could not add connection; target endpoint is full");
                    return;
                }

                // if source endpoint mandates connection type and nothing specified in our params, use it.
                if (!_p.type && _p.sourceEndpoint)
                    _p.type = _p.sourceEndpoint.connectionType;

                // copy in any connectorOverlays that were specified on the source endpoint.
                // it doesnt copy target endpoint overlays.  i'm not sure if we want it to or not.
                if (_p.sourceEndpoint && _p.sourceEndpoint.connectorOverlays) {
                    _p.overlays = _p.overlays || [];
                    for (var i = 0, j = _p.sourceEndpoint.connectorOverlays.length; i < j; i++) {
                        _p.overlays.push(_p.sourceEndpoint.connectorOverlays[i]);
                    }
                }

                // pointer events
                if (!_p["pointer-events"] && _p.sourceEndpoint && _p.sourceEndpoint.connectorPointerEvents)
                    _p["pointer-events"] = _p.sourceEndpoint.connectorPointerEvents;

                var _mergeOverrides = function(def, values) {
                    var m = global.jsPlumb.extend({}, def);
                    for (var i in values) {
                        if (values[i]) m[i] = values[i];
                    }
                    return m;
                };

                var _addEndpoint = function(el, def, idx) {
                    return _currentInstance.addEndpoint(el, _mergeOverrides(def, {
                        anchor: _p.anchors ? _p.anchors[idx] : _p.anchor,
                        endpoint: _p.endpoints ? _p.endpoints[idx] : _p.endpoint,
                        paintStyle: _p.endpointStyles ? _p.endpointStyles[idx] : _p.endpointStyle,
                        hoverPaintStyle: _p.endpointHoverStyles ? _p.endpointHoverStyles[idx] : _p.endpointHoverStyle
                    }));
                };

                // check for makeSource/makeTarget specs.

                var _oneElementDef = function(type, idx, defs) {
                    if (_p[type] && !_p[type].endpoint && !_p[type + "Endpoint"] && !_p.newConnection) {
                        var tid = _getId(_p[type]),
                            tep = defs[tid];

                        if (tep) {
                            // if not enabled, return.
                            if (!tep.enabled) return false;

                            var newEndpoint = tep.endpoint !== null && tep.endpoint._jsPlumb ? tep.endpoint : _addEndpoint(_p[type], tep.def, idx);
                            if (tep.uniqueEndpoint) tep.endpoint = newEndpoint;
                            if (newEndpoint.isFull()) return false;
                            _p[type + "Endpoint"] = newEndpoint;
                            newEndpoint._doNotDeleteOnDetach = false; // reset.
                            newEndpoint._deleteOnDetach = true;
                        }
                    }
                };

                if (_oneElementDef("source", 0, this.sourceEndpointDefinitions) === false) return;
                if (_oneElementDef("target", 1, this.targetEndpointDefinitions) === false) return;

                // last, ensure scopes match
                if (_p.sourceEndpoint && _p.targetEndpoint)
                    if (!_scopeMatch(_p.sourceEndpoint, _p.targetEndpoint)) _p = null;

                return _p;
            }.bind(_currentInstance),

            _newConnection = function(params) {
                var connectionFunc = _currentInstance.Defaults.ConnectionType || _currentInstance.getDefaultConnectionType();

                params._jsPlumb = _currentInstance;
                params.newConnection = _newConnection;
                params.newEndpoint = _newEndpoint;
                params.endpointsByUUID = endpointsByUUID;
                params.endpointsByElement = endpointsByElement;
                params.finaliseConnection = _finaliseConnection;
                var con = new connectionFunc(params);
                con.id = "con_" + _idstamp();

                // if the connection is draggable, then maybe we need to tell the target endpoint to init the
                // dragging code. it won't run again if it already configured to be draggable.
                if (con.isDetachable()) {
                    con.endpoints[0].initDraggable();
                    con.endpoints[1].initDraggable();
                }

                return con;
            },

            //
            // adds the connection to the backing model, fires an event if necessary and then redraws
            //
            _finaliseConnection = _currentInstance.finaliseConnection = function(jpc, params, originalEvent, doInformAnchorManager) {
                params = params || {};
                // add to list of connections (by scope).
                if (!jpc.suspendedEndpoint)
                    connections.push(jpc);

                // turn off isTemporarySource on the source endpoint (only viable on first draw)
                jpc.endpoints[0].isTemporarySource = false;

                // always inform the anchor manager
                // except that if jpc has a suspended endpoint it's not true to say the
                // connection is new; it has just (possibly) moved. the question is whether
                // to make that call here or in the anchor manager.  i think perhaps here.
                if (jpc.suspendedEndpoint === null || doInformAnchorManager)
                    _currentInstance.anchorManager.newConnection(jpc);

                // force a paint
                _draw(jpc.source);

                // fire an event
                if (!params.doNotFireConnectionEvent && params.fireEvent !== false) {

                    var eventArgs = {
                        connection: jpc,
                        source: jpc.source,
                        target: jpc.target,
                        sourceId: jpc.sourceId,
                        targetId: jpc.targetId,
                        sourceEndpoint: jpc.endpoints[0],
                        targetEndpoint: jpc.endpoints[1]
                    };

                    _currentInstance.fire("connection", eventArgs, originalEvent);
                }
            },

            /*
			factory method to prepare a new endpoint.  this should always be used instead of creating Endpoints
			manually, since this method attaches event listeners and an id.
		*/
            _newEndpoint = function(params, id) {
                var endpointFunc = _currentInstance.Defaults.EndpointType || global.jsPlumb.Endpoint;
                var _p = global.jsPlumb.extend({}, params);
                _p._jsPlumb = _currentInstance;
                _p.newConnection = _newConnection;
                _p.newEndpoint = _newEndpoint;
                _p.endpointsByUUID = endpointsByUUID;
                _p.endpointsByElement = endpointsByElement;
                _p.fireDetachEvent = fireDetachEvent;
                _p.elementId = id || _getId(_p.source);
                var ep = new endpointFunc(_p);
                ep.id = "ep_" + _idstamp();
                _manage(_p.elementId, _p.source);
                if (!global.jsPlumbAdapter.headless)
                    _currentInstance.dragManager.endpointAdded(_p.source, id);

                return ep;
            },

            /*
             * performs the given function operation on all the connections found
             * for the given element id; this means we find all the endpoints for
             * the given element, and then for each endpoint find the connectors
             * connected to it. then we pass each connection in to the given
             * function.
             */
            _operation = function(elId, func, endpointFunc) {
                var endpoints = endpointsByElement[elId];
                if (endpoints && endpoints.length) {
                    for (var i = 0, ii = endpoints.length; i < ii; i++) {
                        for (var j = 0, jj = endpoints[i].connections.length; j < jj; j++) {
                            var retVal = func(endpoints[i].connections[j]);
                            // if the function passed in returns true, we exit.
                            // most functions return false.
                            if (retVal) return;
                        }
                        if (endpointFunc) endpointFunc(endpoints[i]);
                    }
                }
            },

            _setDraggable = function(element, draggable) {
                return _elementProxy(element, function(el, id) {
                    draggableStates[id] = draggable;
                    if (this.isDragSupported(el)) {
                        this.setElementDraggable(el, draggable);
                    }
                });
            },
            /*
             * private method to do the business of hiding/showing.
             *
             * @param el
             *            either Id of the element in question or a library specific
             *            object for the element.
             * @param state
             *            String specifying a value for the css 'display' property
             *            ('block' or 'none').
             */
            _setVisible = function(el, state, alsoChangeEndpoints) {
                state = state === "block";
                var endpointFunc = null;
                if (alsoChangeEndpoints) {
                    if (state) endpointFunc = function(ep) {
                        ep.setVisible(true, true, true);
                    };
                    else endpointFunc = function(ep) {
                        ep.setVisible(false, true, true);
                    };
                }
                var info = _info(el);
                _operation(info.id, function(jpc) {
                    if (state && alsoChangeEndpoints) {
                        // this test is necessary because this functionality is new, and i wanted to maintain backwards compatibility.
                        // this block will only set a connection to be visible if the other endpoint in the connection is also visible.
                        var oidx = jpc.sourceId === info.id ? 1 : 0;
                        if (jpc.endpoints[oidx].isVisible()) jpc.setVisible(true);
                    } else // the default behaviour for show, and what always happens for hide, is to just set the visibility without getting clever.
                        jpc.setVisible(state);
                }, endpointFunc);
            },
            /*
             * toggles the draggable state of the given element(s).
             * el is either an id, or an element object, or a list of ids/element objects.
             */
            _toggleDraggable = function(el) {
                return _elementProxy(el, function(el, elId) {
                    var state = draggableStates[elId] === null ? false : draggableStates[elId];
                    state = !state;
                    draggableStates[elId] = state;
                    this.setDraggable(el, state);
                    return state;
                }.bind(this));
            },
            /**
             * private method to do the business of toggling hiding/showing.
             */
            _toggleVisible = function(elId, changeEndpoints) {
                var endpointFunc = null;
                if (changeEndpoints) {
                    endpointFunc = function(ep) {
                        var state = ep.isVisible();
                        ep.setVisible(!state);
                    };
                }
                _operation(elId, function(jpc) {
                    var state = jpc.isVisible();
                    jpc.setVisible(!state);
                }, endpointFunc);
                // todo this should call _elementProxy, and pass in the
                // _operation(elId, f) call as a function. cos _toggleDraggable does
                // that.
            },

            // TODO comparison performance
            _getCachedData = function(elId) {
                var o = offsets[elId];
                if (!o)
                    return _updateOffset({
                        elId: elId
                    });
                else
                    return {
                        o: o,
                        s: sizes[elId]
                    };
            },

            /**
             * gets an id for the given element, creating and setting one if
             * necessary.  the id is of the form
             *
             *	jsPlumb_<instance index>_<index in instance>
             *
             * where "index in instance" is a monotonically increasing integer that starts at 0,
             * for each instance.  this method is used not only to assign ids to elements that do not
             * have them but also to connections and endpoints.
             */
            _getId = function(element, uuid, doNotCreateIfNotFound) {
                if (global.jsPlumbUtil.isString(element)) return element;
                if (element === null) return null;
                var id = _currentInstance.getAttribute(element, "id");
                if (!id || id === "undefined") {
                    // check if fixed uuid parameter is given
                    if (arguments.length == 2 && arguments[1] !== undefined)
                        id = uuid;
                    else if (arguments.length == 1 || (arguments.length == 3 && !arguments[2]))
                        id = "jsPlumb_" + _instanceIndex + "_" + _idstamp();

                    if (!doNotCreateIfNotFound) _currentInstance.setAttribute(element, "id", id);
                }
                return id;
            };

        this.setConnectionBeingDragged = function(v) {
            connectionBeingDragged = v;
        };
        this.isConnectionBeingDragged = function() {
            return connectionBeingDragged;
        };

        this.connectorClass = "_jsPlumb_connector";
        this.hoverClass = "_jsPlumb_hover";
        this.endpointClass = "_jsPlumb_endpoint";
        this.endpointConnectedClass = "_jsPlumb_endpoint_connected";
        this.endpointFullClass = "_jsPlumb_endpoint_full";
        this.endpointDropAllowedClass = "_jsPlumb_endpoint_drop_allowed";
        this.endpointDropForbiddenClass = "_jsPlumb_endpoint_drop_forbidden";
        this.overlayClass = "_jsPlumb_overlay";
        this.draggingClass = "_jsPlumb_dragging";
        this.elementDraggingClass = "_jsPlumb_element_dragging";
        this.sourceElementDraggingClass = "_jsPlumb_source_element_dragging";
        this.targetElementDraggingClass = "_jsPlumb_target_element_dragging";
        this.endpointAnchorClassPrefix = "_jsPlumb_endpoint_anchor";
        this.hoverSourceClass = "_jsPlumb_source_hover";
        this.hoverTargetClass = "_jsPlumb_target_hover";
        this.dragSelectClass = "_jsPlumb_drag_select";

        this.Anchors = {};
        this.Connectors = {
            "svg": {},
            "vml": {}
        };
        this.Endpoints = {
            "svg": {},
            "vml": {}
        };
        this.Overlays = {
            "svg": {},
            "vml": {}
        };
        this.ConnectorRenderers = {};
        this.SVG = "svg";
        this.VML = "vml";

        // --------------------------- jsPlumbInstance public API ---------------------------------------------------------


        this.addEndpoint = function(el, params, referenceParams) {
            referenceParams = referenceParams || {};
            var p = global.jsPlumb.extend({}, referenceParams);
            global.jsPlumb.extend(p, params);
            p.endpoint = p.endpoint || _currentInstance.Defaults.Endpoint;
            p.paintStyle = p.paintStyle || _currentInstance.Defaults.EndpointStyle;

            var results = [],
                inputs = (_ju.isArray(el) || (el.length !== null && !_ju.isString(el))) ? el : [el];

            for (var i = 0, j = inputs.length; i < j; i++) {
                p.source = _currentInstance.getDOMElement(inputs[i]);
                _ensureContainer(p.source);

                var id = _getId(p.source),
                    e = _newEndpoint(p, id);

                // SP new. here we have introduced a class-wide element manager, which is responsible
                // for getting object dimensions and width/height, and for updating these values only
                // when necessary (after a drag, or on a forced refresh call).
                var myOffset = _manage(id, p.source).info.o;
                _ju.addToList(endpointsByElement, id, e);

                if (!_suspendDrawing) {
                    e.paint({
                        anchorLoc: e.anchor.compute({
                            xy: [myOffset.left, myOffset.top],
                            wh: sizes[id],
                            element: e,
                            timestamp: _suspendedAt
                        }),
                        timestamp: _suspendedAt
                    });
                }

                results.push(e);
                e._doNotDeleteOnDetach = true; // mark this as being added via addEndpoint.
            }

            return results.length == 1 ? results[0] : results;
        };

        this.addEndpoints = function(el, endpoints, referenceParams) {
            var results = [];
            for (var i = 0, j = endpoints.length; i < j; i++) {
                var e = _currentInstance.addEndpoint(el, endpoints[i], referenceParams);
                if (_ju.isArray(e))
                    Array.prototype.push.apply(results, e);
                else results.push(e);
            }
            return results;
        };

        this.animate = function(el, properties, options) {
            options = options || {};
            var ele = _currentInstance.getElementObject(el),
                del = _currentInstance.getDOMElement(el),
                id = _getId(del),
                stepFunction = global.jsPlumb.animEvents.step,
                completeFunction = global.jsPlumb.animEvents.complete;

            options[stepFunction] = _ju.wrap(options[stepFunction], function() {
                _currentInstance.revalidate(id);
            });

            // onComplete repaints, just to make sure everything looks good at the end of the animation.
            options[completeFunction] = _ju.wrap(options[completeFunction], function() {
                _currentInstance.revalidate(id);
            });

            _currentInstance.doAnimate(ele, properties, options);
        };

        /**
         * checks for a listener for the given condition, executing it if found, passing in the given value.
         * condition listeners would have been attached using "bind" (which is, you could argue, now overloaded, since
         * firing click events etc is a bit different to what this does).  i thought about adding a "bindCondition"
         * or something, but decided against it, for the sake of simplicity. jsPlumb will never fire one of these
         * condition events anyway.
         */
        this.checkCondition = function(conditionName, value) {
            var l = _currentInstance.getListener(conditionName),
                r = true;

            if (l && l.length > 0) {
                try {
                    for (var i = 0, j = l.length; i < j; i++) {
                        r = r && l[i](value);
                    }
                } catch (e) {
                    _ju.log(_currentInstance, "cannot check condition [" + conditionName + "]" + e);
                }
            }
            return r;
        };

        this.connect = function(params, referenceParams) {
            // prepare a final set of parameters to create connection with
            var _p = _prepareConnectionParams(params, referenceParams),
                jpc;
            // TODO probably a nicer return value if the connection was not made.  _prepareConnectionParams
            // will return null (and log something) if either endpoint was full.  what would be nicer is to 
            // create a dedicated 'error' object.
            if (_p) {
                if (_p.source === null && _p.sourceEndpoint === null) {
                    global.jsPlumbUtil.log("Cannot establish connection - source does not exist");
                    return;
                }
                if (_p.target === null && _p.targetEndpoint === null) {
                    global.jsPlumbUtil.log("Cannot establish connection - target does not exist");
                    return;
                }
                _ensureContainer(_p.source);
                // create the connection.  it is not yet registered 
                jpc = _newConnection(_p);
                // now add it the model, fire an event, and redraw
                _finaliseConnection(jpc, _p);
            }
            return jpc;
        };

        var stTypes = [{
            el: "source",
            elId: "sourceId",
            epDefs: "sourceEndpointDefinitions"
        }, {
            el: "target",
            elId: "targetId",
            epDefs: "targetEndpointDefinitions"
        }];

        var _set = function(c, el, idx, doNotRepaint) {
            var ep, _st = stTypes[idx],
                cId = c[_st.elId],
                cEl = c[_st.el],
                sid, sep,
                oldEndpoint = c.endpoints[idx];

            var evtParams = {
                index: idx,
                originalSourceId: idx === 0 ? cId : c.sourceId,
                newSourceId: c.sourceId,
                originalTargetId: idx == 1 ? cId : c.targetId,
                newTargetId: c.targetId,
                connection: c
            };

            if (el.constructor == global.jsPlumb.Endpoint) { // TODO here match the current endpoint class; users can change it {
                ep = el;
                ep.addConnection(c);
            } else {
                sid = _getId(el);
                sep = this[_st.epDefs][sid];

                if (sid === c[_st.elId])
                    ep = null; // dont change source/target if the element is already the one given.
                else if (sep) {
                    if (!sep.enabled) return;
                    ep = sep.endpoint !== null && sep.endpoint._jsPlumb ? sep.endpoint : this.addEndpoint(el, sep.def);
                    if (sep.uniqueEndpoint) sep.endpoint = ep;
                    ep._doNotDeleteOnDetach = false;
                    ep._deleteOnDetach = true;
                    ep.addConnection(c);
                } else {
                    ep = c.makeEndpoint(idx === 0, el, sid);
                    ep._doNotDeleteOnDetach = false;
                    ep._deleteOnDetach = true;
                }
            }

            if (ep !== null) {
                oldEndpoint.detachFromConnection(c);
                c.endpoints[idx] = ep;
                c[_st.el] = ep.element;
                c[_st.elId] = ep.elementId;
                evtParams[idx === 0 ? "newSourceId" : "newTargetId"] = ep.elementId;

                fireMoveEvent(evtParams);

                if (!doNotRepaint)
                    c.repaint();
            }

            return evtParams;

        }.bind(this);

        this.setSource = function(connection, el, doNotRepaint) {
            var p = _set(connection, el, 0, doNotRepaint);
            this.anchorManager.sourceChanged(p.originalSourceId, p.newSourceId, connection);
        };
        this.setTarget = function(connection, el, doNotRepaint) {
            var p = _set(connection, el, 1, doNotRepaint);
            this.anchorManager.updateOtherEndpoint(p.originalSourceId, p.originalTargetId, p.newTargetId, connection);
        };

        this.deleteEndpoint = function(object, dontUpdateHover) {
            var endpoint = (typeof object === "string") ? endpointsByUUID[object] : object;
            if (endpoint) {
                _currentInstance.deleteObject({
                    endpoint: endpoint,
                    dontUpdateHover: dontUpdateHover
                });
            }
            return _currentInstance;
        };

        this.deleteEveryEndpoint = function() {
            var _is = _currentInstance.setSuspendDrawing(true);
            for (var id in endpointsByElement) {
                var endpoints = endpointsByElement[id];
                if (endpoints && endpoints.length) {
                    for (var i = 0, j = endpoints.length; i < j; i++) {
                        _currentInstance.deleteEndpoint(endpoints[i], true);
                    }
                }
            }
            endpointsByElement = {};
            // SP new
            managedElements = {};
            endpointsByUUID = {};
            _currentInstance.anchorManager.reset();
            _currentInstance.dragManager.reset();
            if (!_is) _currentInstance.setSuspendDrawing(false);
            return _currentInstance;
        };

        var fireDetachEvent = function(jpc, doFireEvent, originalEvent) {
            // may have been given a connection, or in special cases, an object
            var connType = _currentInstance.Defaults.ConnectionType || _currentInstance.getDefaultConnectionType(),
                argIsConnection = jpc.constructor == connType,
                params = argIsConnection ? {
                    connection: jpc,
                    source: jpc.source,
                    target: jpc.target,
                    sourceId: jpc.sourceId,
                    targetId: jpc.targetId,
                    sourceEndpoint: jpc.endpoints[0],
                    targetEndpoint: jpc.endpoints[1]
                } : jpc;

            if (doFireEvent)
                _currentInstance.fire("connectionDetached", params, originalEvent);

            _currentInstance.anchorManager.connectionDetached(params);
        };

        var fireMoveEvent = _currentInstance.fireMoveEvent = function(params, evt) {
            _currentInstance.fire("connectionMoved", params, evt);
        };

        this.unregisterEndpoint = function(endpoint) {
            //if (endpoint._jsPlumb === null) return;
            if (endpoint._jsPlumb.uuid) endpointsByUUID[endpoint._jsPlumb.uuid] = null;
            _currentInstance.anchorManager.deleteEndpoint(endpoint);
            // TODO at least replace this with a removeWithFunction call.			
            for (var e in endpointsByElement) {
                var endpoints = endpointsByElement[e];
                if (endpoints) {
                    var newEndpoints = [];
                    for (var i = 0, j = endpoints.length; i < j; i++)
                        if (endpoints[i] != endpoint) newEndpoints.push(endpoints[i]);

                    endpointsByElement[e] = newEndpoints;
                }
                if (endpointsByElement[e].length < 1) {
                    delete endpointsByElement[e];
                }
            }
        };

        this.detach = function() {

            if (arguments.length === 0) return;
            var connType = _currentInstance.Defaults.ConnectionType || _currentInstance.getDefaultConnectionType(),
                firstArgIsConnection = arguments[0].constructor == connType,
                params = arguments.length == 2 ? firstArgIsConnection ? (arguments[1] || {}) : arguments[0] : arguments[0],
                fireEvent = (params.fireEvent !== false),
                forceDetach = params.forceDetach,
                conn = firstArgIsConnection ? arguments[0] : params.connection;

            if (conn) {
                if (forceDetach || global.jsPlumbUtil.functionChain(true, false, [
                        [conn.endpoints[0], "isDetachAllowed", [conn]],
                        [conn.endpoints[1], "isDetachAllowed", [conn]],
                        [conn, "isDetachAllowed", [conn]],
                        [_currentInstance, "checkCondition", ["beforeDetach", conn]]
                    ])) {

                    conn.endpoints[0].detach(conn, false, true, fireEvent);
                }
            } else {
                var _p = global.jsPlumb.extend({}, params); // a backwards compatibility hack: source should be thought of as 'params' in this case.
                // test for endpoint uuids to detach
                if (_p.uuids) {
                    _getEndpoint(_p.uuids[0]).detachFrom(_getEndpoint(_p.uuids[1]), fireEvent);
                } else if (_p.sourceEndpoint && _p.targetEndpoint) {
                    _p.sourceEndpoint.detachFrom(_p.targetEndpoint);
                } else {
                    var sourceId = _getId(_currentInstance.getDOMElement(_p.source)),
                        targetId = _getId(_currentInstance.getDOMElement(_p.target));
                    _operation(sourceId, function(jpc) {
                        if ((jpc.sourceId == sourceId && jpc.targetId == targetId) || (jpc.targetId == sourceId && jpc.sourceId == targetId)) {
                            if (_currentInstance.checkCondition("beforeDetach", jpc)) {
                                jpc.endpoints[0].detach(jpc, false, true, fireEvent);
                            }
                        }
                    });
                }
            }
        };

        this.detachAllConnections = function(el, params) {
            params = params || {};
            el = _currentInstance.getDOMElement(el);
            var id = _getId(el),
                endpoints = endpointsByElement[id];
            if (endpoints && endpoints.length) {
                for (var i = 0, j = endpoints.length; i < j; i++) {
                    endpoints[i].detachAll(params.fireEvent !== false);
                }
            }
            return _currentInstance;
        };

        this.detachEveryConnection = function(params) {
            params = params || {};
            _currentInstance.doWhileSuspended(function() {
                for (var id in endpointsByElement) {
                    var endpoints = endpointsByElement[id];
                    if (endpoints && endpoints.length) {
                        for (var i = 0, j = endpoints.length; i < j; i++) {
                            endpoints[i].detachAll(params.fireEvent !== false);
                        }
                    }
                }
                connections.length = 0;
            });
            return _currentInstance;
        };

        /// not public.  but of course its exposed. how to change this.
        this.deleteObject = function(params) {
            var result = {
                    endpoints: {},
                    connections: {},
                    endpointCount: 0,
                    connectionCount: 0
                },
                fireEvent = params.fireEvent !== false,
                deleteAttachedObjects = params.deleteAttachedObjects !== false;

            var unravelConnection = function(connection) {
                if (connection !== null && result.connections[connection.id] === null) {
                    if (!params.dontUpdateHover && connection._jsPlumb !== null) connection.setHover(false);
                    result.connections[connection.id] = connection;
                    result.connectionCount++;
                    if (deleteAttachedObjects) {
                        for (var j = 0; j < connection.endpoints.length; j++) {
                            if (connection.endpoints[j]._deleteOnDetach)
                                unravelEndpoint(connection.endpoints[j]);
                        }
                    }
                }
            };
            var unravelEndpoint = function(endpoint) {
                if (endpoint !== null && result.endpoints[endpoint.id] === null) {
                    if (!params.dontUpdateHover && endpoint._jsPlumb !== null) endpoint.setHover(false);
                    result.endpoints[endpoint.id] = endpoint;
                    result.endpointCount++;

                    if (deleteAttachedObjects) {
                        for (var i = 0; i < endpoint.connections.length; i++) {
                            var c = endpoint.connections[i];
                            unravelConnection(c);
                        }
                    }
                }
            };

            if (params.connection)
                unravelConnection(params.connection);
            else unravelEndpoint(params.endpoint);

            // loop through connections
            for (var i in result.connections) {
                var c = result.connections[i];
                if (c._jsPlumb) {
                    global.jsPlumbUtil.removeWithFunction(connections, function(_c) {
                        return c.id == _c.id;
                    });
                    fireDetachEvent(c, fireEvent, params.originalEvent);

                    c.endpoints[0].detachFromConnection(c);
                    c.endpoints[1].detachFromConnection(c);
                    // sp was ere
                    c.cleanup();
                    c.destroy();
                }
            }

            // loop through endpoints
            for (var j in result.endpoints) {
                var e = result.endpoints[j];
                if (e._jsPlumb) {
                    _currentInstance.unregisterEndpoint(e);
                    // FIRE some endpoint deleted event?
                    e.cleanup();
                    e.destroy();
                }
            }

            return result;
        };

        this.draggable = function(el, options) {
            var i, j, info;
            // allows for array or jquery selector
            if (typeof el == 'object' && el.length) {
                for (i = 0, j = el.length; i < j; i++) {
                    info = _info(el[i]);
                    if (info.el) _initDraggableIfNecessary(info.el, true, options, info.id);
                }
            } else {
                //ele = _currentInstance.getDOMElement(el);
                info = _info(el);
                if (info.el) _initDraggableIfNecessary(info.el, true, options, info.id);
            }
            return _currentInstance;
        };

        // helpers for select/selectEndpoints
        var _setOperation = function(list, func, args, selector) {
                for (var i = 0, j = list.length; i < j; i++) {
                    list[i][func].apply(list[i], args);
                }
                return selector(list);
            },
            _getOperation = function(list, func, args) {
                var out = [];
                for (var i = 0, j = list.length; i < j; i++) {
                    out.push([list[i][func].apply(list[i], args), list[i]]);
                }
                return out;
            },
            setter = function(list, func, selector) {
                return function() {
                    return _setOperation(list, func, arguments, selector);
                };
            },
            getter = function(list, func) {
                return function() {
                    return _getOperation(list, func, arguments);
                };
            },
            prepareList = function(input, doNotGetIds) {
                var r = [];
                if (input) {
                    if (typeof input == 'string') {
                        if (input === "*") return input;
                        r.push(input);
                    } else {
                        if (doNotGetIds) r = input;
                        else {
                            if (input.length) {
                                for (var i = 0, j = input.length; i < j; i++)
                                    r.push(_info(input[i]).id);
                            } else
                                r.push(_info(input).id);
                        }
                    }
                }
                return r;
            },
            filterList = function(list, value, missingIsFalse) {
                if (list === "*") return true;
                return list.length > 0 ? global.jsPlumbUtil.indexOf(list, value) != -1 : !missingIsFalse;
            };

        // get some connections, specifying source/target/scope
        this.getConnections = function(options, flat) {
            if (!options) {
                options = {};
            } else if (options.constructor == String) {
                options = {
                    "scope": options
                };
            }
            var scope = options.scope || _currentInstance.getDefaultScope(),
                scopes = prepareList(scope, true),
                sources = prepareList(options.source),
                targets = prepareList(options.target),
                results = (!flat && scopes.length > 1) ? {} : [],
                _addOne = function(scope, obj) {
                    if (!flat && scopes.length > 1) {
                        var ss = results[scope];
                        if (ss === null) {
                            ss = results[scope] = [];
                        }
                        ss.push(obj);
                    } else results.push(obj);
                };

            for (var j = 0, jj = connections.length; j < jj; j++) {
                var c = connections[j];
                if (filterList(scopes, c.scope) && filterList(sources, c.sourceId) && filterList(targets, c.targetId))
                    _addOne(c.scope, c);
            }

            return results;
        };

        var _curryEach = function(list, executor) {
                return function(f) {
                    for (var i = 0, ii = list.length; i < ii; i++) {
                        f(list[i]);
                    }
                    return executor(list);
                };
            },
            _curryGet = function(list) {
                return function(idx) {
                    return list[idx];
                };
            };

        var _makeCommonSelectHandler = function(list, executor) {
            var out = {
                    length: list.length,
                    each: _curryEach(list, executor),
                    get: _curryGet(list)
                },
                setters = ["setHover", "removeAllOverlays", "setLabel", "addClass", "addOverlay", "removeOverlay",
                    "removeOverlays", "showOverlay", "hideOverlay", "showOverlays", "hideOverlays", "setPaintStyle",
                    "setHoverPaintStyle", "setSuspendEvents", "setParameter", "setParameters", "setVisible",
                    "repaint", "addType", "toggleType", "removeType", "removeClass", "setType", "bind", "unbind"
                ],

                getters = ["getLabel", "getOverlay", "isHover", "getParameter", "getParameters", "getPaintStyle",
                    "getHoverPaintStyle", "isVisible", "hasType", "getType", "isSuspendEvents"
                ],
                i, ii;

            for (i = 0, ii = setters.length; i < ii; i++)
                out[setters[i]] = setter(list, setters[i], executor);

            for (i = 0, ii = getters.length; i < ii; i++)
                out[getters[i]] = getter(list, getters[i]);

            return out;
        };

        var _makeConnectionSelectHandler = function(list) {
            var common = _makeCommonSelectHandler(list, _makeConnectionSelectHandler);
            return global.jsPlumb.extend(common, {
                // setters
                setDetachable: setter(list, "setDetachable", _makeConnectionSelectHandler),
                setReattach: setter(list, "setReattach", _makeConnectionSelectHandler),
                setConnector: setter(list, "setConnector", _makeConnectionSelectHandler),
                detach: function() {
                    for (var i = 0, ii = list.length; i < ii; i++)
                        _currentInstance.detach(list[i]);
                },
                // getters
                isDetachable: getter(list, "isDetachable"),
                isReattach: getter(list, "isReattach")
            });
        };

        var _makeEndpointSelectHandler = function(list) {
            var common = _makeCommonSelectHandler(list, _makeEndpointSelectHandler);
            return global.jsPlumb.extend(common, {
                setEnabled: setter(list, "setEnabled", _makeEndpointSelectHandler),
                setAnchor: setter(list, "setAnchor", _makeEndpointSelectHandler),
                isEnabled: getter(list, "isEnabled"),
                detachAll: function() {
                    for (var i = 0, ii = list.length; i < ii; i++)
                        list[i].detachAll();
                },
                "remove": function() {
                    for (var i = 0, ii = list.length; i < ii; i++)
                        _currentInstance.deleteObject({
                            endpoint: list[i]
                        });
                }
            });
        };


        this.select = function(params) {
            params = params || {};
            params.scope = params.scope || "*";
            return _makeConnectionSelectHandler(params.connections || _currentInstance.getConnections(params, true));
        };

        this.selectEndpoints = function(params) {
            params = params || {};
            params.scope = params.scope || "*";
            var noElementFilters = !params.element && !params.source && !params.target,
                elements = noElementFilters ? "*" : prepareList(params.element),
                sources = noElementFilters ? "*" : prepareList(params.source),
                targets = noElementFilters ? "*" : prepareList(params.target),
                scopes = prepareList(params.scope, true);

            var ep = [];

            for (var el in endpointsByElement) {
                var either = filterList(elements, el, true),
                    source = filterList(sources, el, true),
                    sourceMatchExact = sources != "*",
                    target = filterList(targets, el, true),
                    targetMatchExact = targets != "*";

                // if they requested 'either' then just match scope. otherwise if they requested 'source' (not as a wildcard) then we have to match only endpoints that have isSource set to to true, and the same thing with isTarget.  
                if (either || source || target) {
                    inner: for (var i = 0, ii = endpointsByElement[el].length; i < ii; i++) {
                        var _ep = endpointsByElement[el][i];
                        if (filterList(scopes, _ep.scope, true)) {

                            var noMatchSource = (sourceMatchExact && sources.length > 0 && !_ep.isSource),
                                noMatchTarget = (targetMatchExact && targets.length > 0 && !_ep.isTarget);

                            if (noMatchSource || noMatchTarget)
                                continue inner;

                            ep.push(_ep);
                        }
                    }
                }
            }

            return _makeEndpointSelectHandler(ep);
        };

        // get all connections managed by the instance of jsplumb.
        this.getAllConnections = function() {
            return connections;
        };
        this.getDefaultScope = function() {
            return DEFAULT_SCOPE;
        };
        // get an endpoint by uuid.
        this.getEndpoint = _getEndpoint;
        // get endpoints for some element.
        this.getEndpoints = function(el) {
            return endpointsByElement[_info(el).id];
        };
        // gets the default endpoint type. used when subclassing. see wiki.
        this.getDefaultEndpointType = function() {
            return global.jsPlumb.Endpoint;
        };
        // gets the default connection type. used when subclassing.  see wiki.
        this.getDefaultConnectionType = function() {
            return global.jsPlumb.Connection;
        };
        /*
         * Gets an element's id, creating one if necessary. really only exposed
         * for the lib-specific functionality to access; would be better to pass
         * the current instance into the lib-specific code (even though this is
         * a static call. i just don't want to expose it to the public API).
         */
        this.getId = _getId;
        this.getOffset = function(id) {
            return _updateOffset({
                elId: id
            }).o;
        };

        this.appendElement = _appendElement;

        var _hoverSuspended = false;
        this.isHoverSuspended = function() {
            return _hoverSuspended;
        };
        this.setHoverSuspended = function(s) {
            _hoverSuspended = s;
        };

        var _isAvailable = function(m) {
            return function() {
                return global.jsPlumbAdapter.isRenderModeAvailable(m);
            };
        };

        this.isSVGAvailable = _isAvailable("svg");
        this.isVMLAvailable = _isAvailable("vml");

        // set an element's connections to be hidden
        this.hide = function(el, changeEndpoints) {
            _setVisible(el, "none", changeEndpoints);
            return _currentInstance;
        };

        // exposed for other objects to use to get a unique id.
        this.idstamp = _idstamp;

        this.connectorsInitialized = false;
        var connectorTypes = [],
            rendererTypes = ["svg", "vml"];
        this.registerConnectorType = function(connector, name) {
            connectorTypes.push([connector, name]);
        };

        // ensure that, if the current container exists, it is a DOM element and not a selector.
        // if it does not exist and `candidate` is supplied, the offset parent of that element will be set as the Container.
        // this is used to do a better default behaviour for the case that the user has not set a container:
        // addEndpoint, makeSource, makeTarget and connect all call this method with the offsetParent of the 
        // element in question (for connect it is the source element). So if no container is set, it is inferred
        // to be the offsetParent of the first element the user tries to connect.
        var _ensureContainer = function(candidate) {
            if (!_container && candidate) {
                var can = _currentInstance.getDOMElement(candidate);
                if (can.offsetParent) _currentInstance.setContainer(can.offsetParent);
            }
        };

        var _getContainerFromDefaults = function() {
            if (_currentInstance.Defaults.Container)
                _currentInstance.setContainer(_currentInstance.Defaults.Container);
        };

        // check if a given element is managed or not. if not, add to our map. if drawing is not suspended then
        // we'll also stash its dimensions; otherwise we'll do this in a lazy way through updateOffset.
        // TODO make sure we add a test that this tracks a setId call.
        var _manage = _currentInstance.manage = function(id, element) {
            if (!managedElements[id]) {
                managedElements[id] = {
                    el: element,
                    endpoints: [],
                    connections: []
                };

                managedElements[id].info = _updateOffset({
                    elId: id,
                    timestamp: _suspendedAt
                });

                /*   if (!_suspendDrawing) {
                       managedElements[id].info = _updateOffset({ elId: id, timestamp: _suspendedAt });
                   }*/
            }

            return managedElements[id];
        };

        var _unmanage = function(id) {
            delete managedElements[id];
        };

        /**
         * updates the offset and size for a given element, and stores the
         * values. if 'offset' is not null we use that (it would have been
         * passed in from a drag call) because it's faster; but if it is null,
         * or if 'recalc' is true in order to force a recalculation, we get the current values.
         */
        var _updateOffset = this.updateOffset = function(params) {

            var timestamp = params.timestamp,
                recalc = params.recalc,
                offset = params.offset,
                elId = params.elId,
                s;
            if (_suspendDrawing && !timestamp) timestamp = _suspendedAt;
            if (!recalc) {
                if (timestamp && timestamp === offsetTimestamps[elId]) {
                    return {
                        o: params.offset || offsets[elId],
                        s: sizes[elId]
                    };
                }
            }
            if (recalc || (!offset && offsets[elId] === null)) { // if forced repaint or no offset available, we recalculate.

                // get the current size and offset, and store them
                s = managedElements[elId] ? managedElements[elId].el : null;
                if (s !== null) {
                    sizes[elId] = _currentInstance.getSize(s);
                    offsets[elId] = _getOffset(s, _currentInstance);
                    offsetTimestamps[elId] = timestamp;
                }
            } else {
                offsets[elId] = offset || offsets[elId];
                if (sizes[elId] === null) {
                    //s = document.getElementById(elId);
                    s = managedElements[elId].el;
                    if (s !== null) sizes[elId] = _currentInstance.getSize(s);
                }
                offsetTimestamps[elId] = timestamp;
            }

            if (offsets[elId] && !offsets[elId].right) {
                offsets[elId].right = offsets[elId].left + sizes[elId][0];
                offsets[elId].bottom = offsets[elId].top + sizes[elId][1];
                offsets[elId].width = sizes[elId][0];
                offsets[elId].height = sizes[elId][1];
                offsets[elId].centerx = offsets[elId].left + (offsets[elId].width / 2);
                offsets[elId].centery = offsets[elId].top + (offsets[elId].height / 2);
            }

            return {
                o: offsets[elId],
                s: sizes[elId]
            };
        };

        /**
         * callback from the current library to tell us to prepare ourselves (attach
         * mouse listeners etc; can't do that until the library has provided a bind method)
         */
        this.init = function() {
            var _oneType = function(renderer, name, fn) {
                global.jsPlumb.Connectors[renderer][name] = function() {
                    fn.apply(this, arguments);
                    global.jsPlumb.ConnectorRenderers[renderer].apply(this, arguments);
                };
                global.jsPlumbUtil.extend(global.jsPlumb.Connectors[renderer][name], [fn, global.jsPlumb.ConnectorRenderers[renderer]]);
            };

            if (!global.jsPlumb.connectorsInitialized) {
                for (var i = 0; i < connectorTypes.length; i++) {
                    for (var j = 0; j < rendererTypes.length; j++) {
                        _oneType(rendererTypes[j], connectorTypes[i][1], connectorTypes[i][0]);
                    }

                }
                global.jsPlumb.connectorsInitialized = true;
            }

            if (!initialized) {
                _getContainerFromDefaults();
                _currentInstance.anchorManager = new global.jsPlumb.AnchorManager({
                    jsPlumbInstance: _currentInstance
                });
                _currentInstance.setRenderMode(_currentInstance.Defaults.RenderMode); // calling the method forces the capability logic to be run.														
                initialized = true;
                _currentInstance.fire("ready", _currentInstance);
            }
        }.bind(this);

        this.log = log;
        this.jsPlumbUIComponent = jsPlumbUIComponent;

        /*
         * Creates an anchor with the given params.
         *
         *
         * Returns: The newly created Anchor.
         * Throws: an error if a named anchor was not found.
         */
        this.makeAnchor = function() {
            var pp, _a = function(t, p) {
                if (global.jsPlumb.Anchors[t]) return new global.jsPlumb.Anchors[t](p);
                if (!_currentInstance.Defaults.DoNotThrowErrors)
                    throw {
                        msg: "jsPlumb: unknown anchor type '" + t + "'"
                    };
            };
            if (arguments.length === 0) return null;
            var specimen = arguments[0],
                elementId = arguments[1],
                jsPlumbInstance = arguments[2],
                newAnchor = null;
            // if it appears to be an anchor already...
            if (specimen.compute && specimen.getOrientation) return specimen; //TODO hazy here about whether it should be added or is already added somehow.
            // is it the name of an anchor type?
            else if (typeof specimen == "string") {
                newAnchor = _a(arguments[0], {
                    elementId: elementId,
                    jsPlumbInstance: _currentInstance
                });
            }
            // is it an array? it will be one of:
            // 		an array of [spec, params] - this defines a single anchor, which may be dynamic, but has parameters.
            //		an array of arrays - this defines some dynamic anchors
            //		an array of numbers - this defines a single anchor.				
            else if (_ju.isArray(specimen)) {
                if (_ju.isArray(specimen[0]) || _ju.isString(specimen[0])) {
                    // if [spec, params] format
                    if (specimen.length == 2 && _ju.isObject(specimen[1])) {
                        // if first arg is a string, its a named anchor with params
                        if (_ju.isString(specimen[0])) {
                            pp = global.jsPlumb.extend({
                                elementId: elementId,
                                jsPlumbInstance: _currentInstance
                            }, specimen[1]);
                            newAnchor = _a(specimen[0], pp);
                        }
                        // otherwise first arg is array, second is params. we treat as a dynamic anchor, which is fine
                        // even if the first arg has only one entry. you could argue all anchors should be implicitly dynamic in fact.
                        else {
                            pp = global.jsPlumb.extend({
                                elementId: elementId,
                                jsPlumbInstance: _currentInstance,
                                anchors: specimen[0]
                            }, specimen[1]);
                            newAnchor = new global.jsPlumb.DynamicAnchor(pp);
                        }
                    } else
                        newAnchor = new global.jsPlumb.DynamicAnchor({
                            anchors: specimen,
                            selector: null,
                            elementId: elementId,
                            jsPlumbInstance: _currentInstance
                        });

                } else {
                    var anchorParams = {
                        x: specimen[0],
                        y: specimen[1],
                        orientation: (specimen.length >= 4) ? [specimen[2], specimen[3]] : [0, 0],
                        offsets: (specimen.length >= 6) ? [specimen[4], specimen[5]] : [0, 0],
                        elementId: elementId,
                        jsPlumbInstance: _currentInstance,
                        cssClass: specimen.length == 7 ? specimen[6] : null
                    };
                    newAnchor = new global.jsPlumb.Anchor(anchorParams);
                    newAnchor.clone = function() {
                        return new global.jsPlumb.Anchor(anchorParams);
                    };
                }
            }

            if (!newAnchor.id) newAnchor.id = "anchor_" + _idstamp();
            return newAnchor;
        };

        /**
         * makes a list of anchors from the given list of types or coords, eg
         * ["TopCenter", "RightMiddle", "BottomCenter", [0, 1, -1, -1] ]
         */
        this.makeAnchors = function(types, elementId, jsPlumbInstance) {
            var r = [];
            for (var i = 0, ii = types.length; i < ii; i++) {
                if (typeof types[i] == "string")
                    r.push(global.jsPlumb.Anchors[types[i]]({
                        elementId: elementId,
                        jsPlumbInstance: jsPlumbInstance
                    }));
                else if (_ju.isArray(types[i]))
                    r.push(_currentInstance.makeAnchor(types[i], elementId, jsPlumbInstance));
            }
            return r;
        };

        /**
         * Makes a dynamic anchor from the given list of anchors (which may be in shorthand notation as strings or dimension arrays, or Anchor
         * objects themselves) and the given, optional, anchorSelector function (jsPlumb uses a default if this is not provided; most people will
         * not need to provide this - i think).
         */
        this.makeDynamicAnchor = function(anchors, anchorSelector) {
            return new global.jsPlumb.DynamicAnchor({
                anchors: anchors,
                selector: anchorSelector,
                elementId: null,
                jsPlumbInstance: _currentInstance
            });
        };

        // --------------------- makeSource/makeTarget ---------------------------------------------- 

        this.targetEndpointDefinitions = {};
        var _setEndpointPaintStylesAndAnchor = function(ep, epIndex, _instance) {
            ep.paintStyle = ep.paintStyle ||
                _instance.Defaults.EndpointStyles[epIndex] ||
                _instance.Defaults.EndpointStyle;

            ep.hoverPaintStyle = ep.hoverPaintStyle ||
                _instance.Defaults.EndpointHoverStyles[epIndex] ||
                _instance.Defaults.EndpointHoverStyle;

            ep.anchor = ep.anchor ||
                _instance.Defaults.Anchors[epIndex] ||
                _instance.Defaults.Anchor;

            ep.endpoint = ep.endpoint ||
                _instance.Defaults.Endpoints[epIndex] ||
                _instance.Defaults.Endpoint;
        };

        // TODO put all the source stuff inside one parent, keyed by id.
        this.sourceEndpointDefinitions = {};

        var selectorFilter = function(evt, _el, selector, _instance, negate) {
            var t = evt.target || evt.srcElement,
                ok = false,
                sel = _instance.getSelector(_el, selector);
            for (var j = 0; j < sel.length; j++) {
                if (sel[j] == t) {
                    ok = true;
                    break;
                }
            }
            return negate ? !ok : ok;
        };


        //this.

        // see API docs
        this.makeTarget = function(el, params, referenceParams) {

            // put jsplumb ref into params without altering the params passed in
            var p = global.jsPlumb.extend({
                _jsPlumb: this
            }, referenceParams);
            global.jsPlumb.extend(p, params);

            // calculate appropriate paint styles and anchor from the params given
            _setEndpointPaintStylesAndAnchor(p, 1, this);

            var targetScope = p.scope || _currentInstance.Defaults.Scope,
                deleteEndpointsOnDetach = !(p.deleteEndpointsOnDetach === false),
                maxConnections = p.maxConnections || -1,
                onMaxConnections = p.onMaxConnections,

                _doOne = function(el) {

                    // get the element's id and store the endpoint definition for it.  global.jsPlumb.connect calls will look for one of these,
                    // and use the endpoint definition if found.
                    // decode the info for this element (id and element)
                    var elInfo = _info(el),
                        elid = elInfo.id,
                        proxyComponent = new jsPlumbUIComponent(p),
                        dropOptions = global.jsPlumb.extend({}, p.dropOptions || {});

                    _ensureContainer(elid);

                    // store the definitions keyed against the element id.
                    // TODO why not just store inside the element itself?
                    var _def = {
                        def: p,
                        uniqueEndpoint: p.uniqueEndpoint,
                        maxConnections: maxConnections,
                        enabled: true
                    };
                    elInfo.el._jsPlumbTarget = _def;

                    this.targetEndpointDefinitions[elid] = _def;


                    var _drop = p._jsPlumb.EndpointDropHandler({
                        //endpoint:_ep,
                        jsPlumb: _currentInstance,
                        enabled: function() {
                            return elInfo.el._jsPlumbTarget.enabled;
                        },
                        isFull: function(originalEvent) {
                            var targetCount = _currentInstance.select({
                                target: elid
                            }).length;
                            var def = elInfo.el._jsPlumbTarget;
                            var full = def.maxConnections > 0 && targetCount >= def.maxConnections;
                            if (full && onMaxConnections) {
                                // TODO here we still have the id of the floating element, not the
                                // actual target.
                                onMaxConnections({
                                    element: elInfo.el,
                                    connection: jpc
                                }, originalEvent);
                            }
                            return full;
                        },
                        element: elInfo.el,
                        elementId: elid,
                        isSource: false,
                        isTarget: true,
                        addClass: function(clazz) {
                            //_ep.addClass(clazz)
                            _currentInstance.addClass(elInfo.el, clazz);
                        },
                        removeClass: function(clazz) {
                            //_ep.removeClass(clazz)
                            _currentInstance.removeClass(elInfo.el, clazz);
                        },
                        onDrop: function(jpc) {
                            var source = jpc.endpoints[0];
                            source.anchor.locked = false;
                        },
                        isDropAllowed: function() {
                            return proxyComponent.isDropAllowed.apply(proxyComponent, arguments);
                        },
                        getEndpoint: function(jpc) {
                            // make a new Endpoint for the target, or get it from the cache if uniqueEndpoint
                            // is set.
                            var _el = _currentInstance.getElementObject(elInfo.el),
                                def = elInfo.el._jsPlumbTarget,
                                newEndpoint = def.endpoint;

                            // if no cached endpoint, or there was one but it has been cleaned up
                            // (ie. detached), then create a new one.
                            if (newEndpoint === null || newEndpoint._jsPlumb === null)
                                newEndpoint = _currentInstance.addEndpoint(_el, p);

                            if (p.uniqueEndpoint) def.endpoint = newEndpoint; // may of course just store what it just pulled out. that's ok.
                            // TODO test options to makeTarget to see if we should do this?
                            newEndpoint._doNotDeleteOnDetach = false; // reset.
                            newEndpoint._deleteOnDetach = true;

                            // if connection is detachable, init the new endpoint to be draggable, to support that happening.
                            if (jpc.isDetachable())
                                newEndpoint.initDraggable();

                            // if the anchor has a 'positionFinder' set, then delegate to that function to find
                            // out where to locate the anchor.
                            if (newEndpoint.anchor.positionFinder !== null) {
                                var dropPosition = _currentInstance.getUIPosition(arguments, this.getZoom()),
                                    elPosition = _getOffset(_el, this),
                                    elSize = _currentInstance.getSize(_el),
                                    ap = newEndpoint.anchor.positionFinder(dropPosition, elPosition, elSize, newEndpoint.anchor.constructorParams);
                                newEndpoint.anchor.x = ap[0];
                                newEndpoint.anchor.y = ap[1];
                                // now figure an orientation for it..kind of hard to know what to do actually. probably the best thing i can do is to
                                // support specifying an orientation in the anchor's spec. if one is not supplied then i will make the orientation
                                // be what will cause the most natural link to the source: it will be pointing at the source, but it needs to be
                                // specified in one axis only, and so how to make that choice? i think i will use whichever axis is the one in which
                                // the target is furthest away from the source.
                            }

                            return newEndpoint;
                        }
                    });

                    // wrap drop events as needed and initialise droppable
                    var dropEvent = global.jsPlumb.dragEvents.drop;
                    dropOptions.scope = dropOptions.scope || targetScope;
                    dropOptions[dropEvent] = _ju.wrap(dropOptions[dropEvent], _drop);
                    // vanilla jsplumb only
                    if (p.allowLoopback === false) {
                        dropOptions.canDrop = function(_drag) {
                            var de = _drag.getDragElement()._jsPlumbRelatedElement;
                            return de != elInfo.el;
                        };
                    }
                    this.initDroppable(this.getElementObject(elInfo.el), dropOptions, "internal");
                }.bind(this);

            // make an array if only given one element
            var inputs = el.length && el.constructor != String ? el : [el];

            // register each one in the list.
            for (var i = 0, ii = inputs.length; i < ii; i++) {
                _doOne(inputs[i]);
            }

            return this;
        };

        // see api docs
        this.unmakeTarget = function(el, doNotClearArrays) {
            var info = _info(el);

            global.jsPlumb.destroyDroppable(info.el);
            // TODO this is not an exhaustive unmake of a target, since it does not remove the droppable stuff from
            // the element.  the effect will be to prevent it from behaving as a target, but it's not completely purged.
            if (!doNotClearArrays) {
                delete this.targetEndpointDefinitions[info.id];
            }

            return this;
        };

        // see api docs
        this.makeSource = function(el, params, referenceParams) {
            var p = global.jsPlumb.extend({}, referenceParams);
            global.jsPlumb.extend(p, params);
            _setEndpointPaintStylesAndAnchor(p, 0, this);
            var maxConnections = p.maxConnections || 1,
                onMaxConnections = p.onMaxConnections,
                _doOne = function(elInfo) {
                    // get the element's id and store the endpoint definition for it.  global.jsPlumb.connect calls will look for one of these,
                    // and use the endpoint definition if found.
                    var elid = elInfo.id,
                        _el = this.getElementObject(elInfo.el),
                        _del = this.getDOMElement(_el),
                        parentElement = function() {
                            return p.parent === null ? null : p.parent === "parent" ? elInfo.el.parentNode : _currentInstance.getDOMElement(p.parent);
                        },
                        idToRegisterAgainst = p.parent !== null ? this.getId(parentElement()) : elid;

                    _ensureContainer(idToRegisterAgainst);

                    this.sourceEndpointDefinitions[idToRegisterAgainst] = {
                        def: p,
                        uniqueEndpoint: p.uniqueEndpoint,
                        maxConnections: maxConnections,
                        enabled: true
                    };
                    var stopEvent = global.jsPlumb.dragEvents.stop,
                        dragEvent = global.jsPlumb.dragEvents.drag,
                        dragOptions = global.jsPlumb.extend({}, p.dragOptions || {}),
                        existingDrag = dragOptions.drag,
                        existingStop = dragOptions.stop,
                        ep = null,
                        endpointAddedButNoDragYet = false;

                    // set scope if its not set in dragOptions but was passed in in params
                    dragOptions.scope = dragOptions.scope || p.scope;

                    dragOptions[dragEvent] = _ju.wrap(dragOptions[dragEvent], function() {
                        if (existingDrag) existingDrag.apply(this, arguments);
                        endpointAddedButNoDragYet = false;
                    });

                    dragOptions[stopEvent] = _ju.wrap(dragOptions[stopEvent], function() {

                        if (existingStop) existingStop.apply(this, arguments);
                        this.currentlyDragging = false;
                        if (ep._jsPlumb !== null) { // if not cleaned up...

                            // reset the anchor to the anchor that was initially provided. the one we were using to drag
                            // the connection was just a placeholder that was located at the place the user pressed the
                            // mouse button to initiate the drag.
                            var anchorDef = p.anchor || this.Defaults.Anchor,
                                oldAnchor = ep.anchor,
                                oldConnection = ep.connections[0],
                                newAnchor = this.makeAnchor(anchorDef, elid, this),
                                _el = ep.element;

                            // if the anchor has a 'positionFinder' set, then delegate to that function to find
                            // out where to locate the anchor. issue 117.
                            if (newAnchor.positionFinder !== null) {
                                var elPosition = _getOffset(_el, this),
                                    elSize = this.getSize(_el),
                                    dropPosition = {
                                        left: elPosition.left + (oldAnchor.x * elSize[0]),
                                        top: elPosition.top + (oldAnchor.y * elSize[1])
                                    },
                                    ap = newAnchor.positionFinder(dropPosition, elPosition, elSize, newAnchor.constructorParams);

                                newAnchor.x = ap[0];
                                newAnchor.y = ap[1];
                            }

                            ep.setAnchor(newAnchor, true);

                            if (p.parent) {
                                var parent = parentElement();
                                if (parent) {
                                    var potentialParent = p.container || _container;
                                    ep.setElement(parent, potentialParent);
                                }
                            }

                            ep.repaint();
                            this.repaint(ep.elementId);
                            this.repaint(oldConnection.targetId);
                        }
                    }.bind(this));

                    // when the user presses the mouse, add an Endpoint, if we are enabled.
                    var mouseDownListener = function(e) {
                        var evt = this.getOriginalEvent(e);
                        // on right mouse button, abort.
                        if (e.which === 3 || e.button === 2) return;

                        var def = this.sourceEndpointDefinitions[idToRegisterAgainst];
                        elid = this.getId(this.getDOMElement(_el)); // elid might have changed since this method was called to configure the element.

                        // if disabled, return.
                        if (!def.enabled) return;

                        // if a filter was given, run it, and return if it says no.
                        if (p.filter) {
                            var r = global.jsPlumbUtil.isString(p.filter) ? selectorFilter(evt, _el, p.filter, this, p.filterExclude) : p.filter(evt, _el);
                            if (r === false) return;
                        }

                        // if maxConnections reached
                        var sourceCount = this.select({
                            source: idToRegisterAgainst
                        }).length;
                        if (def.maxConnections >= 0 && (def.uniqueEndpoint && sourceCount >= def.maxConnections)) {
                            if (onMaxConnections) {
                                onMaxConnections({
                                    element: _el,
                                    maxConnections: maxConnections
                                }, e);
                            }
                            return false;
                        }

                        // find the position on the element at which the mouse was pressed; this is where the endpoint 
                        // will be located.
                        var elxy = global.jsPlumbAdapter.getPositionOnElement(evt, _del, _zoom),
                            pelxy = elxy;

                        // we need to override the anchor in here, and force 'isSource', but we don't want to mess with
                        // the params passed in, because after a connection is established we're going to reset the endpoint
                        // to have the anchor we were given.
                        var tempEndpointParams = {};
                        global.jsPlumb.extend(tempEndpointParams, p);
                        tempEndpointParams.isTemporarySource = true;
                        tempEndpointParams.anchor = [elxy[0], elxy[1], 0, 0];
                        tempEndpointParams.dragOptions = dragOptions;

                        ep = this.addEndpoint(elid, tempEndpointParams);
                        endpointAddedButNoDragYet = true;
                        ep.endpointWillMoveTo = p.parent ? parentElement() : null;

                        // if unique endpoint and it's already been created, push it onto the endpoint we create. at the end
                        // of a successful connection we'll switch to that endpoint.
                        //if (def.uniqueEndpoint && def.endpoint) ep.finalEndpoint = def.endpoint;
                        if (def.uniqueEndpoint) {
                            if (!def.endpoint)
                                def.endpoint = ep;
                            else
                                ep.finalEndpoint = def.endpoint;
                        }

                        // TODO test options to makeSource to see if we should do this?
                        ep._doNotDeleteOnDetach = false; // reset.
                        ep._deleteOnDetach = true;

                        var _delTempEndpoint = function() {
                            // this mouseup event is fired only if no dragging occurred, by jquery and yui, but for mootools
                            // it is fired even if dragging has occurred, in which case we would blow away a perfectly
                            // legitimate endpoint, were it not for this check.  the flag is set after adding an
                            // endpoint and cleared in a drag listener we set in the dragOptions above.
                            _currentInstance.off(ep.canvas, "mouseup", _delTempEndpoint);
                            _currentInstance.off(_el, "mouseup", _delTempEndpoint);
                            if (endpointAddedButNoDragYet) {
                                endpointAddedButNoDragYet = false;
                                _currentInstance.deleteEndpoint(ep);
                            }
                        };

                        _currentInstance.on(ep.canvas, "mouseup", _delTempEndpoint);
                        _currentInstance.on(_el, "mouseup", _delTempEndpoint);

                        // and then trigger its mousedown event, which will kick off a drag, which will start dragging
                        // a new connection from this endpoint.
                        _currentInstance.trigger(ep.canvas, "mousedown", e);

                        global.jsPlumbUtil.consume(e);

                    }.bind(this);

                    this.on(_el, "mousedown", mouseDownListener);
                    this.sourceEndpointDefinitions[idToRegisterAgainst].trigger = mouseDownListener;

                    // lastly, if a filter was provided, set it as a dragFilter on the element,
                    // to prevent the element drag function from kicking in when we want to
                    // drag a new connection
                    if (p.filter && global.jsPlumbUtil.isString(p.filter)) {
                        _currentInstance.setDragFilter(_el, p.filter);
                    }
                }.bind(this);

            var inputs = el.length && el.constructor != String ? el : [el];
            for (var i = 0, ii = inputs.length; i < ii; i++) {
                _doOne(_info(inputs[i]));
            }

            return this;
        };

        // see api docs		
        this.unmakeSource = function(el, doNotClearArrays) {
            var info = _info(el),
                mouseDownListener = this.sourceEndpointDefinitions[info.id].trigger;

            if (mouseDownListener)
                _currentInstance.off(info.el, "mousedown", mouseDownListener);

            if (!doNotClearArrays) {
                delete this.sourceEndpointDefinitions[info.id];
            }

            return this;
        };

        // see api docs
        this.unmakeEverySource = function() {
            for (var i in this.sourceEndpointDefinitions)
                _currentInstance.unmakeSource(i, true);

            this.sourceEndpointDefinitions = {};
            return this;
        };

        var _getScope = function(el, types) {
            types = global.jsPlumbUtil.isArray(types) ? types : [types];
            var id = _getId(el);
            for (var i = 0; i < types.length; i++) {
                var def = this[types[i]][id];
                if (def) return def.def.scope || this.Defaults.Scope;
            }
        }.bind(this);

        var _setScope = function(el, scope, types) {
            types = global.jsPlumbUtil.isArray(types) ? types : [types];
            var id = _getId(el);
            for (var i = 0; i < types.length; i++) {
                var def = this[types[i]][id];
                if (def) {
                    def.def.scope = scope;
                    if (this.scopeChange !== null) this.scopeChange(el, id, endpointsByElement[id], scope, types[i]);
                }
            }

        }.bind(this);

        this.getScope = function(el, scope) {
            return _getScope(el, ["sourceEndpointDefinitions", "targetEndpointDefinitions"]);
        };
        this.getSourceScope = function(el) {
            return _getScope(el, "sourceEndpointDefinitions");
        };
        this.getTargetScope = function(el) {
            return _getScope(el, "targetEndpointDefinitions");
        };
        this.setScope = function(el, scope) {
            _setScope(el, scope, ["sourceEndpointDefinitions", "targetEndpointDefinitions"]);
        };
        this.setSourceScope = function(el, scope) {
            _setScope(el, scope, "sourceEndpointDefinitions");
        };
        this.setTargetScope = function(el, scope) {
            _setScope(el, scope, "targetEndpointDefinitions");
        };

        // see api docs
        this.unmakeEveryTarget = function() {
            for (var i in this.targetEndpointDefinitions)
                _currentInstance.unmakeTarget(i, true);

            this.targetEndpointDefinitions = {};
            return this;
        };

        // does the work of setting a source enabled or disabled.
        var _setEnabled = function(type, el, state, toggle) {
            var a = type == "source" ? this.sourceEndpointDefinitions : this.targetEndpointDefinitions;

            if (_ju.isString(el)) a[el].enabled = toggle ? !a[el].enabled : state;
            else if (el.length) {
                for (var i = 0, ii = el.length; i < ii; i++) {
                    var info = _info(el[i]);
                    if (a[info.id])
                        a[info.id].enabled = toggle ? !a[info.id].enabled : state;
                }
            }
            // otherwise a DOM element
            else {
                var id = _info(el).id;
                a[id].enabled = toggle ? !a[id].enabled : state;
            }
            return this;
        }.bind(this);

        var _first = function(el, fn) {
            if (_ju.isString(el) || !el.length)
                return fn.apply(this, [el]);
            else if (el.length)
                return fn.apply(this, [el[0]]);

        }.bind(this);

        this.toggleSourceEnabled = function(el) {
            _setEnabled("source", el, null, true);
            return this.isSourceEnabled(el);
        };

        this.setSourceEnabled = function(el, state) {
            return _setEnabled("source", el, state);
        };
        this.isSource = function(el) {
            return _first(el, function(_el) {
                return this.sourceEndpointDefinitions[_info(_el).id] !== null;
            }.bind(this));
        };
        this.isSourceEnabled = function(el) {
            return _first(el, function(_el) {
                var sep = this.sourceEndpointDefinitions[_info(_el).id];
                return sep && sep.enabled === true;
            }.bind(this));
        };

        this.toggleTargetEnabled = function(el) {
            _setEnabled("target", el, null, true);
            return this.isTargetEnabled(el);
        };

        this.isTarget = function(el) {
            return _first(el, function(_el) {
                return this.targetEndpointDefinitions[_info(_el).id] !== null;
            }.bind(this));
        };
        this.isTargetEnabled = function(el) {
            return _first(el, function(_el) {
                var tep = this.targetEndpointDefinitions[_info(_el).id];
                return tep && tep.enabled === true;
            }.bind(this));
        };
        this.setTargetEnabled = function(el, state) {
            return _setEnabled("target", el, state);
        };

        // --------------------- end makeSource/makeTarget ---------------------------------------------- 				

        this.ready = function(fn) {
            _currentInstance.bind("ready", fn);
        };

        // repaint some element's endpoints and connections
        this.repaint = function(el, ui, timestamp) {
            // support both lists...
            if (typeof el == 'object' && el.length)
                for (var i = 0, ii = el.length; i < ii; i++) {
                    _draw(el[i], ui, timestamp);
                } else // ...and single strings.
                    _draw(el, ui, timestamp);

            return _currentInstance;
        };

        this.revalidate = function(el) {
            var elId = _currentInstance.getId(el);
            _currentInstance.updateOffset({
                elId: elId,
                recalc: true
            });
            return _currentInstance.repaint(el);
        };

        // repaint every endpoint and connection.
        this.repaintEverything = function(clearEdits) {
            // TODO this timestamp causes continuous anchors to not repaint properly.
            // fix this. do not just take out the timestamp. it runs a lot faster with 
            // the timestamp included.
            //var timestamp = null;
            var timestamp = _timestamp(),
                elId;

            for (elId in endpointsByElement) {
                _currentInstance.updateOffset({
                    elId: elId,
                    recalc: true,
                    timestamp: timestamp
                });
            }

            for (elId in endpointsByElement) {
                _draw(elId, null, timestamp, clearEdits);
            }
            return this;
        };

        this.removeAllEndpoints = function(el, recurse) {
            var _one = function(_el) {
                var info = _info(_el),
                    ebe = endpointsByElement[info.id],
                    i, ii;

                if (ebe) {
                    for (i = 0, ii = ebe.length; i < ii; i++)
                        _currentInstance.deleteEndpoint(ebe[i]);
                }
                delete endpointsByElement[info.id];

                if (recurse) {
                    if (info.el && info.el.nodeType != 3 && info.el.nodeType != 8) {
                        for (i = 0, ii = info.el.childNodes.length; i < ii; i++) {
                            _one(info.el.childNodes[i]);
                        }
                    }
                }

            };
            _one(el);
            return this;
        };

        /**
         * Remove the given element, including cleaning up all endpoints registered for it.
         * This is exposed in the public API but also used internally by jsPlumb when removing the
         * element associated with a connection drag.
         */
        this.remove = function(el, doNotRepaint) {
            var info = _info(el);
            _currentInstance.doWhileSuspended(function() {
                _currentInstance.removeAllEndpoints(info.id, true);
                _currentInstance.dragManager.elementRemoved(info.id);
                delete _currentInstance.floatingConnections[info.id];
                _currentInstance.anchorManager.clearFor(info.id);
                _currentInstance.anchorManager.removeFloatingConnection(info.id);
            }, doNotRepaint === false);
            _unmanage(info.id);
            if (info.el) {
                _currentInstance.removeElement(info.el);
                info.el._jsPlumb = null;
            }
            return _currentInstance;
        };

        this.reset = function() {
            _currentInstance.setSuspendEvents(true);
            _currentInstance.deleteEveryEndpoint();
            _currentInstance.unbind();
            this.targetEndpointDefinitions = {};
            this.sourceEndpointDefinitions = {};
            connections.length = 0;
            _currentInstance.setSuspendEvents(false);
        };

        var _clearObject = function(obj) {
            if (obj.canvas && obj.canvas.parentNode)
                obj.canvas.parentNode.removeChild(obj.canvas);
            obj.cleanup();
            obj.destroy();
        };

        var _clearOverlayObject = function(obj) {
            _clearObject(obj);
        };

        this.clear = function() {
            _currentInstance.select().each(_clearOverlayObject);
            _currentInstance.selectEndpoints().each(_clearOverlayObject);

            endpointsByElement = {};
            endpointsByUUID = {};
        };

        this.setDefaultScope = function(scope) {
            DEFAULT_SCOPE = scope;
            return _currentInstance;
        };

        // sets whether or not some element should be currently draggable.
        this.setDraggable = _setDraggable;

        // sets the id of some element, changing whatever we need to to keep track.
        this.setId = function(el, newId, doNotSetAttribute) {
            // 
            var id;

            if (global.jsPlumbUtil.isString(el)) {
                id = el;
            } else {
                el = this.getDOMElement(el);
                id = this.getId(el);
            }

            var sConns = this.getConnections({
                    source: id,
                    scope: '*'
                }, true),
                tConns = this.getConnections({
                    target: id,
                    scope: '*'
                }, true);

            newId = "" + newId;

            if (!doNotSetAttribute) {
                el = this.getDOMElement(id);
                this.setAttribute(el, "id", newId);
            } else
                el = this.getDOMElement(newId);

            endpointsByElement[newId] = endpointsByElement[id] || [];
            for (var i = 0, ii = endpointsByElement[newId].length; i < ii; i++) {
                endpointsByElement[newId][i].setElementId(newId);
                endpointsByElement[newId][i].setReferenceElement(el);
            }
            delete endpointsByElement[id];

            this.anchorManager.changeId(id, newId);
            if (this.dragManager) this.dragManager.changeId(id, newId);
            managedElements[newId] = managedElements[id];
            delete managedElements[id];

            var _conns = function(list, epIdx, type) {
                for (var i = 0, ii = list.length; i < ii; i++) {
                    list[i].endpoints[epIdx].setElementId(newId);
                    list[i].endpoints[epIdx].setReferenceElement(el);
                    list[i][type + "Id"] = newId;
                    list[i][type] = el;
                }
            };
            _conns(sConns, 0, "source");
            _conns(tConns, 1, "target");

            this.repaint(newId);
        };

        this.setDebugLog = function(debugLog) {
            log = debugLog;
        };

        this.setSuspendDrawing = function(val, repaintAfterwards) {
            var curVal = _suspendDrawing;
            _suspendDrawing = val;
            if (val) _suspendedAt = new Date().getTime();
            else _suspendedAt = null;
            if (repaintAfterwards) this.repaintEverything();
            return curVal;
        };

        // returns whether or not drawing is currently suspended.
        this.isSuspendDrawing = function() {
            return _suspendDrawing;
        };

        // return timestamp for when drawing was suspended.
        this.getSuspendedAt = function() {
            return _suspendedAt;
        };

        this.doWhileSuspended = function(fn, doNotRepaintAfterwards) {
            var _wasSuspended = this.isSuspendDrawing();
            if (!_wasSuspended)
                this.setSuspendDrawing(true);
            try {
                fn();
            } catch (e) {
                _ju.log("Function run while suspended failed", e);
            }
            if (!_wasSuspended)
                this.setSuspendDrawing(false, !doNotRepaintAfterwards);
        };

        this.getOffset = function(elId) {
            return offsets[elId];
        };
        this.getCachedData = _getCachedData;
        this.timestamp = _timestamp;
        this.setRenderMode = function(mode) {
            if (mode !== global.jsPlumb.SVG && mode !== global.jsPlumb.VML) throw new TypeError("Render mode [" + mode + "] not supported");
            renderMode = global.jsPlumbAdapter.setRenderMode(mode);
            return renderMode;
        };
        this.getRenderMode = function() {
            return renderMode;
        };
        this.show = function(el, changeEndpoints) {
            _setVisible(el, "block", changeEndpoints);
            return _currentInstance;
        };

        // TODO: update this method to return the current state.
        this.toggleVisible = _toggleVisible;
        this.toggleDraggable = _toggleDraggable;
        this.addListener = this.bind;

        if (!global.jsPlumbAdapter.headless) {
            _currentInstance.dragManager = global.jsPlumbAdapter.getDragManager(_currentInstance);
            _currentInstance.recalculateOffsets = _currentInstance.dragManager.updateOffsets;
        }
    };

    global.jsPlumbUtil.extend(jsPlumbInstance, global.jsPlumbUtil.EventGenerator, {
        setAttribute: function(el, a, v) {
            this.setAttribute(el, a, v);
        },
        getAttribute: function(el, a) {
            return this.getAttribute(global.jsPlumb.getDOMElement(el), a);
        },
        registerConnectionType: function(id, type) {
            this._connectionTypes[id] = global.jsPlumb.extend({}, type);
        },
        registerConnectionTypes: function(types) {
            for (var i in types)
                this._connectionTypes[i] = global.jsPlumb.extend({}, types[i]);
        },
        registerEndpointType: function(id, type) {
            this._endpointTypes[id] = global.jsPlumb.extend({}, type);
        },
        registerEndpointTypes: function(types) {
            for (var i in types)
                this._endpointTypes[i] = global.jsPlumb.extend({}, types[i]);
        },
        getType: function(id, typeDescriptor) {
            return typeDescriptor === "connection" ? this._connectionTypes[id] : this._endpointTypes[id];
        },
        setIdChanged: function(oldId, newId) {
            this.setId(oldId, newId, true);
        },
        // set parent: change the parent for some node and update all the registrations we need to.
        setParent: function(el, newParent) {
            var _el = this.getElementObject(el),
                _dom = this.getDOMElement(_el),
                _id = this.getId(_dom),
                _pel = this.getElementObject(newParent),
                _pdom = this.getDOMElement(_pel),
                _pid = this.getId(_pdom);

            _dom.parentNode.removeChild(_dom);
            _pdom.appendChild(_dom);
            this.dragManager.setParent(_el, _id, _pel, _pid);
        },
        /**
         * gets the size for the element, in an array : [ width, height ].
         */
        getSize: function(el) {
            return [el.offsetWidth, el.offsetHeight];
        },
        getWidth: function(el) {
            return el.offsetWidth;
        },
        getHeight: function(el) {
            return el.offsetHeight;
        },
        extend: function(o1, o2, names) {
            var i;
            if (names) {
                for (i = 0; i < names.length; i++)
                    o1[names[i]] = o2[names[i]];
            } else
                for (i in o2) o1[i] = o2[i];
            return o1;
        },
        floatingConnections: {},
        getFloatingAnchorIndex: function(jpc) {
            return jpc.endpoints[0].isFloating() ? 0 : 1;
        }
    }, global.jsPlumbAdapter);

    global.jsPlumb = new global.jsPlumbInstance();
    global.jsPlumb.getInstance = function(_defaults) {
        var j = new global.jsPlumbInstance(_defaults);
        j.init();
        return j;
    };
})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains the code for Endpoints.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {

    "use strict";

    // create the drag handler for a connection
    var _makeConnectionDragHandler = function(placeholder, _jsPlumb) {
        var stopped = false;
        return {
            drag: function() {
                if (stopped) {
                    stopped = false;
                    return true;
                }
                var _ui = global.jsPlumb.getUIPosition(arguments, _jsPlumb.getZoom());

                if (placeholder.element) {
                    global.jsPlumbAdapter.setPosition(placeholder.element, _ui);
                    _jsPlumb.repaint(placeholder.element, _ui);
                }
            },
            stopDrag: function() {
                stopped = true;
            }
        };
    };

    // creates a placeholder div for dragging purposes, adds it to the DOM, and pre-computes its offset.    
    var _makeDraggablePlaceholder = function(placeholder, _jsPlumb) {
        var n = document.createElement("div");
        n.style.position = "absolute";
        var parent = _jsPlumb.getContainer() || document.body;
        parent.appendChild(n);
        var id = _jsPlumb.getId(n);
        //_jsPlumb.updateOffset( { elId : id });
        _jsPlumb.manage(id, n);
        // create and assign an id, and initialize the offset.
        placeholder.id = id;
        placeholder.element = n;
    };

    // create a floating endpoint (for drag connections)
    var _makeFloatingEndpoint = function(paintStyle, referenceAnchor, endpoint, referenceCanvas, sourceElement, _jsPlumb, _newEndpoint, scope) {
        var floatingAnchor = new global.jsPlumb.FloatingAnchor({
            reference: referenceAnchor,
            referenceCanvas: referenceCanvas,
            jsPlumbInstance: _jsPlumb
        });
        //setting the scope here should not be the way to fix that mootools issue.  it should be fixed by not
        // adding the floating endpoint as a droppable.  that makes more sense anyway!
        return _newEndpoint({
            paintStyle: paintStyle,
            endpoint: endpoint,
            anchor: floatingAnchor,
            source: sourceElement,
            scope: scope
        });
    };

    var typeParameters = ["connectorStyle", "connectorHoverStyle", "connectorOverlays",
        "connector", "connectionType", "connectorClass", "connectorHoverClass"
    ];

    // a helper function that tries to find a connection to the given element, and returns it if so. if elementWithPrecedence is null,
    // or no connection to it is found, we return the first connection in our list.
    var findConnectionToUseForDynamicAnchor = function(ep, elementWithPrecedence) {
        var idx = 0;
        if (elementWithPrecedence !== null) {
            for (var i = 0; i < ep.connections.length; i++) {
                if (ep.connections[i].sourceId == elementWithPrecedence || ep.connections[i].targetId == elementWithPrecedence) {
                    idx = i;
                    break;
                }
            }
        }

        return ep.connections[idx];
    };

    var findConnectionIndex = function(conn, ep) {
        return global.jsPlumbUtil.findWithFunction(ep.connections, function(c) {
            return c.id == conn.id;
        });
    };

    global.jsPlumb.Endpoint = function(params) {
        var _jsPlumb = params._jsPlumb,
            _gel = global.jsPlumb.getElementObject,
            _ju = global.jsPlumbUtil,
            _newConnection = params.newConnection,
            _newEndpoint = params.newEndpoint,
            _finaliseConnection = params.finaliseConnection,
            _fireMoveEvent = params.fireMoveEvent;

        this.idPrefix = "_jsplumb_e_";
        this.defaultLabelLocation = [0.5, 0.5];
        this.defaultOverlayKeys = ["Overlays", "EndpointOverlays"];
        global.OverlayCapableJsPlumbUIComponent.apply(this, arguments);

        // TYPE		

        this.getDefaultType = function() {
            return {
                parameters: {},
                scope: null,
                maxConnections: this._jsPlumb.instance.Defaults.MaxConnections,
                paintStyle: this._jsPlumb.instance.Defaults.EndpointStyle || global.jsPlumb.Defaults.EndpointStyle,
                endpoint: this._jsPlumb.instance.Defaults.Endpoint || global.jsPlumb.Defaults.Endpoint,
                hoverPaintStyle: this._jsPlumb.instance.Defaults.EndpointHoverStyle || global.jsPlumb.Defaults.EndpointHoverStyle,
                overlays: this._jsPlumb.instance.Defaults.EndpointOverlays || global.jsPlumb.Defaults.EndpointOverlays,
                connectorStyle: params.connectorStyle,
                connectorHoverStyle: params.connectorHoverStyle,
                connectorClass: params.connectorClass,
                connectorHoverClass: params.connectorHoverClass,
                connectorOverlays: params.connectorOverlays,
                connector: params.connector,
                connectorTooltip: params.connectorTooltip
            };
        };

        // END TYPE

        this._jsPlumb.enabled = !(params.enabled === false);
        this._jsPlumb.visible = true;
        this.element = global.jsPlumb.getDOMElement(params.source);
        this._jsPlumb.uuid = params.uuid;
        this._jsPlumb.floatingEndpoint = null;
        var inPlaceCopy = null;
        if (this._jsPlumb.uuid) params.endpointsByUUID[this._jsPlumb.uuid] = this;
        this.elementId = params.elementId;

        this._jsPlumb.connectionCost = params.connectionCost;
        this._jsPlumb.connectionsDirected = params.connectionsDirected;
        this._jsPlumb.currentAnchorClass = "";
        this._jsPlumb.events = {};

        var _updateAnchorClass = function() {
            // stash old, get new
            var oldAnchorClass = this._jsPlumb.currentAnchorClass;
            this._jsPlumb.currentAnchorClass = this.anchor.getCssClass();
            // add and remove at the same time to reduce the number of reflows.
            global.jsPlumbAdapter.updateClasses(this.element, _jsPlumb.endpointAnchorClassPrefix + "_" + this._jsPlumb.currentAnchorClass, _jsPlumb.endpointAnchorClassPrefix + "_" + oldAnchorClass);
            this.updateClasses(_jsPlumb.endpointAnchorClassPrefix + "_" + this._jsPlumb.currentAnchorClass, _jsPlumb.endpointAnchorClassPrefix + "_" + oldAnchorClass);
        }.bind(this);

        this.setAnchor = function(anchorParams, doNotRepaint) {
            this._jsPlumb.instance.continuousAnchorFactory.clear(this.elementId);
            this.anchor = this._jsPlumb.instance.makeAnchor(anchorParams, this.elementId, _jsPlumb);
            _updateAnchorClass();
            this.anchor.bind("anchorChanged", function(currentAnchor) {
                this.fire("anchorChanged", {
                    endpoint: this,
                    anchor: currentAnchor
                });
                _updateAnchorClass();
            }.bind(this));
            if (!doNotRepaint)
                this._jsPlumb.instance.repaint(this.elementId);
            return this;
        };

        var anchorParamsToUse = params.anchor ? params.anchor : params.anchors ? params.anchors : (_jsPlumb.Defaults.Anchor || "Top");
        this.setAnchor(anchorParamsToUse, true);

        var internalHover = function(state) {
            if (this.connections.length > 0) {
                for (var i = 0; i < this.connections.length; i++)
                    this.connections[i].setHover(state, false);
            } else
                this.setHover(state);
        }.bind(this);

        this.bind("mouseover", function() {
            internalHover(true);
        });
        this.bind("mouseout", function() {
            internalHover(false);
        });

        // ANCHOR MANAGER
        if (!params._transient) // in place copies, for example, are transient.  they will never need to be retrieved during a paint cycle, because they dont move, and then they are deleted.
            this._jsPlumb.instance.anchorManager.add(this, this.elementId);

        this.setEndpoint = function(ep) {

            if (this.endpoint !== null) {
                this.endpoint.cleanup();
                this.endpoint.destroy();
            }

            var _e = function(t, p) {
                var rm = _jsPlumb.getRenderMode();
                if (global.jsPlumb.Endpoints[rm][t]) return new global.jsPlumb.Endpoints[rm][t](p);
                if (!_jsPlumb.Defaults.DoNotThrowErrors)
                    throw {
                        msg: "jsPlumb: unknown endpoint type '" + t + "'"
                    };
            };

            var endpointArgs = {
                _jsPlumb: this._jsPlumb.instance,
                cssClass: params.cssClass,
                container: params.container,
                tooltip: params.tooltip,
                connectorTooltip: params.connectorTooltip,
                endpoint: this
            };

            if (_ju.isString(ep))
                this.endpoint = _e(ep, endpointArgs);
            else if (_ju.isArray(ep)) {
                endpointArgs = _ju.merge(ep[1], endpointArgs);
                this.endpoint = _e(ep[0], endpointArgs);
            } else {
                this.endpoint = ep.clone();
            }

            // assign a clone function using a copy of endpointArgs. this is used when a drag starts: the endpoint that was dragged is cloned,
            // and the clone is left in its place while the original one goes off on a magical journey. 
            // the copy is to get around a closure problem, in which endpointArgs ends up getting shared by
            // the whole world.
            //var argsForClone = global.jsPlumb.extend({}, endpointArgs);
            this.endpoint.clone = function() {
                // TODO this, and the code above, can be refactored to be more dry.
                if (_ju.isString(ep))
                    return _e(ep, endpointArgs);
                else if (_ju.isArray(ep)) {
                    endpointArgs = _ju.merge(ep[1], endpointArgs);
                    return _e(ep[0], endpointArgs);
                }
            }.bind(this);

            this.type = this.endpoint.type;
        };

        this.setEndpoint(params.endpoint || _jsPlumb.Defaults.Endpoint || global.jsPlumb.Defaults.Endpoint || "Dot");

        this.setPaintStyle(params.endpointStyle || params.paintStyle || params.style || _jsPlumb.Defaults.EndpointStyle || global.jsPlumb.Defaults.EndpointStyle, true);
        this.setHoverPaintStyle(params.endpointHoverStyle || params.hoverPaintStyle || _jsPlumb.Defaults.EndpointHoverStyle || global.jsPlumb.Defaults.EndpointHoverStyle, true);
        this._jsPlumb.paintStyleInUse = this.getPaintStyle();

        global.jsPlumb.extend(this, params, typeParameters);

        this.isSource = params.isSource || false;
        this.isTemporarySource = params.isTemporarySource || false;
        this.isTarget = params.isTarget || false;
        this._jsPlumb.maxConnections = params.maxConnections || _jsPlumb.Defaults.MaxConnections; // maximum number of connections this endpoint can be the source of.                
        this.canvas = this.endpoint.canvas;
        this.canvas._jsPlumb = this;

        // add anchor class (need to do this on construction because we set anchor first)
        this.addClass(_jsPlumb.endpointAnchorClassPrefix + "_" + this._jsPlumb.currentAnchorClass);
        global.jsPlumbAdapter.addClass(this.element, _jsPlumb.endpointAnchorClassPrefix + "_" + this._jsPlumb.currentAnchorClass);

        this.connections = params.connections || [];
        this.connectorPointerEvents = params["connector-pointer-events"];

        this.scope = params.scope || _jsPlumb.getDefaultScope();
        this.timestamp = null;
        this.reattachConnections = params.reattach || _jsPlumb.Defaults.ReattachConnections;
        this.connectionsDetachable = _jsPlumb.Defaults.ConnectionsDetachable;
        if (params.connectionsDetachable === false || params.detachable === false)
            this.connectionsDetachable = false;
        this.dragAllowedWhenFull = params.dragAllowedWhenFull !== false;

        if (params.onMaxConnections)
            this.bind("maxConnections", params.onMaxConnections);

        //
        // add a connection. not part of public API.
        //
        this.addConnection = function(connection) {
            this.connections.push(connection);
            this[(this.connections.length > 0 ? "add" : "remove") + "Class"](_jsPlumb.endpointConnectedClass);
            this[(this.isFull() ? "add" : "remove") + "Class"](_jsPlumb.endpointFullClass);
        };

        this.detachFromConnection = function(connection, idx, doNotCleanup) {
            idx = idx === null ? findConnectionIndex(connection, this) : idx;
            if (idx >= 0) {
                this.connections.splice(idx, 1);
                this[(this.connections.length > 0 ? "add" : "remove") + "Class"](_jsPlumb.endpointConnectedClass);
                this[(this.isFull() ? "add" : "remove") + "Class"](_jsPlumb.endpointFullClass);
            }

            if (!doNotCleanup && this._deleteOnDetach && this.connections.length === 0) {
                _jsPlumb.deleteObject({
                    endpoint: this,
                    fireEvent: false,
                    deleteAttachedObjects: false
                });
            }
        };

        this.detach = function(connection, ignoreTarget, forceDetach, fireEvent, originalEvent, endpointBeingDeleted, connectionIndex) {

            var idx = connectionIndex === null ? findConnectionIndex(connection, this) : connectionIndex,
                actuallyDetached = false;
            fireEvent = (fireEvent !== false);

            if (idx >= 0) {

                if (forceDetach || connection._forceDetach || (connection.isDetachable() && connection.isDetachAllowed(connection) && this.isDetachAllowed(connection) && _jsPlumb.checkCondition("beforeDetach", connection))) {

                    _jsPlumb.deleteObject({
                        connection: connection,
                        fireEvent: (!ignoreTarget && fireEvent),
                        originalEvent: originalEvent,
                        deleteAttachedObjects: false
                    });
                    actuallyDetached = true;
                }
            }
            return actuallyDetached;
        };

        this.detachAll = function(fireEvent, originalEvent) {
            while (this.connections.length > 0) {
                // TODO this could pass the index in to the detach method to save some time (index will always be zero in this while loop)
                this.detach(this.connections[0], false, true, fireEvent !== false, originalEvent, this, 0);
            }
            return this;
        };
        this.detachFrom = function(targetEndpoint, fireEvent, originalEvent) {
            var c = [];
            for (var i = 0; i < this.connections.length; i++) {
                if (this.connections[i].endpoints[1] == targetEndpoint || this.connections[i].endpoints[0] == targetEndpoint) {
                    c.push(this.connections[i]);
                }
            }
            for (var j = 0; j < c.length; j++) {
                this.detach(c[j], false, true, fireEvent, originalEvent);
            }
            return this;
        };

        this.getElement = function() {
            return this.element;
        };

        this.setElement = function(el) {
            var parentId = this._jsPlumb.instance.getId(el),
                curId = this.elementId;
            // remove the endpoint from the list for the current endpoint's element
            _ju.removeWithFunction(params.endpointsByElement[this.elementId], function(e) {
                return e.id == this.id;
            }.bind(this));
            this.element = global.jsPlumb.getDOMElement(el);
            this.elementId = _jsPlumb.getId(this.element);
            _jsPlumb.anchorManager.rehomeEndpoint(this, curId, this.element);
            _jsPlumb.dragManager.endpointAdded(this.element);
            _ju.addToList(params.endpointsByElement, parentId, this);
            return this;
        };

        /**
         * private but must be exposed.
         */
        this.makeInPlaceCopy = function() {
            var loc = this.anchor.getCurrentLocation({
                    element: this
                }),
                o = this.anchor.getOrientation(this),
                acc = this.anchor.getCssClass(),
                inPlaceAnchor = {
                    bind: function() {},
                    compute: function() {
                        return [loc[0], loc[1]];
                    },
                    getCurrentLocation: function() {
                        return [loc[0], loc[1]];
                    },
                    getOrientation: function() {
                        return o;
                    },
                    getCssClass: function() {
                        return acc;
                    }
                };

            return _newEndpoint({
                dropOptions: params.dropOptions,
                anchor: inPlaceAnchor,
                source: this.element,
                paintStyle: this.getPaintStyle(),
                endpoint: params.hideOnDrag ? "Blank" : this.endpoint,
                _transient: true,
                scope: this.scope
            });
        };

        /**
         * returns a connection from the pool; used when dragging starts.  just gets the head of the array if it can.
         */
        this.connectorSelector = function() {
            var candidate = this.connections[0];
            if (this.isTarget && candidate) return candidate;
            else {
                return (this.connections.length < this._jsPlumb.maxConnections) || this._jsPlumb.maxConnections == -1 ? null : candidate;
            }
        };

        this.setStyle = this.setPaintStyle;

        this.paint = function(params) {
            params = params || {};
            var timestamp = params.timestamp,
                recalc = !(params.recalc === false);
            if (!timestamp || this.timestamp !== timestamp) {

                var info = _jsPlumb.updateOffset({
                    elId: this.elementId,
                    timestamp: timestamp
                });

                var xy = params.offset ? params.offset.o : info.o;
                if (xy !== null) {
                    var ap = params.anchorPoint,
                        connectorPaintStyle = params.connectorPaintStyle;
                    if (ap === null) {
                        var wh = params.dimensions || info.s,
                            anchorParams = {
                                xy: [xy.left, xy.top],
                                wh: wh,
                                element: this,
                                timestamp: timestamp
                            };
                        if (recalc && this.anchor.isDynamic && this.connections.length > 0) {
                            var c = findConnectionToUseForDynamicAnchor(this, params.elementWithPrecedence),
                                oIdx = c.endpoints[0] == this ? 1 : 0,
                                oId = oIdx === 0 ? c.sourceId : c.targetId,
                                oInfo = _jsPlumb.getCachedData(oId),
                                oOffset = oInfo.o,
                                oWH = oInfo.s;
                            anchorParams.txy = [oOffset.left, oOffset.top];
                            anchorParams.twh = oWH;
                            anchorParams.tElement = c.endpoints[oIdx];
                        }
                        ap = this.anchor.compute(anchorParams);
                    }

                    this.endpoint.compute(ap, this.anchor.getOrientation(this), this._jsPlumb.paintStyleInUse, connectorPaintStyle || this.paintStyleInUse);
                    this.endpoint.paint(this._jsPlumb.paintStyleInUse, this.anchor);
                    this.timestamp = timestamp;

                    // paint overlays
                    for (var i = 0; i < this._jsPlumb.overlays.length; i++) {
                        var o = this._jsPlumb.overlays[i];
                        if (o.isVisible()) {
                            this._jsPlumb.overlayPlacements[i] = o.draw(this.endpoint, this._jsPlumb.paintStyleInUse);
                            o.paint(this._jsPlumb.overlayPlacements[i]);
                        }
                    }
                }
            }
        };

        this.repaint = this.paint;

        var draggingInitialised = false;
        this.initDraggable = function() {

            // is this a connection source? we make it draggable and have the
            // drag listener maintain a connection with a floating endpoint.
            if (!draggingInitialised && global.jsPlumb.isDragSupported(this.element)) {
                var placeholderInfo = {
                        id: null,
                        element: null
                    },
                    jpc = null,
                    existingJpc = false,
                    existingJpcParams = null,
                    _dragHandler = _makeConnectionDragHandler(placeholderInfo, _jsPlumb),
                    dragOptions = params.dragOptions || {},
                    defaultOpts = {},
                    startEvent = global.jsPlumb.dragEvents.start,
                    stopEvent = global.jsPlumb.dragEvents.stop,
                    dragEvent = global.jsPlumb.dragEvents.drag;

                var start = function() {
                    // drag might have started on an endpoint that is not actually a source, but which has
                    // one or more connections.
                    jpc = this.connectorSelector();
                    var _continue = true;
                    // if not enabled, return
                    if (!this.isEnabled()) _continue = false;
                    // if no connection and we're not a source - or temporarily a source, as is the case with makeSource - return.
                    if (jpc === null && !this.isSource && !this.isTemporarySource) _continue = false;
                    // otherwise if we're full and not allowed to drag, also return false.
                    if (this.isSource && this.isFull() && !this.dragAllowedWhenFull) _continue = false;
                    // if the connection was setup as not detachable or one of its endpoints
                    // was setup as connectionsDetachable = false, or Defaults.ConnectionsDetachable
                    // is set to false...
                    if (jpc !== null && !jpc.isDetachable()) _continue = false;

                    if (_continue === false) {
                        // this is for mootools and yui. returning false from this causes jquery to stop drag.
                        // the events are wrapped in both mootools and yui anyway, but i don't think returning
                        // false from the start callback would stop a drag.
                        if (_jsPlumb.stopDrag) _jsPlumb.stopDrag(this.canvas);
                        _dragHandler.stopDrag();
                        return false;
                    }

                    // clear hover for all connections for this endpoint before continuing.
                    for (var i = 0; i < this.connections.length; i++)
                        this.connections[i].setHover(false);

                    this.addClass("endpointDrag");
                    _jsPlumb.setConnectionBeingDragged(true);

                    // if we're not full but there was a connection, make it null. we'll create a new one.
                    if (jpc && !this.isFull() && this.isSource) jpc = null;

                    _jsPlumb.updateOffset({
                        elId: this.elementId
                    });
                    inPlaceCopy = this.makeInPlaceCopy();
                    inPlaceCopy.referenceEndpoint = this;
                    inPlaceCopy.paint();

                    _makeDraggablePlaceholder(placeholderInfo, _jsPlumb);

                    // set the offset of this div to be where 'inPlaceCopy' is, to start with.
                    // TODO merge this code with the code in both Anchor and FloatingAnchor, because it
                    // does the same stuff.
                    var ipcoel = _gel(inPlaceCopy.canvas),
                        ipco = global.jsPlumbAdapter.getOffset(ipcoel, this._jsPlumb.instance),
                        canvasElement = _gel(this.canvas);

                    global.jsPlumbAdapter.setPosition(placeholderInfo.element, ipco);

                    // when using makeSource and a parent, we first draw the source anchor on the source element, then
                    // move it to the parent.  note that this happens after drawing the placeholder for the
                    // first time.
                    if (this.parentAnchor) this.anchor = _jsPlumb.makeAnchor(this.parentAnchor, this.elementId, _jsPlumb);

                    // store the id of the dragging div and the source element. the drop function will pick these up.                   
                    _jsPlumb.setAttribute(this.canvas, "dragId", placeholderInfo.id);
                    _jsPlumb.setAttribute(this.canvas, "elId", this.elementId);

                    this._jsPlumb.floatingEndpoint = _makeFloatingEndpoint(this.getPaintStyle(), this.anchor, this.endpoint, this.canvas, placeholderInfo.element, _jsPlumb, _newEndpoint, this.scope);
                    // TODO we should not know about DOM here. make the library adapter do this (or the 
                    // dom adapter)
                    this.canvas.style.visibility = "hidden";

                    if (jpc === null) {
                        this.anchor.locked = true;
                        this.setHover(false, false);
                        // create a connection. one end is this endpoint, the other is a floating endpoint.                    
                        jpc = _newConnection({
                            sourceEndpoint: this,
                            targetEndpoint: this._jsPlumb.floatingEndpoint,
                            source: this.endpointWillMoveTo || this.element, // for makeSource with parent option.  ensure source element is represented correctly.
                            target: placeholderInfo.element,
                            anchors: [this.anchor, this._jsPlumb.floatingEndpoint.anchor],
                            paintStyle: params.connectorStyle, // this can be null. Connection will use the default.
                            hoverPaintStyle: params.connectorHoverStyle,
                            connector: params.connector, // this can also be null. Connection will use the default.
                            overlays: params.connectorOverlays,
                            type: this.connectionType,
                            cssClass: this.connectorClass,
                            hoverClass: this.connectorHoverClass
                        });
                        //jpc.pending = true; // mark this connection as not having been established.
                        jpc.addClass(_jsPlumb.draggingClass);
                        this._jsPlumb.floatingEndpoint.addClass(_jsPlumb.draggingClass);
                        // fire an event that informs that a connection is being dragged
                        _jsPlumb.fire("connectionDrag", jpc);

                    } else {
                        existingJpc = true;
                        jpc.setHover(false);
                        // new anchor idx
                        var anchorIdx = jpc.endpoints[0].id == this.id ? 0 : 1;
                        this.detachFromConnection(jpc, null, true); // detach from the connection while dragging is occurring. but dont cleanup automatically.

                        // store the original scope (issue 57)
                        var dragScope = _jsPlumb.getDragScope(canvasElement);
                        _jsPlumb.setAttribute(this.canvas, "originalScope", dragScope);
                        // now we want to get this endpoint's DROP scope, and set it for now: we can only be dropped on drop zones
                        // that have our drop scope (issue 57).
                        var dropScope = _jsPlumb.getDropScope(canvasElement);
                        _jsPlumb.setDragScope(canvasElement, dropScope);
                        //*/

                        // fire an event that informs that a connection is being dragged. we do this before
                        // replacing the original target with the floating element info.
                        _jsPlumb.fire("connectionDrag", jpc);

                        // now we replace ourselves with the temporary div we created above:
                        if (anchorIdx === 0) {
                            existingJpcParams = [jpc.source, jpc.sourceId, canvasElement, dragScope];
                            jpc.source = placeholderInfo.element;
                            jpc.sourceId = placeholderInfo.id;
                        } else {
                            existingJpcParams = [jpc.target, jpc.targetId, canvasElement, dragScope];
                            jpc.target = placeholderInfo.element;
                            jpc.targetId = placeholderInfo.id;
                        }

                        // lock the other endpoint; if it is dynamic it will not move while the drag is occurring.
                        jpc.endpoints[anchorIdx === 0 ? 1 : 0].anchor.locked = true;
                        // store the original endpoint and assign the new floating endpoint for the drag.
                        jpc.suspendedEndpoint = jpc.endpoints[anchorIdx];

                        // PROVIDE THE SUSPENDED ELEMENT, BE IT A SOURCE OR TARGET (ISSUE 39)
                        jpc.suspendedElement = jpc.endpoints[anchorIdx].getElement();
                        jpc.suspendedElementId = jpc.endpoints[anchorIdx].elementId;
                        jpc.suspendedElementType = anchorIdx === 0 ? "source" : "target";

                        jpc.suspendedEndpoint.setHover(false);
                        this._jsPlumb.floatingEndpoint.referenceEndpoint = jpc.suspendedEndpoint;
                        jpc.endpoints[anchorIdx] = this._jsPlumb.floatingEndpoint;

                        jpc.addClass(_jsPlumb.draggingClass);
                        this._jsPlumb.floatingEndpoint.addClass(_jsPlumb.draggingClass);
                    }

                    // register it and register connection on it.
                    _jsPlumb.floatingConnections[placeholderInfo.id] = jpc;
                    _jsPlumb.anchorManager.addFloatingConnection(placeholderInfo.id, jpc);
                    // only register for the target endpoint; we will not be dragging the source at any time
                    // before this connection is either discarded or made into a permanent connection.
                    _ju.addToList(params.endpointsByElement, placeholderInfo.id, this._jsPlumb.floatingEndpoint);
                    // tell jsplumb about it
                    _jsPlumb.currentlyDragging = true;
                }.bind(this);

                var stop = function() {
                    _jsPlumb.setConnectionBeingDragged(false);
                    // if no endpoints, jpc already cleaned up.
                    if (jpc && jpc.endpoints !== null) {
                        // get the actual drop event (decode from library args to stop function)
                        var originalEvent = _jsPlumb.getDropEvent(arguments);
                        // unlock the other endpoint (if it is dynamic, it would have been locked at drag start)
                        var idx = _jsPlumb.getFloatingAnchorIndex(jpc);
                        jpc.endpoints[idx === 0 ? 1 : 0].anchor.locked = false;
                        // TODO: Dont want to know about css classes inside jsplumb, ideally.
                        jpc.removeClass(_jsPlumb.draggingClass);

                        // if we have the floating endpoint then the connection has not been dropped
                        // on another endpoint.  If it is a new connection we throw it away. If it is an
                        // existing connection we check to see if we should reattach it, throwing it away
                        // if not.
                        if (this._jsPlumb && (jpc.deleteConnectionNow || jpc.endpoints[idx] == this._jsPlumb.floatingEndpoint)) {
                            // 6a. if the connection was an existing one...
                            if (existingJpc && jpc.suspendedEndpoint) {
                                // fix for issue35, thanks Sylvain Gizard: when firing the detach event make sure the
                                // floating endpoint has been replaced.
                                if (idx === 0) {
                                    jpc.source = existingJpcParams[0];
                                    jpc.sourceId = existingJpcParams[1];
                                } else {
                                    jpc.target = existingJpcParams[0];
                                    jpc.targetId = existingJpcParams[1];
                                }

                                var fe = this._jsPlumb.floatingEndpoint; // store for later removal.
                                // restore the original scope (issue 57)
                                _jsPlumb.setDragScope(existingJpcParams[2], existingJpcParams[3]);
                                jpc.endpoints[idx] = jpc.suspendedEndpoint;
                                // IF the connection should be reattached, or the other endpoint refuses detach, then
                                // reset the connection to its original state
                                if (jpc.isReattach() || jpc._forceReattach || jpc._forceDetach || !jpc.endpoints[idx === 0 ? 1 : 0].detach(jpc, false, false, true, originalEvent)) {
                                    jpc.setHover(false);
                                    jpc._forceDetach = null;
                                    jpc._forceReattach = null;
                                    this._jsPlumb.floatingEndpoint.detachFromConnection(jpc);
                                    jpc.suspendedEndpoint.addConnection(jpc);
                                    _jsPlumb.repaint(existingJpcParams[1]);
                                } else
                                    _jsPlumb.deleteObject({
                                        endpoint: fe
                                    });
                            }
                        }

                        // remove the element associated with the floating endpoint
                        // (and its associated floating endpoint and visual artefacts)
                        _jsPlumb.remove(placeholderInfo.element, false);
                        // remove the inplace copy
                        _jsPlumb.deleteObject({
                            endpoint: inPlaceCopy
                        });

                        // makeTargets sets this flag, to tell us we have been replaced and should delete ourself.
                        if (this.deleteAfterDragStop) {
                            _jsPlumb.deleteObject({
                                endpoint: this
                            });
                        } else {
                            if (this._jsPlumb) {
                                this._jsPlumb.floatingEndpoint = null;
                                // repaint this endpoint.
                                // make our canvas visible (TODO: hand off to library; we should not know about DOM)
                                this.canvas.style.visibility = "visible";
                                // unlock our anchor
                                this.anchor.locked = false;
                                this.paint({
                                    recalc: false
                                });
                            }
                        }

                        // although the connection is no longer valid, there are use cases where this is useful.
                        _jsPlumb.fire("connectionDragStop", jpc, originalEvent);

                        // tell jsplumb that dragging is finished.
                        _jsPlumb.currentlyDragging = false;

                        jpc = null;
                    }

                }.bind(this);

                dragOptions = global.jsPlumb.extend(defaultOpts, dragOptions);
                dragOptions.scope = this.scope || dragOptions.scope;
                dragOptions[startEvent] = _ju.wrap(dragOptions[startEvent], start, false);
                // extracted drag handler function so can be used by makeSource
                dragOptions[dragEvent] = _ju.wrap(dragOptions[dragEvent], _dragHandler.drag);
                dragOptions[stopEvent] = _ju.wrap(dragOptions[stopEvent], stop);

                dragOptions.canDrag = function() {
                    return this.isSource || this.isTemporarySource || (this.isTarget && this.connections.length > 0);
                }.bind(this);

                _jsPlumb.initDraggable(this.canvas, dragOptions, "internal");

                this.canvas._jsPlumbRelatedElement = this.element;

                draggingInitialised = true;
            }
        };

        // if marked as source or target at create time, init the dragging.
        if (this.isSource || this.isTarget || this.isTemporarySource)
            this.initDraggable();


        // pulled this out into a function so we can reuse it for the inPlaceCopy canvas; you can now drop detached connections
        // back onto the endpoint you detached it from.
        var _initDropTarget = function(canvas, forceInit, isTransient, endpoint) {

            if ((this.isTarget || forceInit) && global.jsPlumb.isDropSupported(this.element)) {
                var dropOptions = params.dropOptions || _jsPlumb.Defaults.DropOptions || global.jsPlumb.Defaults.DropOptions;
                dropOptions = global.jsPlumb.extend({}, dropOptions);
                dropOptions.scope = dropOptions.scope || this.scope;
                var dropEvent = global.jsPlumb.dragEvents.drop,
                    overEvent = global.jsPlumb.dragEvents.over,
                    outEvent = global.jsPlumb.dragEvents.out,
                    _ep = this,
                    drop = _jsPlumb.EndpointDropHandler({
                        getEndpoint: function() {
                            return _ep;
                        },
                        jsPlumb: _jsPlumb,
                        enabled: function() {
                            return endpoint !== null ? endpoint.isEnabled() : true;
                        },
                        isFull: function() {
                            return endpoint.isFull();
                        },
                        element: this.element,
                        elementId: this.elementId,
                        isSource: this.isSource,
                        isTarget: this.isTarget,
                        addClass: function(clazz) {
                            _ep.addClass(clazz);
                        },
                        removeClass: function(clazz) {
                            _ep.removeClass(clazz);
                        },
                        isDropAllowed: function() {
                            return _ep.isDropAllowed.apply(_ep, arguments);
                        }
                    });

                dropOptions[dropEvent] = _ju.wrap(dropOptions[dropEvent], drop);
                dropOptions[overEvent] = _ju.wrap(dropOptions[overEvent], function() {
                    var draggable = global.jsPlumb.getDragObject(arguments),
                        id = _jsPlumb.getAttribute(global.jsPlumb.getDOMElement(draggable), "dragId"),
                        _jpc = _jsPlumb.floatingConnections[id];

                    if (_jpc !== null) {
                        var idx = _jsPlumb.getFloatingAnchorIndex(_jpc);
                        // here we should fire the 'over' event if we are a target and this is a new connection,
                        // or we are the same as the floating endpoint.								
                        var _cont = (this.isTarget && idx !== 0) || (_jpc.suspendedEndpoint && this.referenceEndpoint && this.referenceEndpoint.id == _jpc.suspendedEndpoint.id);
                        if (_cont) {
                            var bb = _jsPlumb.checkCondition("checkDropAllowed", {
                                sourceEndpoint: _jpc.endpoints[idx],
                                targetEndpoint: this,
                                connection: _jpc
                            });
                            this[(bb ? "add" : "remove") + "Class"](_jsPlumb.endpointDropAllowedClass);
                            this[(bb ? "remove" : "add") + "Class"](_jsPlumb.endpointDropForbiddenClass);
                            _jpc.endpoints[idx].anchor.over(this.anchor, this);
                        }
                    }
                }.bind(this));

                dropOptions[outEvent] = _ju.wrap(dropOptions[outEvent], function() {
                    var draggable = global.jsPlumb.getDragObject(arguments),
                        id = draggable === null ? null : _jsPlumb.getAttribute(global.jsPlumb.getDOMElement(draggable), "dragId"),
                        _jpc = id ? _jsPlumb.floatingConnections[id] : null;

                    if (_jpc !== null) {
                        var idx = _jsPlumb.getFloatingAnchorIndex(_jpc);
                        var _cont = (this.isTarget && idx !== 0) || (_jpc.suspendedEndpoint && this.referenceEndpoint && this.referenceEndpoint.id == _jpc.suspendedEndpoint.id);
                        if (_cont) {
                            this.removeClass(_jsPlumb.endpointDropAllowedClass);
                            this.removeClass(_jsPlumb.endpointDropForbiddenClass);
                            _jpc.endpoints[idx].anchor.out();
                        }
                    }
                }.bind(this));

                _jsPlumb.initDroppable(canvas, dropOptions, "internal", isTransient);
            }
        }.bind(this);

        // initialise the endpoint's canvas as a drop target.  this will be ignored if the endpoint is not a target or drag is not supported.
        if (!this.anchor.isFloating)
            _initDropTarget(_gel(this.canvas), true, !(params._transient || this.anchor.isFloating), this);

        // finally, set type if it was provided
        if (params.type)
            this.addType(params.type, params.data, _jsPlumb.isSuspendDrawing());

        return this;
    };

    global.jsPlumbUtil.extend(global.jsPlumb.Endpoint, global.OverlayCapableJsPlumbUIComponent, {
        getTypeDescriptor: function() {
            return "endpoint";
        },
        isVisible: function() {
            return this._jsPlumb.visible;
        },
        setVisible: function(v, doNotChangeConnections, doNotNotifyOtherEndpoint) {
            this._jsPlumb.visible = v;
            if (this.canvas) this.canvas.style.display = v ? "block" : "none";
            this[v ? "showOverlays" : "hideOverlays"]();
            if (!doNotChangeConnections) {
                for (var i = 0; i < this.connections.length; i++) {
                    this.connections[i].setVisible(v);
                    if (!doNotNotifyOtherEndpoint) {
                        var oIdx = this === this.connections[i].endpoints[0] ? 1 : 0;
                        // only change the other endpoint if this is its only connection.
                        if (this.connections[i].endpoints[oIdx].connections.length == 1) this.connections[i].endpoints[oIdx].setVisible(v, true, true);
                    }
                }
            }
        },
        getAttachedElements: function() {
            return this.connections;
        },
        applyType: function(t) {
            this.setPaintStyle(t.endpointStyle || t.paintStyle);
            this.setHoverPaintStyle(t.endpointHoverStyle || t.hoverPaintStyle);
            if (t.maxConnections !== null) this._jsPlumb.maxConnections = t.maxConnections;
            if (t.scope) this.scope = t.scope;
            global.jsPlumb.extend(this, t, typeParameters);
            if (t.anchor) {
                this.anchor = this._jsPlumb.instance.makeAnchor(t.anchor);
            }
            if (t.cssClass !== null && this.canvas) this._jsPlumb.instance.addClass(this.canvas, t.cssClass);
        },
        isEnabled: function() {
            return this._jsPlumb.enabled;
        },
        setEnabled: function(e) {
            this._jsPlumb.enabled = e;
        },
        cleanup: function() {
            global.jsPlumbAdapter.removeClass(this.element, this._jsPlumb.instance.endpointAnchorClassPrefix + "_" + this._jsPlumb.currentAnchorClass);
            this.anchor = null;
            this.endpoint.cleanup();
            this.endpoint.destroy();
            this.endpoint = null;
            // drag/drop
            var i = global.jsPlumb.getElementObject(this.canvas);
            this._jsPlumb.instance.destroyDraggable(i, "internal");
            this._jsPlumb.instance.destroyDroppable(i, "internal");
        },
        setHover: function(h) {
            if (this.endpoint && this._jsPlumb && !this._jsPlumb.instance.isConnectionBeingDragged())
                this.endpoint.setHover(h);
        },
        isFull: function() {
            return !(this.isFloating() || this._jsPlumb.maxConnections < 1 || this.connections.length < this._jsPlumb.maxConnections);
        },
        /**
         * private but needs to be exposed.
         */
        isFloating: function() {
            return this.anchor !== null && this.anchor.isFloating;
        },
        isConnectedTo: function(endpoint) {
            var found = false;
            if (endpoint) {
                for (var i = 0; i < this.connections.length; i++) {
                    if (this.connections[i].endpoints[1] == endpoint || this.connections[i].endpoints[0] == endpoint) {
                        found = true;
                        break;
                    }
                }
            }
            return found;
        },
        getConnectionCost: function() {
            return this._jsPlumb.connectionCost;
        },
        setConnectionCost: function(c) {
            this._jsPlumb.connectionCost = c;
        },
        areConnectionsDirected: function() {
            return this._jsPlumb.connectionsDirected;
        },
        setConnectionsDirected: function(b) {
            this._jsPlumb.connectionsDirected = b;
        },
        setElementId: function(_elId) {
            this.elementId = _elId;
            this.anchor.elementId = _elId;
        },
        setReferenceElement: function(_el) {
            this.element = global.jsPlumb.getDOMElement(_el);
        },
        setDragAllowedWhenFull: function(allowed) {
            this.dragAllowedWhenFull = allowed;
        },
        equals: function(endpoint) {
            return this.anchor.equals(endpoint.anchor);
        },
        getUuid: function() {
            return this._jsPlumb.uuid;
        },
        computeAnchor: function(params) {
            return this.anchor.compute(params);
        }
    });

    global.jsPlumbInstance.prototype.EndpointDropHandler = function(dhParams) {
        return function(e) {

            var _jsPlumb = dhParams.jsPlumb;

            // remove the classes that are added dynamically. drop is neither forbidden nor allowed now that
            // the drop is finishing.
            // makeTarget:probably keep these. 'this' would refer to the DOM element though
            dhParams.removeClass(_jsPlumb.endpointDropAllowedClass);
            dhParams.removeClass(_jsPlumb.endpointDropForbiddenClass);

            var originalEvent = _jsPlumb.getDropEvent(arguments),
                draggable = _jsPlumb.getDOMElement(_jsPlumb.getDragObject(arguments)),
                id = _jsPlumb.getAttribute(draggable, "dragId"),
                elId = _jsPlumb.getAttribute(draggable, "elId"),
                scope = _jsPlumb.getAttribute(draggable, "originalScope"),
                jpc = _jsPlumb.floatingConnections[id];

            if (jpc === null) return;
            var _ep = dhParams.getEndpoint(jpc);

            if (dhParams.onDrop) dhParams.onDrop(jpc);

            // if this is a drop back where the connection came from, mark it force rettach and
            // return; the stop handler will reattach. without firing an event.
            var redrop = jpc.suspendedEndpoint && (jpc.suspendedEndpoint.id == _ep.id ||
                _ep.referenceEndpoint && jpc.suspendedEndpoint.id == _ep.referenceEndpoint.id);
            if (redrop) {
                jpc._forceReattach = true;
                jpc.setHover(false);
                return;
            }

            var idx = _jsPlumb.getFloatingAnchorIndex(jpc);

            // restore the original scope if necessary (issue 57)
            if (scope) _jsPlumb.setDragScope(draggable, scope);

            // if the target of the drop is full, fire an event (we abort below)
            // makeTarget: keep.
            if (dhParams.isFull(e)) {
                _ep.fire("maxConnections", {
                    endpoint: this,
                    connection: jpc,
                    maxConnections: _ep._jsPlumb.maxConnections
                }, originalEvent);
            }

            if (!dhParams.isFull() && !(idx === 0 && !dhParams.isSource) && !(idx == 1 && !dhParams.isTarget) && dhParams.enabled()) {
                var _doContinue = true;
                // if this is an existing connection and detach is not allowed we won't continue. The connection's
                // endpoints have been reinstated; everything is back to how it was.
                if (jpc.suspendedEndpoint && jpc.suspendedEndpoint.id != _ep.id) {

                    if (!jpc.isDetachAllowed(jpc) || !jpc.endpoints[idx].isDetachAllowed(jpc) || !jpc.suspendedEndpoint.isDetachAllowed(jpc) || !_jsPlumb.checkCondition("beforeDetach", jpc))
                        _doContinue = false;
                }

                // these have to be set before testing for beforeDrop.
                if (idx === 0) {
                    jpc.source = dhParams.element;
                    jpc.sourceId = dhParams.elementId;
                } else {
                    jpc.target = dhParams.element;
                    jpc.targetId = dhParams.elementId;
                }

                // ------------ wrap the execution path in a function so we can support asynchronous beforeDrop

                var continueFunction = function() {
                    // remove this jpc from the current endpoint, which is a floating endpoint that we will
                    // subsequently discard.
                    jpc.endpoints[idx].detachFromConnection(jpc);

                    // if there's a suspended endpoint, detach it from the connection.
                    if (jpc.suspendedEndpoint) jpc.suspendedEndpoint.detachFromConnection(jpc);
                    // TODO why?

                    jpc.endpoints[idx] = _ep;
                    _ep.addConnection(jpc);

                    // copy our parameters in to the connection:
                    var params = _ep.getParameters();
                    for (var aParam in params)
                        jpc.setParameter(aParam, params[aParam]);

                    if (!jpc.suspendedEndpoint) {
                        // if not an existing connection and
                        if (params.draggable)
                            _jsPlumb.initDraggable(this.element, dragOptions, "internal", _jsPlumb);
                    } else {
                        var suspendedElementId = jpc.suspendedEndpoint.elementId;
                        _jsPlumb.fireMoveEvent({
                            index: idx,
                            originalSourceId: idx === 0 ? suspendedElementId : jpc.sourceId,
                            newSourceId: idx === 0 ? _ep.elementId : jpc.sourceId,
                            originalTargetId: idx == 1 ? suspendedElementId : jpc.targetId,
                            newTargetId: idx == 1 ? _ep.elementId : jpc.targetId,
                            originalSourceEndpoint: idx === 0 ? jpc.suspendedEndpoint : jpc.endpoints[0],
                            newSourceEndpoint: idx === 0 ? _ep : jpc.endpoints[0],
                            originalTargetEndpoint: idx == 1 ? jpc.suspendedEndpoint : jpc.endpoints[1],
                            newTargetEndpoint: idx == 1 ? _ep : jpc.endpoints[1],
                            connection: jpc
                        }, originalEvent);
                    }

                    if (idx == 1)
                        _jsPlumb.anchorManager.updateOtherEndpoint(jpc.sourceId, jpc.suspendedElementId, jpc.targetId, jpc);
                    else
                        _jsPlumb.anchorManager.sourceChanged(jpc.suspendedEndpoint.elementId, jpc.sourceId, jpc);

                    // when makeSource has uniqueEndpoint:true, we want to create connections with new endpoints
                    // that are subsequently deleted. So makeSource sets `finalEndpoint`, which is the Endpoint to
                    // which the connection should be attached. The `detachFromConnection` call below results in the
                    // temporary endpoint being cleaned up.
                    if (jpc.endpoints[0].finalEndpoint) {
                        var _toDelete = jpc.endpoints[0];
                        _toDelete.detachFromConnection(jpc);
                        jpc.endpoints[0] = jpc.endpoints[0].finalEndpoint;
                        jpc.endpoints[0].addConnection(jpc);
                    }

                    // finalise will inform the anchor manager and also add to
                    // connectionsByScope if necessary.
                    // TODO if this is not set to true, then dragging a connection's target to a new
                    // target causes the connection to be forgotten. however if it IS set to true, then
                    // the opposite happens: dragging by source causes the connection to get forgotten
                    // about and then if you delete it jsplumb breaks.
                    _jsPlumb.finaliseConnection(jpc, null, originalEvent /*, true*/ );
                    jpc.setHover(false);

                }.bind(this);

                var dontContinueFunction = function() {
                    // otherwise just put it back on the endpoint it was on before the drag.
                    if (jpc.suspendedEndpoint) {
                        jpc.endpoints[idx] = jpc.suspendedEndpoint;
                        jpc.setHover(false);
                        jpc._forceDetach = true;
                        if (idx === 0) {
                            jpc.source = jpc.suspendedEndpoint.element;
                            jpc.sourceId = jpc.suspendedEndpoint.elementId;
                        } else {
                            jpc.target = jpc.suspendedEndpoint.element;
                            jpc.targetId = jpc.suspendedEndpoint.elementId;
                        }
                        jpc.suspendedEndpoint.addConnection(jpc);

                        _jsPlumb.repaint(jpc.sourceId);
                        jpc._forceDetach = false;
                    }
                };

                // --------------------------------------
                // now check beforeDrop.  this will be available only on Endpoints that are setup to
                // have a beforeDrop condition (although, secretly, under the hood all Endpoints and
                // the Connection have them, because they are on jsPlumbUIComponent.  shhh!), because
                // it only makes sense to have it on a target endpoint.
                _doContinue = _doContinue && dhParams.isDropAllowed(jpc.sourceId, jpc.targetId, jpc.scope, jpc, _ep); // && jpc.pending;

                if (_doContinue) {
                    continueFunction();
                } else {
                    dontContinueFunction();
                }
            }
            _jsPlumb.currentlyDragging = false;
        };
    };
})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains the code for Connections.
 *
 * Copyright (c) 2010 - 2014 jsPlumb (hello@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://jsplumb.org
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {

    "use strict";

    var makeConnector = function(_jsPlumb, renderMode, connectorName, connectorArgs, forComponent) {
            if (!_jsPlumb.Defaults.DoNotThrowErrors && global.jsPlumb.Connectors[renderMode][connectorName] === null)
                throw {
                    msg: "jsPlumb: unknown connector type '" + connectorName + "'"
                };

            return new global.jsPlumb.Connectors[renderMode][connectorName](connectorArgs, forComponent);
        },
        _makeAnchor = function(anchorParams, elementId, _jsPlumb) {
            return (anchorParams) ? _jsPlumb.makeAnchor(anchorParams, elementId, _jsPlumb) : null;
        };

    global.jsPlumb.Connection = function(params) {
        var _newEndpoint = params.newEndpoint,
            _ju = global.jsPlumbUtil;

        this.connector = null;
        this.idPrefix = "_jsplumb_c_";
        this.defaultLabelLocation = 0.5;
        this.defaultOverlayKeys = ["Overlays", "ConnectionOverlays"];
        // if a new connection is the result of moving some existing connection, params.previousConnection
        // will have that Connection in it. listeners for the jsPlumbConnection event can look for that
        // member and take action if they need to.
        this.previousConnection = params.previousConnection;
        this.source = global.jsPlumb.getDOMElement(params.source);
        this.target = global.jsPlumb.getDOMElement(params.target);
        // sourceEndpoint and targetEndpoint override source/target, if they are present. but 
        // source is not overridden if the Endpoint has declared it is not the final target of a connection;
        // instead we use the source that the Endpoint declares will be the final source element.
        if (params.sourceEndpoint) this.source = params.sourceEndpoint.endpointWillMoveTo || params.sourceEndpoint.getElement();
        if (params.targetEndpoint) this.target = params.targetEndpoint.getElement();

        global.OverlayCapableJsPlumbUIComponent.apply(this, arguments);

        this.sourceId = this._jsPlumb.instance.getId(this.source);
        this.targetId = this._jsPlumb.instance.getId(this.target);
        this.scope = params.scope; // scope may have been passed in to the connect call. if it wasn't, we will pull it from the source endpoint, after having initialised the endpoints.            
        this.endpoints = [];
        this.endpointStyles = [];

        var _jsPlumb = this._jsPlumb.instance;

        _jsPlumb.manage(this.sourceId, this.source);
        _jsPlumb.manage(this.targetId, this.target);

        this._jsPlumb.visible = true;
        this._jsPlumb.editable = params.editable === true;
        this._jsPlumb.params = {
            cssClass: params.cssClass,
            container: params.container,
            "pointer-events": params["pointer-events"],
            editorParams: params.editorParams
        };
        this._jsPlumb.lastPaintedAt = null;
        this.getDefaultType = function() {
            return {
                parameters: {},
                scope: null,
                detachable: this._jsPlumb.instance.Defaults.ConnectionsDetachable,
                rettach: this._jsPlumb.instance.Defaults.ReattachConnections,
                paintStyle: this._jsPlumb.instance.Defaults.PaintStyle || global.jsPlumb.Defaults.PaintStyle,
                connector: this._jsPlumb.instance.Defaults.Connector || global.jsPlumb.Defaults.Connector,
                hoverPaintStyle: this._jsPlumb.instance.Defaults.HoverPaintStyle || global.jsPlumb.Defaults.HoverPaintStyle,
                overlays: this._jsPlumb.instance.Defaults.ConnectorOverlays || global.jsPlumb.Defaults.ConnectorOverlays
            };
        };

        // listen to mouseover and mouseout events passed from the container delegate.
        this.bind("mouseover", function() {
            this.setHover(true);
        }.bind(this));
        this.bind("mouseout", function() {
            this.setHover(false);
        }.bind(this));

        // INITIALISATION CODE			

        // wrapped the main function to return null if no input given. this lets us cascade defaults properly.

        this.makeEndpoint = function(isSource, el, elId, ep) {
            elId = elId || this._jsPlumb.instance.getId(el);
            return this.prepareEndpoint(_jsPlumb, _newEndpoint, this, ep, isSource ? 0 : 1, params, el, elId);
        };

        var eS = this.makeEndpoint(true, this.source, this.sourceId, params.sourceEndpoint),
            eT = this.makeEndpoint(false, this.target, this.targetId, params.targetEndpoint);

        if (eS) _ju.addToList(params.endpointsByElement, this.sourceId, eS);
        if (eT) _ju.addToList(params.endpointsByElement, this.targetId, eT);
        // if scope not set, set it to be the scope for the source endpoint.
        if (!this.scope) this.scope = this.endpoints[0].scope;

        // if explicitly told to (or not to) delete endpoints on detach, override endpoint's preferences
        if (params.deleteEndpointsOnDetach !== null) {
            this.endpoints[0]._deleteOnDetach = params.deleteEndpointsOnDetach;
            this.endpoints[1]._deleteOnDetach = params.deleteEndpointsOnDetach;
        } else {
            // otherwise, unless the endpoints say otherwise, mark them for deletion.
            if (!this.endpoints[0]._doNotDeleteOnDetach) this.endpoints[0]._deleteOnDetach = true;
            if (!this.endpoints[1]._doNotDeleteOnDetach) this.endpoints[1]._deleteOnDetach = true;
        }

        // TODO these could surely be refactored into some method that tries them one at a time until something exists
        this.setConnector(this.endpoints[0].connector ||
            this.endpoints[1].connector ||
            params.connector ||
            _jsPlumb.Defaults.Connector ||
            global.jsPlumb.Defaults.Connector, true, true);

        if (params.path)
            this.connector.setPath(params.path);

        this.setPaintStyle(this.endpoints[0].connectorStyle ||
            this.endpoints[1].connectorStyle ||
            params.paintStyle ||
            _jsPlumb.Defaults.PaintStyle ||
            global.jsPlumb.Defaults.PaintStyle, true);

        this.setHoverPaintStyle(this.endpoints[0].connectorHoverStyle ||
            this.endpoints[1].connectorHoverStyle ||
            params.hoverPaintStyle ||
            _jsPlumb.Defaults.HoverPaintStyle ||
            global.jsPlumb.Defaults.HoverPaintStyle, true);

        this._jsPlumb.paintStyleInUse = this.getPaintStyle();

        var _suspendedAt = _jsPlumb.getSuspendedAt();
        //*
        if (!_jsPlumb.isSuspendDrawing()) {
            // paint the endpoints
            var myInfo = _jsPlumb.getCachedData(this.sourceId),
                myOffset = myInfo.o,
                myWH = myInfo.s,
                otherInfo = _jsPlumb.getCachedData(this.targetId),
                otherOffset = otherInfo.o,
                otherWH = otherInfo.s,
                initialTimestamp = _suspendedAt || _jsPlumb.timestamp(),
                anchorLoc = this.endpoints[0].anchor.compute({
                    xy: [myOffset.left, myOffset.top],
                    wh: myWH,
                    element: this.endpoints[0],
                    elementId: this.endpoints[0].elementId,
                    txy: [otherOffset.left, otherOffset.top],
                    twh: otherWH,
                    tElement: this.endpoints[1],
                    timestamp: initialTimestamp
                });

            this.endpoints[0].paint({
                anchorLoc: anchorLoc,
                timestamp: initialTimestamp
            });

            anchorLoc = this.endpoints[1].anchor.compute({
                xy: [otherOffset.left, otherOffset.top],
                wh: otherWH,
                element: this.endpoints[1],
                elementId: this.endpoints[1].elementId,
                txy: [myOffset.left, myOffset.top],
                twh: myWH,
                tElement: this.endpoints[0],
                timestamp: initialTimestamp
            });
            this.endpoints[1].paint({
                anchorLoc: anchorLoc,
                timestamp: initialTimestamp
            });
        }
        //*/

        // END INITIALISATION CODE			

        // DETACHABLE 				
        this._jsPlumb.detachable = _jsPlumb.Defaults.ConnectionsDetachable;
        if (params.detachable === false) this._jsPlumb.detachable = false;
        if (this.endpoints[0].connectionsDetachable === false) this._jsPlumb.detachable = false;
        if (this.endpoints[1].connectionsDetachable === false) this._jsPlumb.detachable = false;
        // REATTACH
        this._jsPlumb.reattach = params.reattach || this.endpoints[0].reattachConnections || this.endpoints[1].reattachConnections || _jsPlumb.Defaults.ReattachConnections;
        // COST + DIRECTIONALITY
        // if cost not supplied, try to inherit from source endpoint
        this._jsPlumb.cost = params.cost || this.endpoints[0].getConnectionCost();
        this._jsPlumb.directed = params.directed;
        // inherit directed flag if set no source endpoint
        if (params.directed === null) this._jsPlumb.directed = this.endpoints[0].areConnectionsDirected();
        // END COST + DIRECTIONALITY

        // PARAMETERS						
        // merge all the parameters objects into the connection.  parameters set
        // on the connection take precedence; then source endpoint params, then
        // finally target endpoint params.
        // TODO global.jsPlumb.extend could be made to take more than two args, and it would
        // apply the second through nth args in order.
        var _p = global.jsPlumb.extend({}, this.endpoints[1].getParameters());
        global.jsPlumb.extend(_p, this.endpoints[0].getParameters());
        global.jsPlumb.extend(_p, this.getParameters());
        this.setParameters(_p);
        // END PARAMETERS

        // PAINTING

        // the very last thing we do is apply types, if there are any.
        var _types = [params.type, this.endpoints[0].connectionType, this.endpoints[1].connectionType].join(" ");
        if (/[^\s]/.test(_types))
            this.addType(_types, params.data, true);

        // END PAINTING    
    };

    global.jsPlumbUtil.extend(global.jsPlumb.Connection, global.OverlayCapableJsPlumbUIComponent, {
        applyType: function(t, doNotRepaint) {
            if (t.detachable !== null) this.setDetachable(t.detachable);
            if (t.reattach !== null) this.setReattach(t.reattach);
            if (t.scope) this.scope = t.scope;
            this.setConnector(t.connector, doNotRepaint);
            if (t.cssClass !== null && this.canvas) this._jsPlumb.instance.addClass(this.canvas, t.cssClass);
            if (t.anchor) {
                this.endpoints[0].anchor = this._jsPlumb.instance.makeAnchor(t.anchor);
                this.endpoints[1].anchor = this._jsPlumb.instance.makeAnchor(t.anchor);
            } else if (t.anchors) {
                this.endpoints[0].anchor = this._jsPlumb.instance.makeAnchor(t.anchors[0]);
                this.endpoints[1].anchor = this._jsPlumb.instance.makeAnchor(t.anchors[1]);
            }
        },
        getTypeDescriptor: function() {
            return "connection";
        },
        getAttachedElements: function() {
            return this.endpoints;
        },
        addClass: function(c, informEndpoints) {
            if (informEndpoints) {
                this.endpoints[0].addClass(c);
                this.endpoints[1].addClass(c);
                if (this.suspendedEndpoint) this.suspendedEndpoint.addClass(c);
            }
            if (this.connector) {
                this.connector.addClass(c);
            }
        },
        removeClass: function(c, informEndpoints) {
            if (informEndpoints) {
                this.endpoints[0].removeClass(c);
                this.endpoints[1].removeClass(c);
                if (this.suspendedEndpoint) this.suspendedEndpoint.removeClass(c);
            }
            if (this.connector) {
                this.connector.removeClass(c);
            }
        },
        isVisible: function() {
            return this._jsPlumb.visible;
        },
        setVisible: function(v) {
            this._jsPlumb.visible = v;
            if (this.connector)
                this.connector.setVisible(v);
            this.repaint();
        },
        cleanup: function() {
            this.endpoints = null;
            this.source = null;
            this.target = null;
            if (this.connector !== null) {
                this.connector.cleanup();
                this.connector.destroy();
            }
            this.connector = null;
        },
        isDetachable: function() {
            return this._jsPlumb.detachable === true;
        },
        setDetachable: function(detachable) {
            this._jsPlumb.detachable = detachable === true;
        },
        isReattach: function() {
            return this._jsPlumb.reattach === true;
        },
        setReattach: function(reattach) {
            this._jsPlumb.reattach = reattach === true;
        },
        setHover: function(state) {
            if (this.connector && this._jsPlumb && !this._jsPlumb.instance.isConnectionBeingDragged()) {
                this.connector.setHover(state);
                global.jsPlumbAdapter[state ? "addClass" : "removeClass"](this.source, this._jsPlumb.instance.hoverSourceClass);
                global.jsPlumbAdapter[state ? "addClass" : "removeClass"](this.target, this._jsPlumb.instance.hoverTargetClass);
            }
        },
        getCost: function() {
            return this._jsPlumb.cost;
        },
        setCost: function(c) {
            this._jsPlumb.cost = c;
        },
        isDirected: function() {
            return this._jsPlumb.directed === true;
        },
        getConnector: function() {
            return this.connector;
        },
        setConnector: function(connectorSpec, doNotRepaint, doNotChangeListenerComponent) {
            var _ju = global.jsPlumbUtil;
            if (this.connector !== null) {
                this.connector.cleanup();
                this.connector.destroy();
            }

            var connectorArgs = {
                    _jsPlumb: this._jsPlumb.instance,
                    cssClass: this._jsPlumb.params.cssClass,
                    container: this._jsPlumb.params.container,
                    "pointer-events": this._jsPlumb.params["pointer-events"]
                },
                renderMode = this._jsPlumb.instance.getRenderMode();

            if (_ju.isString(connectorSpec))
                this.connector = makeConnector(this._jsPlumb.instance, renderMode, connectorSpec, connectorArgs, this); // lets you use a string as shorthand.
            else if (_ju.isArray(connectorSpec)) {
                if (connectorSpec.length == 1)
                    this.connector = makeConnector(this._jsPlumb.instance, renderMode, connectorSpec[0], connectorArgs, this);
                else
                    this.connector = makeConnector(this._jsPlumb.instance, renderMode, connectorSpec[0], _ju.merge(connectorSpec[1], connectorArgs), this);
            }

            this.canvas = this.connector.canvas;
            this.bgCanvas = this.connector.bgCanvas;

            // new: instead of binding listeners per connector, we now just have one delegate on the container.
            // so for that handler we set the connection as the '_jsPlumb' member of the canvas element, and
            // bgCanvas, if it exists, which it does right now in the VML renderer, so it won't from v 2.0.0 onwards.
            if (this.canvas) this.canvas._jsPlumb = this;
            if (this.bgCanvas) this.bgCanvas._jsPlumb = this;

            if (!doNotChangeListenerComponent) this.setListenerComponent(this.connector);
            if (!doNotRepaint) this.repaint();
        },
        paint: function(params) {

            if (!this._jsPlumb.instance.isSuspendDrawing() && this._jsPlumb.visible) {
                params = params || {};
                var timestamp = params.timestamp,
                    // if the moving object is not the source we must transpose the two references.
                    swap = false,
                    tId = swap ? this.sourceId : this.targetId,
                    sId = swap ? this.targetId : this.sourceId,
                    tIdx = swap ? 0 : 1,
                    sIdx = swap ? 1 : 0;

                if (timestamp === null || timestamp != this._jsPlumb.lastPaintedAt) {
                    var sourceInfo = this._jsPlumb.instance.getOffset(sId),
                        targetInfo = this._jsPlumb.instance.getOffset(tId),
                        sE = this.endpoints[sIdx],
                        tE = this.endpoints[tIdx];

                    var sAnchorP = sE.anchor.getCurrentLocation({
                            xy: [sourceInfo.left, sourceInfo.top],
                            wh: [sourceInfo.width, sourceInfo.height],
                            element: sE,
                            timestamp: timestamp
                        }),
                        tAnchorP = tE.anchor.getCurrentLocation({
                            xy: [targetInfo.left, targetInfo.top],
                            wh: [targetInfo.width, targetInfo.height],
                            element: tE,
                            timestamp: timestamp
                        });

                    this.connector.resetBounds();

                    this.connector.compute({
                        sourcePos: sAnchorP,
                        targetPos: tAnchorP,
                        sourceEndpoint: this.endpoints[sIdx],
                        targetEndpoint: this.endpoints[tIdx],
                        lineWidth: this._jsPlumb.paintStyleInUse.lineWidth,
                        sourceInfo: sourceInfo,
                        targetInfo: targetInfo
                    });

                    var overlayExtents = {
                        minX: Infinity,
                        minY: Infinity,
                        maxX: -Infinity,
                        maxY: -Infinity
                    };

                    // compute overlays. we do this first so we can get their placements, and adjust the
                    // container if needs be (if an overlay would be clipped)
                    for (var i = 0; i < this._jsPlumb.overlays.length; i++) {
                        var o = this._jsPlumb.overlays[i];
                        if (o.isVisible()) {
                            this._jsPlumb.overlayPlacements[i] = o.draw(this.connector, this._jsPlumb.paintStyleInUse, this.getAbsoluteOverlayPosition(o));
                            overlayExtents.minX = Math.min(overlayExtents.minX, this._jsPlumb.overlayPlacements[i].minX);
                            overlayExtents.maxX = Math.max(overlayExtents.maxX, this._jsPlumb.overlayPlacements[i].maxX);
                            overlayExtents.minY = Math.min(overlayExtents.minY, this._jsPlumb.overlayPlacements[i].minY);
                            overlayExtents.maxY = Math.max(overlayExtents.maxY, this._jsPlumb.overlayPlacements[i].maxY);
                        }
                    }

                    var lineWidth = parseFloat(this._jsPlumb.paintStyleInUse.lineWidth || 1) / 2,
                        outlineWidth = parseFloat(this._jsPlumb.paintStyleInUse.lineWidth || 0),
                        extents = {
                            xmin: Math.min(this.connector.bounds.minX - (lineWidth + outlineWidth), overlayExtents.minX),
                            ymin: Math.min(this.connector.bounds.minY - (lineWidth + outlineWidth), overlayExtents.minY),
                            xmax: Math.max(this.connector.bounds.maxX + (lineWidth + outlineWidth), overlayExtents.maxX),
                            ymax: Math.max(this.connector.bounds.maxY + (lineWidth + outlineWidth), overlayExtents.maxY)
                        };
                    // paint the connector.
                    this.connector.paint(this._jsPlumb.paintStyleInUse, null, extents);
                    // and then the overlays
                    for (var j = 0; j < this._jsPlumb.overlays.length; j++) {
                        var p = this._jsPlumb.overlays[j];
                        if (p.isVisible()) {
                            p.paint(this._jsPlumb.overlayPlacements[j], extents);
                        }
                    }
                }
                this._jsPlumb.lastPaintedAt = timestamp;
            }
        },
        repaint: function(params) {
            params = params || {};
            this.paint({
                elId: this.sourceId,
                recalc: !(params.recalc === false),
                timestamp: params.timestamp
            });
        },
        prepareEndpoint: function(_jsPlumb, _newEndpoint, conn, existing, index, params, element, elementId) {
            var e;
            if (existing) {
                conn.endpoints[index] = existing;
                existing.addConnection(conn);
            } else {
                if (!params.endpoints) params.endpoints = [null, null];
                var ep = params.endpoints[index] || params.endpoint || _jsPlumb.Defaults.Endpoints[index] || global.jsPlumb.Defaults.Endpoints[index] || _jsPlumb.Defaults.Endpoint || global.jsPlumb.Defaults.Endpoint;
                if (!params.endpointStyles) params.endpointStyles = [null, null];
                if (!params.endpointHoverStyles) params.endpointHoverStyles = [null, null];
                var es = params.endpointStyles[index] || params.endpointStyle || _jsPlumb.Defaults.EndpointStyles[index] || global.jsPlumb.Defaults.EndpointStyles[index] || _jsPlumb.Defaults.EndpointStyle || global.jsPlumb.Defaults.EndpointStyle;
                // Endpoints derive their fillStyle from the connector's strokeStyle, if no fillStyle was specified.
                if (es.fillStyle === null && params.paintStyle !== null)
                    es.fillStyle = params.paintStyle.strokeStyle;

                // TODO: decide if the endpoint should derive the connection's outline width and color.  currently it does:
                //*
                if (es.outlineColor === null && params.paintStyle !== null)
                    es.outlineColor = params.paintStyle.outlineColor;
                if (es.outlineWidth === null && params.paintStyle !== null)
                    es.outlineWidth = params.paintStyle.outlineWidth;
                //*/

                var ehs = params.endpointHoverStyles[index] || params.endpointHoverStyle || _jsPlumb.Defaults.EndpointHoverStyles[index] || global.jsPlumb.Defaults.EndpointHoverStyles[index] || _jsPlumb.Defaults.EndpointHoverStyle || global.jsPlumb.Defaults.EndpointHoverStyle;
                // endpoint hover fill style is derived from connector's hover stroke style.  TODO: do we want to do this by default? for sure?
                if (params.hoverPaintStyle !== null) {
                    if (ehs === null) ehs = {};
                    if (ehs.fillStyle === null) {
                        ehs.fillStyle = params.hoverPaintStyle.strokeStyle;
                    }
                }
                var a = params.anchors ? params.anchors[index] :
                    params.anchor ? params.anchor :
                    _makeAnchor(_jsPlumb.Defaults.Anchors[index], elementId, _jsPlumb) ||
                    _makeAnchor(global.jsPlumb.Defaults.Anchors[index], elementId, _jsPlumb) ||
                    _makeAnchor(_jsPlumb.Defaults.Anchor, elementId, _jsPlumb) ||
                    _makeAnchor(global.jsPlumb.Defaults.Anchor, elementId, _jsPlumb),
                    u = params.uuids ? params.uuids[index] : null;

                e = _newEndpoint({
                    paintStyle: es,
                    hoverPaintStyle: ehs,
                    endpoint: ep,
                    connections: [conn],
                    uuid: u,
                    anchor: a,
                    source: element,
                    scope: params.scope,
                    reattach: params.reattach || _jsPlumb.Defaults.ReattachConnections,
                    detachable: params.detachable || _jsPlumb.Defaults.ConnectionsDetachable
                });
                conn.endpoints[index] = e;

                if (params.drawEndpoints === false) e.setVisible(false, true, true);

            }
            return e;
        }

    }); // END Connection class            
})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains the code for creating and manipulating anchors.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {

    "use strict";

    //
    // manages anchors for all elements.
    //
    global.jsPlumb.AnchorManager = function(params) {
        var _amEndpoints = {},
            continuousAnchors = {},
            continuousAnchorLocations = {},
            userDefinedContinuousAnchorLocations = {},
            continuousAnchorOrientations = {},
            Orientation = {
                HORIZONTAL: "horizontal",
                VERTICAL: "vertical",
                DIAGONAL: "diagonal",
                IDENTITY: "identity"
            },
            axes = ["left", "top", "right", "bottom"],
            connectionsByElementId = {},
            self = this,
            anchorLists = {},
            jsPlumbInstance = params.jsPlumbInstance,
            floatingConnections = {},
            calculateOrientation = function(sourceId, targetId, sd, td, sourceAnchor, targetAnchor) {

                if (sourceId === targetId) return {
                    orientation: Orientation.IDENTITY,
                    a: ["top", "top"]
                };

                var theta = Math.atan2((td.centery - sd.centery), (td.centerx - sd.centerx)),
                    theta2 = Math.atan2((sd.centery - td.centery), (sd.centerx - td.centerx));

                // --------------------------------------------------------------------------------------

                // improved face calculation. get midpoints of each face for source and target, then put in an array with all combinations of
                // source/target faces. sort this array by distance between midpoints. the entry at index 0 is our preferred option. we can 
                // go through the array one by one until we find an entry in which each requested face is supported.
                var candidates = [],
                    midpoints = {};
                (function(types, dim) {
                    for (var i = 0; i < types.length; i++) {
                        midpoints[types[i]] = {
                            "left": [dim[i].left, dim[i].centery],
                            "right": [dim[i].right, dim[i].centery],
                            "top": [dim[i].centerx, dim[i].top],
                            "bottom": [dim[i].centerx, dim[i].bottom]
                        };
                    }
                })(["source", "target"], [sd, td]);

                for (var sf = 0; sf < axes.length; sf++) {
                    for (var tf = 0; tf < axes.length; tf++) {
                        if (sf != tf) {
                            candidates.push({
                                source: axes[sf],
                                target: axes[tf],
                                dist: Biltong.lineLength(midpoints.source[axes[sf]], midpoints.target[axes[tf]])
                            });
                        }
                    }
                }

                candidates.sort(function(a, b) {
                    return a.dist < b.dist ? -1 : a.dist > b.dist ? 1 : 0;
                });

                // now go through this list and try to get an entry that satisfies both (there will be one, unless one of the anchors
                // declares no available faces)
                var sourceEdge = candidates[0].source,
                    targetEdge = candidates[0].target;
                for (var i = 0; i < candidates.length; i++) {

                    if (!sourceAnchor.isContinuous || sourceAnchor.isEdgeSupported(candidates[i].source))
                        sourceEdge = candidates[i].source;
                    else
                        sourceEdge = null;

                    if (!targetAnchor.isContinuous || targetAnchor.isEdgeSupported(candidates[i].target))
                        targetEdge = candidates[i].target;
                    else {
                        targetEdge = null;
                    }

                    if (sourceEdge !== null && targetEdge !== null) break;
                }

                // --------------------------------------------------------------------------------------

                return {
                    a: [sourceEdge, targetEdge],
                    theta: theta,
                    theta2: theta2
                };
            },
            // used by placeAnchors function
            placeAnchorsOnLine = function(desc, elementDimensions, elementPosition,
                connections, horizontal, otherMultiplier, reverse) {
                var a = [],
                    step = elementDimensions[horizontal ? 0 : 1] / (connections.length + 1);

                for (var i = 0; i < connections.length; i++) {
                    var val = (i + 1) * step,
                        other = otherMultiplier * elementDimensions[horizontal ? 1 : 0];
                    if (reverse)
                        val = elementDimensions[horizontal ? 0 : 1] - val;

                    var dx = (horizontal ? val : other),
                        x = elementPosition[0] + dx,
                        xp = dx / elementDimensions[0],
                        dy = (horizontal ? other : val),
                        y = elementPosition[1] + dy,
                        yp = dy / elementDimensions[1];

                    a.push([x, y, xp, yp, connections[i][1], connections[i][2]]);
                }

                return a;
            },
            // used by edgeSortFunctions        
            currySort = function(reverseAngles) {
                return function(a, b) {
                    var r = true;
                    if (reverseAngles) {
                        r = a[0][0] < b[0][0];
                    } else {
                        r = a[0][0] > b[0][0];
                    }
                    return r === false ? -1 : 1;
                };
            },
            // used by edgeSortFunctions
            leftSort = function(a, b) {
                // first get adjusted values
                var p1 = a[0][0] < 0 ? -Math.PI - a[0][0] : Math.PI - a[0][0],
                    p2 = b[0][0] < 0 ? -Math.PI - b[0][0] : Math.PI - b[0][0];
                if (p1 > p2) return 1;
                else return a[0][1] > b[0][1] ? 1 : -1;
            },
            // used by placeAnchors
            edgeSortFunctions = {
                "top": function(a, b) {
                    return a[0] > b[0] ? 1 : -1;
                },
                "right": currySort(true),
                "bottom": currySort(true),
                "left": leftSort
            },
            // used by placeAnchors
            _sortHelper = function(_array, _fn) {
                return _array.sort(_fn);
            },
            // used by AnchorManager.redraw
            placeAnchors = function(elementId, _anchorLists) {
                var cd = global.jsPlumbInstance.getCachedData(elementId),
                    sS = cd.s,
                    sO = cd.o,
                    placeSomeAnchors = function(desc, elementDimensions, elementPosition, unsortedConnections, isHorizontal, otherMultiplier, orientation) {
                        if (unsortedConnections.length > 0) {
                            var sc = _sortHelper(unsortedConnections, edgeSortFunctions[desc]), // puts them in order based on the target element's pos on screen
                                reverse = desc === "right" || desc === "top",
                                anchors = placeAnchorsOnLine(desc, elementDimensions,
                                    elementPosition, sc,
                                    isHorizontal, otherMultiplier, reverse);

                            // takes a computed anchor position and adjusts it for parent offset and scroll, then stores it.
                            var _setAnchorLocation = function(endpoint, anchorPos) {
                                continuousAnchorLocations[endpoint.id] = [anchorPos[0], anchorPos[1], anchorPos[2], anchorPos[3]];
                                continuousAnchorOrientations[endpoint.id] = orientation;
                            };

                            for (var i = 0; i < anchors.length; i++) {
                                var c = anchors[i][4],
                                    weAreSource = c.endpoints[0].elementId === elementId,
                                    weAreTarget = c.endpoints[1].elementId === elementId;
                                if (weAreSource)
                                    _setAnchorLocation(c.endpoints[0], anchors[i]);
                                else if (weAreTarget)
                                    _setAnchorLocation(c.endpoints[1], anchors[i]);
                            }
                        }
                    };

                placeSomeAnchors("bottom", sS, [sO.left, sO.top], _anchorLists.bottom, true, 1, [0, 1]);
                placeSomeAnchors("top", sS, [sO.left, sO.top], _anchorLists.top, true, 0, [0, -1]);
                placeSomeAnchors("left", sS, [sO.left, sO.top], _anchorLists.left, false, 0, [-1, 0]);
                placeSomeAnchors("right", sS, [sO.left, sO.top], _anchorLists.right, false, 1, [1, 0]);
            };

        this.reset = function() {
            _amEndpoints = {};
            connectionsByElementId = {};
            anchorLists = {};
        };
        this.addFloatingConnection = function(key, conn) {
            floatingConnections[key] = conn;
        };
        this.removeFloatingConnection = function(key) {
            delete floatingConnections[key];
        };
        this.newConnection = function(conn) {
            var sourceId = conn.sourceId,
                targetId = conn.targetId,
                ep = conn.endpoints,
                doRegisterTarget = true,
                registerConnection = function(otherIndex, otherEndpoint, otherAnchor, elId, c) {
                    if ((sourceId == targetId) && otherAnchor.isContinuous) {
                        // remove the target endpoint's canvas.  we dont need it.
                        conn._jsPlumb.instance.removeElement(ep[1].canvas);
                        doRegisterTarget = false;
                    }
                    global.jsPlumbUtil.addToList(connectionsByElementId, elId, [c, otherEndpoint, otherAnchor.constructor == global.jsPlumb.DynamicAnchor]);
                };

            registerConnection(0, ep[0], ep[0].anchor, targetId, conn);
            if (doRegisterTarget)
                registerConnection(1, ep[1], ep[1].anchor, sourceId, conn);
        };
        var removeEndpointFromAnchorLists = function(endpoint) {
            (function(list, eId) {
                if (list) { // transient anchors dont get entries in this list.
                    var f = function(e) {
                        return e[4] == eId;
                    };
                    global.jsPlumbUtil.removeWithFunction(list.top, f);
                    global.jsPlumbUtil.removeWithFunction(list.left, f);
                    global.jsPlumbUtil.removeWithFunction(list.bottom, f);
                    global.jsPlumbUtil.removeWithFunction(list.right, f);
                }
            })(anchorLists[endpoint.elementId], endpoint.id);
        };
        this.connectionDetached = function(connInfo) {
            var connection = connInfo.connection || connInfo,
                sourceId = connInfo.sourceId,
                targetId = connInfo.targetId,
                ep = connection.endpoints,
                removeConnection = function(otherIndex, otherEndpoint, otherAnchor, elId, c) {
                    if (otherAnchor !== null && otherAnchor.constructor == global.jsPlumb.FloatingAnchor) {
                        // no-op
                    } else {
                        global.jsPlumbUtil.removeWithFunction(connectionsByElementId[elId], function(_c) {
                            return _c[0].id == c.id;
                        });
                    }
                };

            removeConnection(1, ep[1], ep[1].anchor, sourceId, connection);
            removeConnection(0, ep[0], ep[0].anchor, targetId, connection);

            // remove from anchorLists            
            removeEndpointFromAnchorLists(connection.endpoints[0]);
            removeEndpointFromAnchorLists(connection.endpoints[1]);

            self.redraw(connection.sourceId);
            self.redraw(connection.targetId);
        };
        this.add = function(endpoint, elementId) {
            global.jsPlumbUtil.addToList(_amEndpoints, elementId, endpoint);
        };
        this.changeId = function(oldId, newId) {
            connectionsByElementId[newId] = connectionsByElementId[oldId];
            _amEndpoints[newId] = _amEndpoints[oldId];
            delete connectionsByElementId[oldId];
            delete _amEndpoints[oldId];
        };
        this.getConnectionsFor = function(elementId) {
            return connectionsByElementId[elementId] || [];
        };
        this.getEndpointsFor = function(elementId) {
            return _amEndpoints[elementId] || [];
        };
        this.deleteEndpoint = function(endpoint) {
            global.jsPlumbUtil.removeWithFunction(_amEndpoints[endpoint.elementId], function(e) {
                return e.id == endpoint.id;
            });
            removeEndpointFromAnchorLists(endpoint);
        };
        this.clearFor = function(elementId) {
            delete _amEndpoints[elementId];
            _amEndpoints[elementId] = [];
        };
        // updates the given anchor list by either updating an existing anchor's info, or adding it. this function
        // also removes the anchor from its previous list, if the edge it is on has changed.
        // all connections found along the way (those that are connected to one of the faces this function
        // operates on) are added to the connsToPaint list, as are their endpoints. in this way we know to repaint
        // them wthout having to calculate anything else about them.
        var _updateAnchorList = function(lists, theta, order, conn, aBoolean, otherElId, idx, reverse, edgeId, elId, connsToPaint, endpointsToPaint) {
            // first try to find the exact match, but keep track of the first index of a matching element id along the way.s
            var exactIdx = -1,
                firstMatchingElIdx = -1,
                endpoint = conn.endpoints[idx],
                endpointId = endpoint.id,
                oIdx = [1, 0][idx],
                values = [
                    [theta, order], conn, aBoolean, otherElId, endpointId
                ],
                listToAddTo = lists[edgeId],
                listToRemoveFrom = endpoint._continuousAnchorEdge ? lists[endpoint._continuousAnchorEdge] : null,
                i;

            if (listToRemoveFrom) {
                var rIdx = global.jsPlumbUtil.findWithFunction(listToRemoveFrom, function(e) {
                    return e[4] == endpointId;
                });
                if (rIdx != -1) {
                    listToRemoveFrom.splice(rIdx, 1);
                    // get all connections from this list
                    for (i = 0; i < listToRemoveFrom.length; i++) {
                        global.jsPlumbUtil.addWithFunction(connsToPaint, listToRemoveFrom[i][1], function(c) {
                            return c.id == listToRemoveFrom[i][1].id;
                        });
                        global.jsPlumbUtil.addWithFunction(endpointsToPaint, listToRemoveFrom[i][1].endpoints[idx], function(e) {
                            return e.id == listToRemoveFrom[i][1].endpoints[idx].id;
                        });
                        global.jsPlumbUtil.addWithFunction(endpointsToPaint, listToRemoveFrom[i][1].endpoints[oIdx], function(e) {
                            return e.id == listToRemoveFrom[i][1].endpoints[oIdx].id;
                        });
                    }
                }
            }

            for (i = 0; i < listToAddTo.length; i++) {
                if (params.idx == 1 && listToAddTo[i][3] === otherElId && firstMatchingElIdx == -1)
                    firstMatchingElIdx = i;
                global.jsPlumbUtil.addWithFunction(connsToPaint, listToAddTo[i][1], function(c) {
                    return c.id == listToAddTo[i][1].id;
                });
                global.jsPlumbUtil.addWithFunction(endpointsToPaint, listToAddTo[i][1].endpoints[idx], function(e) {
                    return e.id == listToAddTo[i][1].endpoints[idx].id;
                });
                global.jsPlumbUtil.addWithFunction(endpointsToPaint, listToAddTo[i][1].endpoints[oIdx], function(e) {
                    return e.id == listToAddTo[i][1].endpoints[oIdx].id;
                });
            }
            if (exactIdx != -1) {
                listToAddTo[exactIdx] = values;
            } else {
                var insertIdx = reverse ? firstMatchingElIdx != -1 ? firstMatchingElIdx : 0 : listToAddTo.length; // of course we will get this from having looked through the array shortly.
                listToAddTo.splice(insertIdx, 0, values);
            }

            // store this for next time.
            endpoint._continuousAnchorEdge = edgeId;
        };

        //
        // find the entry in an endpoint's list for this connection and update its target endpoint
        // with the current target in the connection.
        // 
        //
        this.updateOtherEndpoint = function(elId, oldTargetId, newTargetId, connection) {
            var sIndex = global.jsPlumbUtil.findWithFunction(connectionsByElementId[elId], function(i) {
                    return i[0].id === connection.id;
                }),
                tIndex = global.jsPlumbUtil.findWithFunction(connectionsByElementId[oldTargetId], function(i) {
                    return i[0].id === connection.id;
                });

            // update or add data for source
            if (sIndex != -1) {
                connectionsByElementId[elId][sIndex][0] = connection;
                connectionsByElementId[elId][sIndex][1] = connection.endpoints[1];
                connectionsByElementId[elId][sIndex][2] = connection.endpoints[1].anchor.constructor == global.jsPlumb.DynamicAnchor;
            }

            // remove entry for previous target (if there)
            if (tIndex > -1) {
                connectionsByElementId[oldTargetId].splice(tIndex, 1);
                // add entry for new target
                global.jsPlumbUtil.addToList(connectionsByElementId, newTargetId, [connection, connection.endpoints[0], connection.endpoints[0].anchor.constructor == global.jsPlumb.DynamicAnchor]);
            }
        };

        //
        // notification that the connection given has changed source from the originalId to the newId.
        // This involves:
        // 1. removing the connection from the list of connections stored for the originalId
        // 2. updating the source information for the target of the connection
        // 3. re-registering the connection in connectionsByElementId with the newId
        //
        this.sourceChanged = function(originalId, newId, connection) {
            if (originalId !== newId) {
                // remove the entry that points from the old source to the target
                global.jsPlumbUtil.removeWithFunction(connectionsByElementId[originalId], function(info) {
                    return info[0].id === connection.id;
                });
                // find entry for target and update it
                var tIdx = global.jsPlumbUtil.findWithFunction(connectionsByElementId[connection.targetId], function(i) {
                    return i[0].id === connection.id;
                });
                if (tIdx > -1) {
                    connectionsByElementId[connection.targetId][tIdx][0] = connection;
                    connectionsByElementId[connection.targetId][tIdx][1] = connection.endpoints[0];
                    connectionsByElementId[connection.targetId][tIdx][2] = connection.endpoints[0].anchor.constructor == global.jsPlumb.DynamicAnchor;
                }
                // add entry for new source
                global.jsPlumbUtil.addToList(connectionsByElementId, newId, [connection, connection.endpoints[1], connection.endpoints[1].anchor.constructor == global.jsPlumb.DynamicAnchor]);
            }
        };

        //
        // moves the given endpoint from `currentId` to `element`.
        // This involves:
        //
        // 1. changing the key in _amEndpoints under which the endpoint is stored
        // 2. changing the source or target values in all of the endpoint's connections
        // 3. changing the array in connectionsByElementId in which the endpoint's connections
        //    are stored (done by either sourceChanged or updateOtherEndpoint)
        //
        this.rehomeEndpoint = function(ep, currentId, element) {
            var eps = _amEndpoints[currentId] || [],
                elementId = global.jsPlumbInstance.getId(element);

            if (elementId !== currentId) {
                var idx = global.jsPlumbUtil.indexOf(eps, ep);
                if (idx > -1) {
                    var _ep = eps.splice(idx, 1)[0];
                    self.add(_ep, elementId);
                }
            }

            for (var i = 0; i < ep.connections.length; i++) {
                if (ep.connections[i].sourceId == currentId) {
                    ep.connections[i].sourceId = ep.elementId;
                    ep.connections[i].source = ep.element;
                    self.sourceChanged(currentId, ep.elementId, ep.connections[i]);
                } else if (ep.connections[i].targetId == currentId) {
                    ep.connections[i].targetId = ep.elementId;
                    ep.connections[i].target = ep.element;
                    self.updateOtherEndpoint(ep.connections[i].sourceId, currentId, ep.elementId, ep.connections[i]);
                }
            }
        };

        this.redraw = function(elementId, ui, timestamp, offsetToUI, clearEdits, doNotRecalcEndpoint) {

            if (!global.jsPlumbInstance.isSuspendDrawing()) {
                // get all the endpoints for this element
                var ep = _amEndpoints[elementId] || [],
                    endpointConnections = connectionsByElementId[elementId] || [],
                    connectionsToPaint = [],
                    endpointsToPaint = [],
                    anchorsToUpdate = [];

                timestamp = timestamp || global.jsPlumbInstance.timestamp();
                // offsetToUI are values that would have been calculated in the dragManager when registering
                // an endpoint for an element that had a parent (somewhere in the hierarchy) that had been
                // registered as draggable.
                offsetToUI = offsetToUI || {
                    left: 0,
                    top: 0
                };
                if (ui) {
                    ui = {
                        left: ui.left + offsetToUI.left,
                        top: ui.top + offsetToUI.top
                    };
                }

                // valid for one paint cycle.
                var myOffset = global.jsPlumbInstance.updateOffset({
                        elId: elementId,
                        offset: ui,
                        recalc: false,
                        timestamp: timestamp
                    }),
                    orientationCache = {};

                // actually, first we should compute the orientation of this element to all other elements to which
                // this element is connected with a continuous anchor (whether both ends of the connection have
                // a continuous anchor or just one)

                for (var i = 0; i < endpointConnections.length; i++) {
                    var conn = endpointConnections[i][0],
                        sourceId = conn.sourceId,
                        targetId = conn.targetId,
                        sourceContinuous = conn.endpoints[0].anchor.isContinuous,
                        targetContinuous = conn.endpoints[1].anchor.isContinuous;

                    if (sourceContinuous || targetContinuous) {
                        var oKey = sourceId + "_" + targetId,
                            oKey2 = targetId + "_" + sourceId,
                            o = orientationCache[oKey],
                            oIdx = conn.sourceId == elementId ? 1 : 0;

                        if (sourceContinuous && !anchorLists[sourceId]) anchorLists[sourceId] = {
                            top: [],
                            right: [],
                            bottom: [],
                            left: []
                        };
                        if (targetContinuous && !anchorLists[targetId]) anchorLists[targetId] = {
                            top: [],
                            right: [],
                            bottom: [],
                            left: []
                        };

                        if (elementId != targetId) global.jsPlumbInstance.updateOffset({
                            elId: targetId,
                            timestamp: timestamp
                        });
                        if (elementId != sourceId) global.jsPlumbInstance.updateOffset({
                            elId: sourceId,
                            timestamp: timestamp
                        });

                        var td = global.jsPlumbInstance.getCachedData(targetId),
                            sd = global.jsPlumbInstance.getCachedData(sourceId);

                        if (targetId == sourceId && (sourceContinuous || targetContinuous)) {
                            // here we may want to improve this by somehow determining the face we'd like
                            // to put the connector on.  ideally, when drawing, the face should be calculated
                            // by determining which face is closest to the point at which the mouse button
                            // was released.  for now, we're putting it on the top face.                            
                            _updateAnchorList(
                                anchorLists[sourceId], -Math.PI / 2,
                                0,
                                conn,
                                false,
                                targetId,
                                0, false, "top", sourceId, connectionsToPaint, endpointsToPaint);
                        } else {
                            if (!o) {
                                o = calculateOrientation(sourceId, targetId, sd.o, td.o, conn.endpoints[0].anchor, conn.endpoints[1].anchor);
                                orientationCache[oKey] = o;
                                // this would be a performance enhancement, but the computed angles need to be clamped to
                                //the (-PI/2 -> PI/2) range in order for the sorting to work properly.
                                /*  orientationCache[oKey2] = {
		                            orientation:o.orientation,
		                            a:[o.a[1], o.a[0]],
		                            theta:o.theta + Math.PI,
		                            theta2:o.theta2 + Math.PI
		                        };*/
                            }
                            if (sourceContinuous) _updateAnchorList(anchorLists[sourceId], o.theta, 0, conn, false, targetId, 0, false, o.a[0], sourceId, connectionsToPaint, endpointsToPaint);
                            if (targetContinuous) _updateAnchorList(anchorLists[targetId], o.theta2, -1, conn, true, sourceId, 1, true, o.a[1], targetId, connectionsToPaint, endpointsToPaint);
                        }

                        if (sourceContinuous) global.jsPlumbUtil.addWithFunction(anchorsToUpdate, sourceId, function(a) {
                            return a === sourceId;
                        });
                        if (targetContinuous) global.jsPlumbUtil.addWithFunction(anchorsToUpdate, targetId, function(a) {
                            return a === targetId;
                        });
                        global.jsPlumbUtil.addWithFunction(connectionsToPaint, conn, function(c) {
                            return c.id == conn.id;
                        });
                        if ((sourceContinuous && oIdx === 0) || (targetContinuous && oIdx === 1))
                            global.jsPlumbUtil.addWithFunction(endpointsToPaint, conn.endpoints[oIdx], function(e) {
                                return e.id == conn.endpoints[oIdx].id;
                            });
                    }
                }

                // place Endpoints whose anchors are continuous but have no Connections
                for (i = 0; i < ep.length; i++) {
                    if (ep[i].connections.length === 0 && ep[i].anchor.isContinuous) {
                        if (!anchorLists[elementId]) anchorLists[elementId] = {
                            top: [],
                            right: [],
                            bottom: [],
                            left: []
                        };
                        _updateAnchorList(anchorLists[elementId], -Math.PI / 2, 0, {
                            endpoints: [ep[i], ep[i]],
                            paint: function() {}
                        }, false, elementId, 0, false, ep[i].anchor.getDefaultFace(), elementId, connectionsToPaint, endpointsToPaint);
                        global.jsPlumbUtil.addWithFunction(anchorsToUpdate, elementId, function(a) {
                            return a === elementId;
                        });
                    }
                }


                // now place all the continuous anchors we need to;
                for (i = 0; i < anchorsToUpdate.length; i++) {
                    placeAnchors(anchorsToUpdate[i], anchorLists[anchorsToUpdate[i]]);
                }

                // now that continuous anchors have been placed, paint all the endpoints for this element
                // TODO performance: add the endpoint ids to a temp array, and then when iterating in the next
                // loop, check that we didn't just paint that endpoint. we can probably shave off a few more milliseconds this way.
                for (i = 0; i < ep.length; i++) {
                    ep[i].paint({
                        timestamp: timestamp,
                        offset: myOffset,
                        dimensions: myOffset.s,
                        recalc: doNotRecalcEndpoint !== true
                    });
                }

                // ... and any other endpoints we came across as a result of the continuous anchors.
                for (i = 0; i < endpointsToPaint.length; i++) {
                    var cd = global.jsPlumbInstance.getCachedData(endpointsToPaint[i].elementId);
                    endpointsToPaint[i].paint({
                        timestamp: timestamp,
                        offset: cd,
                        dimensions: cd.s
                    });
                }

                // paint all the standard and "dynamic connections", which are connections whose other anchor is
                // static and therefore does need to be recomputed; we make sure that happens only one time.

                // TODO we could have compiled a list of these in the first pass through connections; might save some time.
                for (i = 0; i < endpointConnections.length; i++) {
                    var otherEndpoint = endpointConnections[i][1];
                    if (otherEndpoint.anchor.constructor == global.jsPlumb.DynamicAnchor) {
                        otherEndpoint.paint({
                            elementWithPrecedence: elementId,
                            timestamp: timestamp
                        });
                        global.jsPlumbUtil.addWithFunction(connectionsToPaint, endpointConnections[i][0], function(c) {
                            return c.id == endpointConnections[i][0].id;
                        });
                        // all the connections for the other endpoint now need to be repainted
                        for (var k = 0; k < otherEndpoint.connections.length; k++) {
                            if (otherEndpoint.connections[k] !== endpointConnections[i][0])
                                global.jsPlumbUtil.addWithFunction(connectionsToPaint, otherEndpoint.connections[k], function(c) {
                                    return c.id == otherEndpoint.connections[k].id;
                                });
                        }
                    } else if (otherEndpoint.anchor.constructor == global.jsPlumb.Anchor) {
                        global.jsPlumbUtil.addWithFunction(connectionsToPaint, endpointConnections[i][0], function(c) {
                            return c.id == endpointConnections[i][0].id;
                        });
                    }
                }

                // paint current floating connection for this element, if there is one.
                var fc = floatingConnections[elementId];
                if (fc)
                    fc.paint({
                        timestamp: timestamp,
                        recalc: false,
                        elId: elementId
                    });

                // paint all the connections
                for (i = 0; i < connectionsToPaint.length; i++) {
                    connectionsToPaint[i].paint({
                        elId: elementId,
                        timestamp: timestamp,
                        recalc: false,
                        clearEdits: clearEdits
                    });
                }
            }
        };

        var ContinuousAnchor = function(anchorParams) {
            global.jsPlumbUtil.EventGenerator.apply(this);
            this.type = "Continuous";
            this.isDynamic = true;
            this.isContinuous = true;
            var faces = anchorParams.faces || ["top", "right", "bottom", "left"],
                clockwise = !(anchorParams.clockwise === false),
                availableFaces = {},
                opposites = {
                    "top": "bottom",
                    "right": "left",
                    "left": "right",
                    "bottom": "top"
                },
                clockwiseOptions = {
                    "top": "right",
                    "right": "bottom",
                    "left": "top",
                    "bottom": "left"
                },
                antiClockwiseOptions = {
                    "top": "left",
                    "right": "top",
                    "left": "bottom",
                    "bottom": "right"
                },
                secondBest = clockwise ? clockwiseOptions : antiClockwiseOptions,
                lastChoice = clockwise ? antiClockwiseOptions : clockwiseOptions,
                cssClass = anchorParams.cssClass || "";

            for (var i = 0; i < faces.length; i++) {
                availableFaces[faces[i]] = true;
            }

            this.getDefaultFace = function() {
                return faces.length === 0 ? "top" : faces[0];
            };

            // if the given edge is supported, returns it. otherwise looks for a substitute that _is_
            // supported. if none supported we also return the request edge.
            this.verifyEdge = function(edge) {
                if (availableFaces[edge]) return edge;
                else if (availableFaces[opposites[edge]]) return opposites[edge];
                else if (availableFaces[secondBest[edge]]) return secondBest[edge];
                else if (availableFaces[lastChoice[edge]]) return lastChoice[edge];
                return edge; // we have to give them something.
            };

            this.isEdgeSupported = function(edge) {
                return availableFaces[edge] === true;
            };

            this.compute = function(params) {
                return userDefinedContinuousAnchorLocations[params.element.id] || continuousAnchorLocations[params.element.id] || [0, 0];
            };
            this.getCurrentLocation = function(params) {
                return userDefinedContinuousAnchorLocations[params.element.id] || continuousAnchorLocations[params.element.id] || [0, 0];
            };
            this.getOrientation = function(endpoint) {
                return continuousAnchorOrientations[endpoint.id] || [0, 0];
            };
            this.clearUserDefinedLocation = function() {
                delete userDefinedContinuousAnchorLocations[anchorParams.elementId];
            };
            this.setUserDefinedLocation = function(loc) {
                userDefinedContinuousAnchorLocations[anchorParams.elementId] = loc;
            };
            this.getCssClass = function() {
                return cssClass;
            };
            this.setCssClass = function(c) {
                cssClass = c;
            };
        };

        // continuous anchors
        global.jsPlumbInstance.continuousAnchorFactory = {
            get: function(params) {
                return new ContinuousAnchor(params);
            },
            clear: function(elementId) {
                delete userDefinedContinuousAnchorLocations[elementId];
                delete continuousAnchorLocations[elementId];
            }
        };
    };

    /**
     * Anchors model a position on some element at which an Endpoint may be located.  They began as a first class citizen of jsPlumb, ie. a user
     * was required to create these themselves, but over time this has been replaced by the concept of referring to them either by name (eg. "TopMiddle"),
     * or by an array describing their coordinates (eg. [ 0, 0.5, 0, -1 ], which is the same as "TopMiddle").  jsPlumb now handles all of the
     * creation of Anchors without user intervention.
     */
    global.jsPlumb.Anchor = function(params) {
        this.x = params.x || 0;
        this.y = params.y || 0;
        this.elementId = params.elementId;
        this.cssClass = params.cssClass || "";
        this.userDefinedLocation = null;
        this.orientation = params.orientation || [0, 0];

        global.jsPlumbUtil.EventGenerator.apply(this);

        var jsPlumbInstance = params.jsPlumbInstance; //,
        //lastTimestamp = null;//, lastReturnValue = null;

        this.lastReturnValue = null;
        this.offsets = params.offsets || [0, 0];
        this.timestamp = null;
        this.compute = function(params) {

            var xy = params.xy,
                wh = params.wh,
                element = params.element,
                timestamp = params.timestamp;

            if (params.clearUserDefinedLocation)
                this.userDefinedLocation = null;

            if (timestamp && timestamp === self.timestamp)
                return this.lastReturnValue;

            if (this.userDefinedLocation !== null) {
                this.lastReturnValue = this.userDefinedLocation;
            } else {
                this.lastReturnValue = [xy[0] + (this.x * wh[0]) + this.offsets[0], xy[1] + (this.y * wh[1]) + this.offsets[1]];
            }

            this.timestamp = timestamp;
            return this.lastReturnValue;
        };

        this.getCurrentLocation = function(params) {
            return (this.lastReturnValue === null || (params.timestamp !== null && this.timestamp != params.timestamp)) ? this.compute(params) : this.lastReturnValue;
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Anchor, global.jsPlumbUtil.EventGenerator, {
        equals: function(anchor) {
            if (!anchor) return false;
            var ao = anchor.getOrientation(),
                o = this.getOrientation();
            return this.x == anchor.x && this.y == anchor.y && this.offsets[0] == anchor.offsets[0] && this.offsets[1] == anchor.offsets[1] && o[0] == ao[0] && o[1] == ao[1];
        },
        getUserDefinedLocation: function() {
            return this.userDefinedLocation;
        },
        setUserDefinedLocation: function(l) {
            this.userDefinedLocation = l;
        },
        clearUserDefinedLocation: function() {
            this.userDefinedLocation = null;
        },
        getOrientation: function(_endpoint) {
            return this.orientation;
        },
        getCssClass: function() {
            return this.cssClass;
        }
    });

    /**
     * An Anchor that floats. its orientation is computed dynamically from
     * its position relative to the anchor it is floating relative to.  It is used when creating
     * a connection through drag and drop.
     *
     * TODO FloatingAnchor could totally be refactored to extend Anchor just slightly.
     */
    global.jsPlumb.FloatingAnchor = function(params) {

        global.jsPlumb.Anchor.apply(this, arguments);

        // this is the anchor that this floating anchor is referenced to for
        // purposes of calculating the orientation.
        var ref = params.reference,
            jsPlumbInstance = params.jsPlumbInstance,
            // the canvas this refers to.
            refCanvas = params.referenceCanvas,
            size = global.jsPlumb.getSize(refCanvas),
            // these are used to store the current relative position of our
            // anchor wrt the reference anchor. they only indicate
            // direction, so have a value of 1 or -1 (or, very rarely, 0). these
            // values are written by the compute method, and read
            // by the getOrientation method.
            xDir = 0,
            yDir = 0,
            // temporary member used to store an orientation when the floating
            // anchor is hovering over another anchor.
            orientation = null,
            _lastResult = null;

        // clear from parent. we want floating anchor orientation to always be computed.
        this.orientation = null;

        // set these to 0 each; they are used by certain types of connectors in the loopback case,
        // when the connector is trying to clear the element it is on. but for floating anchor it's not
        // very important.
        this.x = 0;
        this.y = 0;

        this.isFloating = true;

        this.compute = function(params) {
            var xy = params.xy,
                element = params.element,
                result = [xy[0] + (size[0] / 2), xy[1] + (size[1] / 2)]; // return origin of the element. we may wish to improve this so that any object can be the drag proxy.
            _lastResult = result;
            return result;
        };

        this.getOrientation = function(_endpoint) {
            if (orientation) return orientation;
            else {
                var o = ref.getOrientation(_endpoint);
                // here we take into account the orientation of the other
                // anchor: if it declares zero for some direction, we declare zero too. this might not be the most awesome. perhaps we can come
                // up with a better way. it's just so that the line we draw looks like it makes sense. maybe this wont make sense.
                return [Math.abs(o[0]) * xDir * -1,
                    Math.abs(o[1]) * yDir * -1
                ];
            }
        };

        /**
         * notification the endpoint associated with this anchor is hovering
         * over another anchor; we want to assume that anchor's orientation
         * for the duration of the hover.
         */
        this.over = function(anchor, endpoint) {
            orientation = anchor.getOrientation(endpoint);
        };

        /**
         * notification the endpoint associated with this anchor is no
         * longer hovering over another anchor; we should resume calculating
         * orientation as we normally do.
         */
        this.out = function() {
            orientation = null;
        };

        this.getCurrentLocation = function(params) {
            return _lastResult === null ? this.compute(params) : _lastResult;
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.FloatingAnchor, global.jsPlumb.Anchor);

    var _convertAnchor = function(anchor, jsPlumbInstance, elementId) {
        return anchor.constructor == global.jsPlumb.Anchor ? anchor : global.jsPlumbInstance.makeAnchor(anchor, elementId, jsPlumbInstance);
    };

    /* 
     * A DynamicAnchor is an Anchor that contains a list of other Anchors, which it cycles
     * through at compute time to find the one that is located closest to
     * the center of the target element, and returns that Anchor's compute
     * method result. this causes endpoints to follow each other with
     * respect to the orientation of their target elements, which is a useful
     * feature for some applications.
     *
     */
    global.jsPlumb.DynamicAnchor = function(params) {
        global.jsPlumb.Anchor.apply(this, arguments);

        this.isSelective = true;
        this.isDynamic = true;
        this.anchors = [];
        this.elementId = params.elementId;
        this.jsPlumbInstance = params.jsPlumbInstance;

        for (var i = 0; i < params.anchors.length; i++)
            this.anchors[i] = _convertAnchor(params.anchors[i], this.jsPlumbInstance, this.elementId);
        this.addAnchor = function(anchor) {
            this.anchors.push(_convertAnchor(anchor, this.jsPlumbInstance, this.elementId));
        };
        this.getAnchors = function() {
            return this.anchors;
        };
        this.locked = false;
        var _curAnchor = this.anchors.length > 0 ? this.anchors[0] : null,
            _curIndex = this.anchors.length > 0 ? 0 : -1,
            _lastAnchor = _curAnchor,
            self = this,

            // helper method to calculate the distance between the centers of the two elements.
            _distance = function(anchor, cx, cy, xy, wh) {
                var ax = xy[0] + (anchor.x * wh[0]),
                    ay = xy[1] + (anchor.y * wh[1]),
                    acx = xy[0] + (wh[0] / 2),
                    acy = xy[1] + (wh[1] / 2);
                return (Math.sqrt(Math.pow(cx - ax, 2) + Math.pow(cy - ay, 2)) +
                    Math.sqrt(Math.pow(acx - ax, 2) + Math.pow(acy - ay, 2)));
            },
            // default method uses distance between element centers.  you can provide your own method in the dynamic anchor
            // constructor (and also to global.jsPlumb.makeDynamicAnchor). the arguments to it are four arrays: 
            // xy - xy loc of the anchor's element
            // wh - anchor's element's dimensions
            // txy - xy loc of the element of the other anchor in the connection
            // twh - dimensions of the element of the other anchor in the connection.
            // anchors - the list of selectable anchors
            _anchorSelector = params.selector || function(xy, wh, txy, twh, anchors) {
                var cx = txy[0] + (twh[0] / 2),
                    cy = txy[1] + (twh[1] / 2);
                var minIdx = -1,
                    minDist = Infinity;
                for (var i = 0; i < anchors.length; i++) {
                    var d = _distance(anchors[i], cx, cy, xy, wh);
                    if (d < minDist) {
                        minIdx = i + 0;
                        minDist = d;
                    }
                }
                return anchors[minIdx];
            };

        this.compute = function(params) {
            var xy = params.xy,
                wh = params.wh,
                timestamp = params.timestamp,
                txy = params.txy,
                twh = params.twh;

            this.timestamp = timestamp;

            var udl = self.getUserDefinedLocation();
            if (udl !== null) {
                return udl;
            }

            // if anchor is locked or an opposite element was not given, we
            // maintain our state. anchor will be locked
            // if it is the source of a drag and drop.
            if (this.locked || txy === null || twh === null)
                return _curAnchor.compute(params);
            else
                params.timestamp = null; // otherwise clear this, i think. we want the anchor to compute.

            _curAnchor = _anchorSelector(xy, wh, txy, twh, this.anchors);
            this.x = _curAnchor.x;
            this.y = _curAnchor.y;

            if (_curAnchor != _lastAnchor)
                this.fire("anchorChanged", _curAnchor);

            _lastAnchor = _curAnchor;

            return _curAnchor.compute(params);
        };

        this.getCurrentLocation = function(params) {
            return this.getUserDefinedLocation() || (_curAnchor !== null ? _curAnchor.getCurrentLocation(params) : null);
        };

        this.getOrientation = function(_endpoint) {
            return _curAnchor !== null ? _curAnchor.getOrientation(_endpoint) : [0, 0];
        };
        this.over = function(anchor, endpoint) {
            if (_curAnchor !== null) _curAnchor.over(anchor, endpoint);
        };
        this.out = function() {
            if (_curAnchor !== null) _curAnchor.out();
        };

        this.getCssClass = function() {
            return (_curAnchor && _curAnchor.getCssClass()) || "";
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.DynamicAnchor, global.jsPlumb.Anchor);

    // -------- basic anchors ------------------    
    var _curryAnchor = function(x, y, ox, oy, type, fnInit) {
        global.jsPlumb.Anchors[type] = function(params) {
            var a = params.jsPlumbInstance.makeAnchor([x, y, ox, oy, 0, 0], params.elementId, params.jsPlumbInstance);
            a.type = type;
            if (fnInit) fnInit(a, params);
            return a;
        };
    };

    _curryAnchor(0.5, 0, 0, -1, "TopCenter");
    _curryAnchor(0.5, 1, 0, 1, "BottomCenter");
    _curryAnchor(0, 0.5, -1, 0, "LeftMiddle");
    _curryAnchor(1, 0.5, 1, 0, "RightMiddle");
    // from 1.4.2: Top, Right, Bottom, Left
    _curryAnchor(0.5, 0, 0, -1, "Top");
    _curryAnchor(0.5, 1, 0, 1, "Bottom");
    _curryAnchor(0, 0.5, -1, 0, "Left");
    _curryAnchor(1, 0.5, 1, 0, "Right");
    _curryAnchor(0.5, 0.5, 0, 0, "Center");
    _curryAnchor(1, 0, 0, -1, "TopRight");
    _curryAnchor(1, 1, 0, 1, "BottomRight");
    _curryAnchor(0, 0, 0, -1, "TopLeft");
    _curryAnchor(0, 1, 0, 1, "BottomLeft");

    // ------- dynamic anchors -------------------    

    // default dynamic anchors chooses from Top, Right, Bottom, Left
    global.jsPlumb.Defaults.DynamicAnchors = function(params) {
        return params.jsPlumbInstance.makeAnchors(["TopCenter", "RightMiddle", "BottomCenter", "LeftMiddle"], params.elementId, params.jsPlumbInstance);
    };

    // default dynamic anchors bound to name 'AutoDefault'
    global.jsPlumb.Anchors.AutoDefault = function(params) {
        var a = params.jsPlumbInstance.makeDynamicAnchor(global.jsPlumb.Defaults.DynamicAnchors(params));
        a.type = "AutoDefault";
        return a;
    };

    // ------- continuous anchors -------------------    

    var _curryContinuousAnchor = function(type, faces) {
        global.jsPlumb.Anchors[type] = function(params) {
            var a = params.jsPlumbInstance.makeAnchor(["Continuous", {
                faces: faces
            }], params.elementId, params.jsPlumbInstance);
            a.type = type;
            return a;
        };
    };

    global.jsPlumb.Anchors.Continuous = function(params) {
        return params.jsPlumbInstance.continuousAnchorFactory.get(params);
    };

    _curryContinuousAnchor("ContinuousLeft", ["left"]);
    _curryContinuousAnchor("ContinuousTop", ["top"]);
    _curryContinuousAnchor("ContinuousBottom", ["bottom"]);
    _curryContinuousAnchor("ContinuousRight", ["right"]);

    // ------- position assign anchors -------------------    

    // this anchor type lets you assign the position at connection time.
    _curryAnchor(0, 0, 0, 0, "Assign", function(anchor, params) {
        // find what to use as the "position finder". the user may have supplied a String which represents
        // the id of a position finder in global.jsPlumb.AnchorPositionFinders, or the user may have supplied the
        // position finder as a function.  we find out what to use and then set it on the anchor.
        var pf = params.position || "Fixed";
        anchor.positionFinder = pf.constructor == String ? params.jsPlumbInstance.AnchorPositionFinders[pf] : pf;
        // always set the constructor params; the position finder might need them later (the Grid one does,
        // for example)
        anchor.constructorParams = params;
    });

    // these are the default anchor positions finders, which are used by the makeTarget function.  supplying
    // a position finder argument to that function allows you to specify where the resulting anchor will
    // be located
    global.jsPlumbInstance.prototype.AnchorPositionFinders = {
        "Fixed": function(dp, ep, es, params) {
            return [(dp.left - ep.left) / es[0], (dp.top - ep.top) / es[1]];
        },
        "Grid": function(dp, ep, es, params) {
            var dx = dp.left - ep.left,
                dy = dp.top - ep.top,
                gx = es[0] / (params.grid[0]),
                gy = es[1] / (params.grid[1]),
                mx = Math.floor(dx / gx),
                my = Math.floor(dy / gy);
            return [((mx * gx) + (gx / 2)) / es[0], ((my * gy) + (gy / 2)) / es[1]];
        }
    };

    // ------- perimeter anchors -------------------    

    global.jsPlumb.Anchors.Perimeter = function(params) {
        params = params || {};
        var anchorCount = params.anchorCount || 60,
            shape = params.shape;

        if (!shape) throw new Error("no shape supplied to Perimeter Anchor type");

        var _circle = function() {
                var r = 0.5,
                    step = Math.PI * 2 / anchorCount,
                    current = 0,
                    a = [];
                for (var i = 0; i < anchorCount; i++) {
                    var x = r + (r * Math.sin(current)),
                        y = r + (r * Math.cos(current));
                    a.push([x, y, 0, 0]);
                    current += step;
                }
                return a;
            },
            _path = function(segments) {
                var anchorsPerFace = anchorCount / segments.length,
                    a = [],
                    _computeFace = function(x1, y1, x2, y2, fractionalLength) {
                        anchorsPerFace = anchorCount * fractionalLength;
                        var dx = (x2 - x1) / anchorsPerFace,
                            dy = (y2 - y1) / anchorsPerFace;
                        for (var i = 0; i < anchorsPerFace; i++) {
                            a.push([
                                x1 + (dx * i),
                                y1 + (dy * i),
                                0,
                                0
                            ]);
                        }
                    };

                for (var i = 0; i < segments.length; i++)
                    _computeFace.apply(null, segments[i]);

                return a;
            },
            _shape = function(faces) {
                var s = [];
                for (var i = 0; i < faces.length; i++) {
                    s.push([faces[i][0], faces[i][1], faces[i][2], faces[i][3], 1 / faces.length]);
                }
                return _path(s);
            },
            _rectangle = function() {
                return _shape([
                    [0, 0, 1, 0],
                    [1, 0, 1, 1],
                    [1, 1, 0, 1],
                    [0, 1, 0, 0]
                ]);
            };

        var _shapes = {
                "Circle": _circle,
                "Ellipse": _circle,
                "Diamond": function() {
                    return _shape([
                        [0.5, 0, 1, 0.5],
                        [1, 0.5, 0.5, 1],
                        [0.5, 1, 0, 0.5],
                        [0, 0.5, 0.5, 0]
                    ]);
                },
                "Rectangle": _rectangle,
                "Square": _rectangle,
                "Triangle": function() {
                    return _shape([
                        [0.5, 0, 1, 1],
                        [1, 1, 0, 1],
                        [0, 1, 0.5, 0]
                    ]);
                },
                "Path": function(params) {
                    var points = params.points,
                        p = [],
                        tl = 0;
                    for (var i = 0; i < points.length - 1; i++) {
                        var l = Math.sqrt(Math.pow(points[i][2] - points[i][0]) + Math.pow(points[i][3] - points[i][1]));
                        tl += l;
                        p.push([points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], l]);
                    }
                    for (var j = 0; j < p.length; j++) {
                        p[j][4] = p[j][4] / tl;
                    }
                    return _path(p);
                }
            },
            _rotate = function(points, amountInDegrees) {
                var o = [],
                    theta = amountInDegrees / 180 * Math.PI;
                for (var i = 0; i < points.length; i++) {
                    var _x = points[i][0] - 0.5,
                        _y = points[i][1] - 0.5;

                    o.push([
                        0.5 + ((_x * Math.cos(theta)) - (_y * Math.sin(theta))),
                        0.5 + ((_x * Math.sin(theta)) + (_y * Math.cos(theta))),
                        points[i][2],
                        points[i][3]
                    ]);
                }
                return o;
            };

        if (!_shapes[shape]) throw new Error("Shape [" + shape + "] is unknown by Perimeter Anchor type");

        var da = _shapes[shape](params);
        if (params.rotation) da = _rotate(da, params.rotation);
        var a = params.jsPlumbInstance.makeDynamicAnchor(da);
        a.type = "Perimeter";
        return a;
    };
})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains the default Connectors, Endpoint and Overlay definitions.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {

    "use strict";

    global.jsPlumb.Segments = {

        /*
         * Class: AbstractSegment
         * A Connector is made up of 1..N Segments, each of which has a Type, such as 'Straight', 'Arc',
         * 'Bezier'. This is new from 1.4.2, and gives us a lot more flexibility when drawing connections: things such
         * as rounded corners for flowchart connectors, for example, or a straight line stub for Bezier connections, are
         * much easier to do now.
         *
         * A Segment is responsible for providing coordinates for painting it, and also must be able to report its length.
         *
         */
        AbstractSegment: function(params) {
            this.params = params;

            /**
             * Function: findClosestPointOnPath
             * Finds the closest point on this segment to the given [x, y],
             * returning both the x and y of the point plus its distance from
             * the supplied point, and its location along the length of the
             * path inscribed by the segment.  This implementation returns
             * Infinity for distance and null values for everything else;
             * subclasses are expected to override.
             */
            this.findClosestPointOnPath = function(x, y) {
                return {
                    d: Infinity,
                    x: null,
                    y: null,
                    l: null
                };
            };

            this.getBounds = function() {
                return {
                    minX: Math.min(params.x1, params.x2),
                    minY: Math.min(params.y1, params.y2),
                    maxX: Math.max(params.x1, params.x2),
                    maxY: Math.max(params.y1, params.y2)
                };
            };
        },
        Straight: function(params) {
            var _super = global.jsPlumb.Segments.AbstractSegment.apply(this, arguments),
                length, m, m2, x1, x2, y1, y2,
                _recalc = function() {
                    length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    m = Biltong.gradient({
                        x: x1,
                        y: y1
                    }, {
                        x: x2,
                        y: y2
                    });
                    m2 = -1 / m;
                };

            this.type = "Straight";

            this.getLength = function() {
                return length;
            };
            this.getGradient = function() {
                return m;
            };

            this.getCoordinates = function() {
                return {
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2
                };
            };
            this.setCoordinates = function(coords) {
                x1 = coords.x1;
                y1 = coords.y1;
                x2 = coords.x2;
                y2 = coords.y2;
                _recalc();
            };
            this.setCoordinates({
                x1: params.x1,
                y1: params.y1,
                x2: params.x2,
                y2: params.y2
            });

            this.getBounds = function() {
                return {
                    minX: Math.min(x1, x2),
                    minY: Math.min(y1, y2),
                    maxX: Math.max(x1, x2),
                    maxY: Math.max(y1, y2)
                };
            };

            /**
             * returns the point on the segment's path that is 'location' along the length of the path, where 'location' is a decimal from
             * 0 to 1 inclusive. for the straight line segment this is simple maths.
             */
            this.pointOnPath = function(location, absolute) {
                if (location === 0 && !absolute)
                    return {
                        x: x1,
                        y: y1
                    };
                else if (location == 1 && !absolute)
                    return {
                        x: x2,
                        y: y2
                    };
                else {
                    var l = absolute ? location > 0 ? location : length + location : location * length;
                    return Biltong.pointOnLine({
                        x: x1,
                        y: y1
                    }, {
                        x: x2,
                        y: y2
                    }, l);
                }
            };

            /**
             * returns the gradient of the segment at the given point - which for us is constant.
             */
            this.gradientAtPoint = function(_) {
                return m;
            };

            /**
             * returns the point on the segment's path that is 'distance' along the length of the path from 'location', where
             * 'location' is a decimal from 0 to 1 inclusive, and 'distance' is a number of pixels.
             * this hands off to jsPlumbUtil to do the maths, supplying two points and the distance.
             */
            this.pointAlongPathFrom = function(location, distance, absolute) {
                var p = this.pointOnPath(location, absolute),
                    farAwayPoint = distance <= 0 ? {
                        x: x1,
                        y: y1
                    } : {
                        x: x2,
                        y: y2
                    };

                /*
                location == 1 ? {
                                        x:x1 + ((x2 - x1) * 10),
                                        y:y1 + ((y1 - y2) * 10)
                                    } : 
                */

                if (distance <= 0 && Math.abs(distance) > 1) distance *= -1;

                return Biltong.pointOnLine(p, farAwayPoint, distance);
            };

            // is c between a and b?
            var within = function(a, b, c) {
                return c >= Math.min(a, b) && c <= Math.max(a, b);
            };
            // find which of a and b is closest to c
            var closest = function(a, b, c) {
                return Math.abs(c - a) < Math.abs(c - b) ? a : b;
            };

            /**
                Function: findClosestPointOnPath
                Finds the closest point on this segment to [x,y]. See
                notes on this method in AbstractSegment.
            */
            this.findClosestPointOnPath = function(x, y) {
                var out = {
                    d: Infinity,
                    x: null,
                    y: null,
                    l: null,
                    x1: x1,
                    x2: x2,
                    y1: y1,
                    y2: y2
                };

                if (m === 0) {
                    out.y = y1;
                    out.x = within(x1, x2, x) ? x : closest(x1, x2, x);
                } else if (m == Infinity || m == -Infinity) {
                    out.x = x1;
                    out.y = within(y1, y2, y) ? y : closest(y1, y2, y);
                } else {
                    // closest point lies on normal from given point to this line.  
                    var b = y1 - (m * x1),
                        b2 = y - (m2 * x),
                        // y1 = m.x1 + b and y1 = m2.x1 + b2
                        // so m.x1 + b = m2.x1 + b2
                        // x1(m - m2) = b2 - b
                        // x1 = (b2 - b) / (m - m2)
                        _x1 = (b2 - b) / (m - m2),
                        _y1 = (m * _x1) + b;

                    out.x = within(x1, x2, _x1) ? _x1 : closest(x1, x2, _x1); //_x1;
                    out.y = within(y1, y2, _y1) ? _y1 : closest(y1, y2, _y1); //_y1;                    
                }

                var fractionInSegment = Biltong.lineLength([out.x, out.y], [x1, y1]);
                out.d = Biltong.lineLength([x, y], [out.x, out.y]);
                out.l = fractionInSegment / length;
                return out;
            };
        },

        /*
            Arc Segment. You need to supply:

            r   -   radius
            cx  -   center x for the arc
            cy  -   center y for the arc
            ac  -   whether the arc is anticlockwise or not. default is clockwise.

            and then either:

            startAngle  -   startAngle for the arc.
            endAngle    -   endAngle for the arc.

            or:

            x1          -   x for start point
            y1          -   y for start point
            x2          -   x for end point
            y2          -   y for end point

        */
        Arc: function(params) {
            var _super = global.jsPlumb.Segments.AbstractSegment.apply(this, arguments),
                _calcAngle = function(_x, _y) {
                    return Biltong.theta([params.cx, params.cy], [_x, _y]);
                },
                _calcAngleForLocation = function(segment, location) {
                    if (segment.anticlockwise) {
                        var sa = segment.startAngle < segment.endAngle ? segment.startAngle + TWO_PI : segment.startAngle,
                            s = Math.abs(sa - segment.endAngle);
                        return sa - (s * location);
                    } else {
                        var ea = segment.endAngle < segment.startAngle ? segment.endAngle + TWO_PI : segment.endAngle,
                            ss = Math.abs(ea - segment.startAngle);

                        return segment.startAngle + (ss * location);
                    }
                },
                TWO_PI = 2 * Math.PI;

            this.radius = params.r;
            this.anticlockwise = params.ac;
            this.type = "Arc";

            if (params.startAngle && params.endAngle) {
                this.startAngle = params.startAngle;
                this.endAngle = params.endAngle;
                this.x1 = params.cx + (this.radius * Math.cos(params.startAngle));
                this.y1 = params.cy + (this.radius * Math.sin(params.startAngle));
                this.x2 = params.cx + (this.radius * Math.cos(params.endAngle));
                this.y2 = params.cy + (this.radius * Math.sin(params.endAngle));
            } else {
                this.startAngle = _calcAngle(params.x1, params.y1);
                this.endAngle = _calcAngle(params.x2, params.y2);
                this.x1 = params.x1;
                this.y1 = params.y1;
                this.x2 = params.x2;
                this.y2 = params.y2;
            }

            if (this.endAngle < 0) this.endAngle += TWO_PI;
            if (this.startAngle < 0) this.startAngle += TWO_PI;

            // segment is used by vml     
            this.segment = Biltong.quadrant([this.x1, this.y1], [this.x2, this.y2]);

            // we now have startAngle and endAngle as positive numbers, meaning the
            // absolute difference (|d|) between them is the sweep (s) of this arc, unless the
            // arc is 'anticlockwise' in which case 's' is given by 2PI - |d|.

            var ea = this.endAngle < this.startAngle ? this.endAngle + TWO_PI : this.endAngle;
            this.sweep = Math.abs(ea - this.startAngle);
            if (this.anticlockwise) this.sweep = TWO_PI - this.sweep;
            var circumference = 2 * Math.PI * this.radius,
                frac = this.sweep / TWO_PI,
                length = circumference * frac;

            this.getLength = function() {
                return length;
            };

            this.getBounds = function() {
                return {
                    minX: params.cx - params.r,
                    maxX: params.cx + params.r,
                    minY: params.cy - params.r,
                    maxY: params.cy + params.r
                };
            };

            var VERY_SMALL_VALUE = 0.0000000001,
                gentleRound = function(n) {
                    var f = Math.floor(n),
                        r = Math.ceil(n);
                    if (n - f < VERY_SMALL_VALUE)
                        return f;
                    else if (r - n < VERY_SMALL_VALUE)
                        return r;
                    return n;
                };

            /**
             * returns the point on the segment's path that is 'location' along the length of the path, where 'location' is a decimal from
             * 0 to 1 inclusive.
             */
            this.pointOnPath = function(location, absolute) {

                if (location === 0) {
                    return {
                        x: this.x1,
                        y: this.y1,
                        theta: this.startAngle
                    };
                } else if (location == 1) {
                    return {
                        x: this.x2,
                        y: this.y2,
                        theta: this.endAngle
                    };
                }

                if (absolute) {
                    location = location / length;
                }

                var angle = _calcAngleForLocation(this, location),
                    _x = params.cx + (params.r * Math.cos(angle)),
                    _y = params.cy + (params.r * Math.sin(angle));

                return {
                    x: gentleRound(_x),
                    y: gentleRound(_y),
                    theta: angle
                };
            };

            /**
             * returns the gradient of the segment at the given point.
             */
            this.gradientAtPoint = function(location, absolute) {
                var p = this.pointOnPath(location, absolute);
                var m = Biltong.normal([params.cx, params.cy], [p.x, p.y]);
                if (!this.anticlockwise && (m == Infinity || m == -Infinity)) m *= -1;
                return m;
            };

            this.pointAlongPathFrom = function(location, distance, absolute) {
                var p = this.pointOnPath(location, absolute),
                    arcSpan = distance / circumference * 2 * Math.PI,
                    dir = this.anticlockwise ? -1 : 1,
                    startAngle = p.theta + (dir * arcSpan),
                    startX = params.cx + (this.radius * Math.cos(startAngle)),
                    startY = params.cy + (this.radius * Math.sin(startAngle));

                return {
                    x: startX,
                    y: startY
                };
            };
        },

        Bezier: function(params) {
            this.curve = [{
                x: params.x1,
                y: params.y1
            }, {
                x: params.cp1x,
                y: params.cp1y
            }, {
                x: params.cp2x,
                y: params.cp2y
            }, {
                x: params.x2,
                y: params.y2
            }];

            var _super = global.jsPlumb.Segments.AbstractSegment.apply(this, arguments);
            // although this is not a strictly rigorous determination of bounds
            // of a bezier curve, it works for the types of curves that this segment
            // type produces.
            this.bounds = {
                minX: Math.min(params.x1, params.x2, params.cp1x, params.cp2x),
                minY: Math.min(params.y1, params.y2, params.cp1y, params.cp2y),
                maxX: Math.max(params.x1, params.x2, params.cp1x, params.cp2x),
                maxY: Math.max(params.y1, params.y2, params.cp1y, params.cp2y)
            };

            this.type = "Bezier";

            var _translateLocation = function(_curve, location, absolute) {
                if (absolute)
                    location = jsBezier.locationAlongCurveFrom(_curve, location > 0 ? 0 : 1, location);

                return location;
            };

            /**
             * returns the point on the segment's path that is 'location' along the length of the path, where 'location' is a decimal from
             * 0 to 1 inclusive.
             */
            this.pointOnPath = function(location, absolute) {
                location = _translateLocation(this.curve, location, absolute);
                return jsBezier.pointOnCurve(this.curve, location);
            };

            /**
             * returns the gradient of the segment at the given point.
             */
            this.gradientAtPoint = function(location, absolute) {
                location = _translateLocation(this.curve, location, absolute);
                return jsBezier.gradientAtPoint(this.curve, location);
            };

            this.pointAlongPathFrom = function(location, distance, absolute) {
                location = _translateLocation(this.curve, location, absolute);
                return jsBezier.pointAlongCurveFrom(this.curve, location, distance);
            };

            this.getLength = function() {
                return jsBezier.getLength(this.curve);
            };

            this.getBounds = function() {
                return this.bounds;
            };
        }
    };

    /*
		Class: AbstractComponent
		Superclass for AbstractConnector and AbstractEndpoint.
	*/
    var AbstractComponent = function() {
        this.resetBounds = function() {
            this.bounds = {
                minX: Infinity,
                minY: Infinity,
                maxX: -Infinity,
                maxY: -Infinity
            };
        };
        this.resetBounds();
    };

    /*
     * Class: AbstractConnector
     * Superclass for all Connectors; here is where Segments are managed.  This is exposed on jsPlumb just so it
     * can be accessed from other files. You should not try to instantiate one of these directly.
     *
     * When this class is asked for a pointOnPath, or gradient etc, it must first figure out which segment to dispatch
     * that request to. This is done by keeping track of the total connector length as segments are added, and also
     * their cumulative ratios to the total length.  Then when the right segment is found it is a simple case of dispatching
     * the request to it (and adjusting 'location' so that it is relative to the beginning of that segment.)
     */
    global.jsPlumb.Connectors.AbstractConnector = function(params) {

        AbstractComponent.apply(this, arguments);

        var segments = [],
            totalLength = 0,
            segmentProportions = [],
            segmentProportionalLengths = [],
            stub = params.stub || 0,
            sourceStub = global.jsPlumbUtil.isArray(stub) ? stub[0] : stub,
            targetStub = global.jsPlumbUtil.isArray(stub) ? stub[1] : stub,
            gap = params.gap || 0,
            sourceGap = global.jsPlumbUtil.isArray(gap) ? gap[0] : gap,
            targetGap = global.jsPlumbUtil.isArray(gap) ? gap[1] : gap,
            userProvidedSegments = null,
            edited = false,
            paintInfo = null;

        // to be overridden by subclasses.
        this.getPath = function() {};
        this.setPath = function(path) {};

        /**
         * Function: findSegmentForPoint
         * Returns the segment that is closest to the given [x,y],
         * null if nothing found.  This function returns a JS
         * object with:
         *
         *   d   -   distance from segment
         *   l   -   proportional location in segment
         *   x   -   x point on the segment
         *   y   -   y point on the segment
         *   s   -   the segment itself.
         */
        this.findSegmentForPoint = function(x, y) {
            var out = {
                d: Infinity,
                s: null,
                x: null,
                y: null,
                l: null
            };
            for (var i = 0; i < segments.length; i++) {
                var _s = segments[i].findClosestPointOnPath(x, y);
                if (_s.d < out.d) {
                    out.d = _s.d;
                    out.l = _s.l;
                    out.x = _s.x;
                    out.y = _s.y;
                    out.s = segments[i];
                    out.x1 = _s.x1;
                    out.x2 = _s.x2;
                    out.y1 = _s.y1;
                    out.y2 = _s.y2;
                    out.index = i;
                }
            }

            return out;
        };

        var _updateSegmentProportions = function() {
                var curLoc = 0;
                for (var i = 0; i < segments.length; i++) {
                    var sl = segments[i].getLength();
                    segmentProportionalLengths[i] = sl / totalLength;
                    segmentProportions[i] = [curLoc, (curLoc += (sl / totalLength))];
                }
            },

            /**
             * returns [segment, proportion of travel in segment, segment index] for the segment
             * that contains the point which is 'location' distance along the entire path, where
             * 'location' is a decimal between 0 and 1 inclusive. in this connector type, paths
             * are made up of a list of segments, each of which contributes some fraction to
             * the total length.
             * From 1.3.10 this also supports the 'absolute' property, which lets us specify a location
             * as the absolute distance in pixels, rather than a proportion of the total path.
             */
            _findSegmentForLocation = function(location, absolute) {
                if (absolute) {
                    location = location > 0 ? location / totalLength : (totalLength + location) / totalLength;
                }
                var idx = segmentProportions.length - 1,
                    inSegmentProportion = 1;
                for (var i = 0; i < segmentProportions.length; i++) {
                    if (segmentProportions[i][1] >= location) {
                        idx = i;
                        // todo is this correct for all connector path types?
                        inSegmentProportion = location == 1 ? 1 : location === 0 ? 0 : (location - segmentProportions[i][0]) / segmentProportionalLengths[i];
                        break;
                    }
                }
                return {
                    segment: segments[idx],
                    proportion: inSegmentProportion,
                    index: idx
                };
            },
            _addSegment = function(conn, type, params) {
                if (params.x1 == params.x2 && params.y1 == params.y2) return;
                var s = new global.jsPlumb.Segments[type](params);
                segments.push(s);
                totalLength += s.getLength();
                conn.updateBounds(s);
            },
            _clearSegments = function() {
                totalLength = segments.length = segmentProportions.length = segmentProportionalLengths.length = 0;
            };

        this.setSegments = function(_segs) {
            userProvidedSegments = [];
            totalLength = 0;
            for (var i = 0; i < _segs.length; i++) {
                userProvidedSegments.push(_segs[i]);
                totalLength += _segs[i].getLength();
            }
        };

        var _prepareCompute = function(params) {
            this.lineWidth = params.lineWidth;
            var segment = Biltong.quadrant(params.sourcePos, params.targetPos),
                swapX = params.targetPos[0] < params.sourcePos[0],
                swapY = params.targetPos[1] < params.sourcePos[1],
                lw = params.lineWidth || 1,
                so = params.sourceEndpoint.anchor.getOrientation(params.sourceEndpoint),
                to = params.targetEndpoint.anchor.getOrientation(params.targetEndpoint),
                x = swapX ? params.targetPos[0] : params.sourcePos[0],
                y = swapY ? params.targetPos[1] : params.sourcePos[1],
                w = Math.abs(params.targetPos[0] - params.sourcePos[0]),
                h = Math.abs(params.targetPos[1] - params.sourcePos[1]);

            // if either anchor does not have an orientation set, we derive one from their relative
            // positions.  we fix the axis to be the one in which the two elements are further apart, and
            // point each anchor at the other element.  this is also used when dragging a new connection.
            if (so[0] === 0 && so[1] === 0 || to[0] === 0 && to[1] === 0) {
                var index = w > h ? 0 : 1,
                    oIndex = [1, 0][index];
                so = [];
                to = [];
                so[index] = params.sourcePos[index] > params.targetPos[index] ? -1 : 1;
                to[index] = params.sourcePos[index] > params.targetPos[index] ? 1 : -1;
                so[oIndex] = 0;
                to[oIndex] = 0;
            }

            var sx = swapX ? w + (sourceGap * so[0]) : sourceGap * so[0],
                sy = swapY ? h + (sourceGap * so[1]) : sourceGap * so[1],
                tx = swapX ? targetGap * to[0] : w + (targetGap * to[0]),
                ty = swapY ? targetGap * to[1] : h + (targetGap * to[1]),
                oProduct = ((so[0] * to[0]) + (so[1] * to[1]));

            var result = {
                sx: sx,
                sy: sy,
                tx: tx,
                ty: ty,
                lw: lw,
                xSpan: Math.abs(tx - sx),
                ySpan: Math.abs(ty - sy),
                mx: (sx + tx) / 2,
                my: (sy + ty) / 2,
                so: so,
                to: to,
                x: x,
                y: y,
                w: w,
                h: h,
                segment: segment,
                startStubX: sx + (so[0] * sourceStub),
                startStubY: sy + (so[1] * sourceStub),
                endStubX: tx + (to[0] * targetStub),
                endStubY: ty + (to[1] * targetStub),
                isXGreaterThanStubTimes2: Math.abs(sx - tx) > (sourceStub + targetStub),
                isYGreaterThanStubTimes2: Math.abs(sy - ty) > (sourceStub + targetStub),
                opposite: oProduct == -1,
                perpendicular: oProduct === 0,
                orthogonal: oProduct == 1,
                sourceAxis: so[0] === 0 ? "y" : "x",
                points: [x, y, w, h, sx, sy, tx, ty]
            };
            result.anchorOrientation = result.opposite ? "opposite" : result.orthogonal ? "orthogonal" : "perpendicular";
            return result;
        };

        this.getSegments = function() {
            return segments;
        };

        this.updateBounds = function(segment) {
            var segBounds = segment.getBounds();
            this.bounds.minX = Math.min(this.bounds.minX, segBounds.minX);
            this.bounds.maxX = Math.max(this.bounds.maxX, segBounds.maxX);
            this.bounds.minY = Math.min(this.bounds.minY, segBounds.minY);
            this.bounds.maxY = Math.max(this.bounds.maxY, segBounds.maxY);
        };

        var dumpSegmentsToConsole = function() {
            console.log("SEGMENTS:");
            for (var i = 0; i < segments.length; i++) {
                console.log(segments[i].type, segments[i].getLength(), segmentProportions[i]);
            }
        };

        this.pointOnPath = function(location, absolute) {
            var seg = _findSegmentForLocation(location, absolute);
            return seg.segment && seg.segment.pointOnPath(seg.proportion, false) || [0, 0];
        };

        this.gradientAtPoint = function(location, absolute) {
            var seg = _findSegmentForLocation(location, absolute);
            return seg.segment && seg.segment.gradientAtPoint(seg.proportion, false) || 0;
        };

        this.pointAlongPathFrom = function(location, distance, absolute) {
            var seg = _findSegmentForLocation(location, absolute);
            // TODO what happens if this crosses to the next segment?
            return seg.segment && seg.segment.pointAlongPathFrom(seg.proportion, distance, false) || [0, 0];
        };

        this.compute = function(params) {
            if (!edited)
                paintInfo = _prepareCompute.call(this, params);

            _clearSegments();
            this._compute(paintInfo, params);
            this.x = paintInfo.points[0];
            this.y = paintInfo.points[1];
            this.w = paintInfo.points[2];
            this.h = paintInfo.points[3];
            this.segment = paintInfo.segment;
            _updateSegmentProportions();
        };

        return {
            addSegment: _addSegment,
            prepareCompute: _prepareCompute,
            sourceStub: sourceStub,
            targetStub: targetStub,
            maxStub: Math.max(sourceStub, targetStub),
            sourceGap: sourceGap,
            targetGap: targetGap,
            maxGap: Math.max(sourceGap, targetGap)
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Connectors.AbstractConnector, AbstractComponent);

    /**
     * Class: Connectors.Straight
     * The Straight connector draws a simple straight line between the two anchor points.  It does not have any constructor parameters.
     */
    var Straight = global.jsPlumb.Connectors.Straight = function() {
        this.type = "Straight";
        var _super = global.jsPlumb.Connectors.AbstractConnector.apply(this, arguments);

        this._compute = function(paintInfo, _) {
            _super.addSegment(this, "Straight", {
                x1: paintInfo.sx,
                y1: paintInfo.sy,
                x2: paintInfo.startStubX,
                y2: paintInfo.startStubY
            });
            _super.addSegment(this, "Straight", {
                x1: paintInfo.startStubX,
                y1: paintInfo.startStubY,
                x2: paintInfo.endStubX,
                y2: paintInfo.endStubY
            });
            _super.addSegment(this, "Straight", {
                x1: paintInfo.endStubX,
                y1: paintInfo.endStubY,
                x2: paintInfo.tx,
                y2: paintInfo.ty
            });
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Connectors.Straight, global.jsPlumb.Connectors.AbstractConnector);
    global.jsPlumb.registerConnectorType(Straight, "Straight");


    // ********************************* END OF CONNECTOR TYPES *******************************************************************

    // ********************************* ENDPOINT TYPES *******************************************************************

    global.jsPlumb.Endpoints.AbstractEndpoint = function(params) {
        AbstractComponent.apply(this, arguments);
        var compute = this.compute = function(anchorPoint, orientation, endpointStyle, connectorPaintStyle) {
            var out = this._compute.apply(this, arguments);
            this.x = out[0];
            this.y = out[1];
            this.w = out[2];
            this.h = out[3];
            this.bounds.minX = this.x;
            this.bounds.minY = this.y;
            this.bounds.maxX = this.x + this.w;
            this.bounds.maxY = this.y + this.h;
            return out;
        };
        return {
            compute: compute,
            cssClass: params.cssClass
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Endpoints.AbstractEndpoint, AbstractComponent);

    /**
     * Class: Endpoints.Dot
     * A round endpoint, with default radius 10 pixels.
     */

    /**
     * Function: Constructor
     *
     * Parameters:
     *
     * 	radius	-	radius of the endpoint.  defaults to 10 pixels.
     */
    global.jsPlumb.Endpoints.Dot = function(params) {
        this.type = "Dot";
        var _super = global.jsPlumb.Endpoints.AbstractEndpoint.apply(this, arguments);
        params = params || {};
        this.radius = params.radius || 10;
        this.defaultOffset = 0.5 * this.radius;
        this.defaultInnerRadius = this.radius / 3;

        this._compute = function(anchorPoint, orientation, endpointStyle, connectorPaintStyle) {
            this.radius = endpointStyle.radius || this.radius;
            var x = anchorPoint[0] - this.radius,
                y = anchorPoint[1] - this.radius,
                w = this.radius * 2,
                h = this.radius * 2;

            if (endpointStyle.strokeStyle) {
                var lw = endpointStyle.lineWidth || 1;
                x -= lw;
                y -= lw;
                w += (lw * 2);
                h += (lw * 2);
            }
            return [x, y, w, h, this.radius];
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Endpoints.Dot, global.jsPlumb.Endpoints.AbstractEndpoint);

    global.jsPlumb.Endpoints.Rectangle = function(params) {
        this.type = "Rectangle";
        var _super = global.jsPlumb.Endpoints.AbstractEndpoint.apply(this, arguments);
        params = params || {};
        this.width = params.width || 20;
        this.height = params.height || 20;

        this._compute = function(anchorPoint, orientation, endpointStyle, connectorPaintStyle) {
            var width = endpointStyle.width || this.width,
                height = endpointStyle.height || this.height,
                x = anchorPoint[0] - (width / 2),
                y = anchorPoint[1] - (height / 2);

            return [x, y, width, height];
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Endpoints.Rectangle, global.jsPlumb.Endpoints.AbstractEndpoint);

    var DOMElementEndpoint = function(params) {
        global.jsPlumb.jsPlumbUIComponent.apply(this, arguments);
        this._jsPlumb.displayElements = [];
    };
    global.jsPlumbUtil.extend(DOMElementEndpoint, global.jsPlumb.jsPlumbUIComponent, {
        getDisplayElements: function() {
            return this._jsPlumb.displayElements;
        },
        appendDisplayElement: function(el) {
            this._jsPlumb.displayElements.push(el);
        }
    });

    /**
     * Class: Endpoints.Image
     * Draws an image as the Endpoint.
     */
    /**
	 * Function: Constructor
	 * 
	 * Parameters:
	 * 
	 * 	src	-	location of the image to use.

    TODO: multiple references to self. not sure quite how to get rid of them entirely. perhaps self = null in the cleanup
    function will suffice

    TODO this class still leaks memory.

	 */
    global.jsPlumb.Endpoints.Image = function(params) {

        this.type = "Image";
        DOMElementEndpoint.apply(this, arguments);
        global.jsPlumb.Endpoints.AbstractEndpoint.apply(this, arguments);

        var _onload = params.onload,
            src = params.src || params.url,
            clazz = params.cssClass ? " " + params.cssClass : "";

        this._jsPlumb.img = new Image();
        this._jsPlumb.ready = false;
        this._jsPlumb.initialized = false;
        this._jsPlumb.deleted = false;
        this._jsPlumb.widthToUse = params.width;
        this._jsPlumb.heightToUse = params.height;
        this._jsPlumb.endpoint = params.endpoint;

        this._jsPlumb.img.onload = function() {
            if (this._jsPlumb !== null) {
                this._jsPlumb.ready = true;
                this._jsPlumb.widthToUse = this._jsPlumb.widthToUse || this._jsPlumb.img.width;
                this._jsPlumb.heightToUse = this._jsPlumb.heightToUse || this._jsPlumb.img.height;
                if (_onload) {
                    _onload(this);
                }
            }
        }.bind(this);

        /*
            Function: setImage
            Sets the Image to use in this Endpoint.  

            Parameters:
            img         -   may be a URL or an Image object
            onload      -   optional; a callback to execute once the image has loaded.
        */
        this._jsPlumb.endpoint.setImage = function(_img, onload) {
            var s = _img.constructor == String ? _img : _img.src;
            _onload = onload;
            this._jsPlumb.img.src = s;

            if (this.canvas !== null)
                this.canvas.setAttribute("src", this._jsPlumb.img.src);
        }.bind(this);

        this._jsPlumb.endpoint.setImage(src, _onload);
        this._compute = function(anchorPoint, orientation, endpointStyle, connectorPaintStyle) {
            this.anchorPoint = anchorPoint;
            if (this._jsPlumb.ready) return [anchorPoint[0] - this._jsPlumb.widthToUse / 2, anchorPoint[1] - this._jsPlumb.heightToUse / 2,
                this._jsPlumb.widthToUse, this._jsPlumb.heightToUse
            ];
            else return [0, 0, 0, 0];
        };

        this.canvas = document.createElement("img");
        this.canvas.style.margin = 0;
        this.canvas.style.padding = 0;
        this.canvas.style.outline = 0;
        this.canvas.style.position = "absolute";
        this.canvas.className = this._jsPlumb.instance.endpointClass + clazz;
        if (this._jsPlumb.widthToUse) this.canvas.setAttribute("width", this._jsPlumb.widthToUse);
        if (this._jsPlumb.heightToUse) this.canvas.setAttribute("height", this._jsPlumb.heightToUse);
        this._jsPlumb.instance.appendElement(this.canvas);

        this.actuallyPaint = function(d, style, anchor) {
            if (!this._jsPlumb.deleted) {
                if (!this._jsPlumb.initialized) {
                    this.canvas.setAttribute("src", this._jsPlumb.img.src);
                    this.appendDisplayElement(this.canvas);
                    this._jsPlumb.initialized = true;
                }
                var x = this.anchorPoint[0] - (this._jsPlumb.widthToUse / 2),
                    y = this.anchorPoint[1] - (this._jsPlumb.heightToUse / 2);
                global.jsPlumbUtil.sizeElement(this.canvas, x, y, this._jsPlumb.widthToUse, this._jsPlumb.heightToUse);
            }
        };

        this.paint = function(style, anchor) {
            if (this._jsPlumb !== null) { // may have been deleted
                if (this._jsPlumb.ready) {
                    this.actuallyPaint(style, anchor);
                } else {
                    global.setTimeout(function() {
                        this.paint(style, anchor);
                    }.bind(this), 200);
                }
            }
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Endpoints.Image, [DOMElementEndpoint, global.jsPlumb.Endpoints.AbstractEndpoint], {
        cleanup: function() {
            this._jsPlumb.deleted = true;
            if (this.canvas) this.canvas.parentNode.removeChild(this.canvas);
            this.canvas = null;
        }
    });

    /*
     * Class: Endpoints.Blank
     * An Endpoint that paints nothing (visible) on the screen.  Supports cssClass and hoverClass parameters like all Endpoints.
     */
    global.jsPlumb.Endpoints.Blank = function(params) {
        var _super = global.jsPlumb.Endpoints.AbstractEndpoint.apply(this, arguments);
        this.type = "Blank";
        DOMElementEndpoint.apply(this, arguments);
        this._compute = function(anchorPoint, orientation, endpointStyle, connectorPaintStyle) {
            return [anchorPoint[0], anchorPoint[1], 10, 0];
        };

        var clazz = params.cssClass ? " " + params.cssClass : "";

        this.canvas = document.createElement("div");
        this.canvas.style.display = "block";
        this.canvas.style.width = "1px";
        this.canvas.style.height = "1px";
        this.canvas.style.background = "transparent";
        this.canvas.style.position = "absolute";
        this.canvas.className = this._jsPlumb.instance.endpointClass + clazz;
        this._jsPlumb.instance.appendElement(this.canvas);

        this.paint = function(style, anchor) {
            global.jsPlumbUtil.sizeElement(this.canvas, this.x, this.y, this.w, this.h);
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Endpoints.Blank, [global.jsPlumb.Endpoints.AbstractEndpoint, DOMElementEndpoint], {
        cleanup: function() {
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
        }
    });

    /*
     * Class: Endpoints.Triangle
     * A triangular Endpoint.
     */
    /*
     * Function: Constructor
     *
     * Parameters:
     *
     * 	width	-	width of the triangle's base.  defaults to 55 pixels.
     * 	height	-	height of the triangle from base to apex.  defaults to 55 pixels.
     */
    global.jsPlumb.Endpoints.Triangle = function(params) {
        this.type = "Triangle";
        global.jsPlumb.Endpoints.AbstractEndpoint.apply(this, arguments);
        params = params || {};
        params.width = params.width || 55;
        params.height = params.height || 55;
        this.width = params.width;
        this.height = params.height;
        this._compute = function(anchorPoint, orientation, endpointStyle, connectorPaintStyle) {
            var width = endpointStyle.width || self.width,
                height = endpointStyle.height || self.height,
                x = anchorPoint[0] - (width / 2),
                y = anchorPoint[1] - (height / 2);
            return [x, y, width, height];
        };
    };
    // ********************************* END OF ENDPOINT TYPES *******************************************************************


    // ********************************* OVERLAY DEFINITIONS ***********************************************************************    

    var AbstractOverlay = global.jsPlumb.Overlays.AbstractOverlay = function(params) {
        this.visible = true;
        this.isAppendedAtTopLevel = true;
        this.component = params.component;
        this.loc = params.location === null ? 0.5 : params.location;
        this.endpointLoc = params.endpointLocation === null ? [0.5, 0.5] : params.endpointLocation;
    };
    AbstractOverlay.prototype = {
        cleanup: function() {
            this.component = null;
            this.canvas = null;
            this.endpointLoc = null;
        },
        setVisible: function(val) {
            this.visible = val;
            this.component.repaint();
        },
        isVisible: function() {
            return this.visible;
        },
        hide: function() {
            this.setVisible(false);
        },
        show: function() {
            this.setVisible(true);
        },
        incrementLocation: function(amount) {
            this.loc += amount;
            this.component.repaint();
        },
        setLocation: function(l) {
            this.loc = l;
            this.component.repaint();
        },
        getLocation: function() {
            return this.loc;
        }
    };


    /*
     * Class: Overlays.Arrow
     *
     * An arrow overlay, defined by four points: the head, the two sides of the tail, and a 'foldback' point at some distance along the length
     * of the arrow that lines from each tail point converge into.  The foldback point is defined using a decimal that indicates some fraction
     * of the length of the arrow and has a default value of 0.623.  A foldback point value of 1 would mean that the arrow had a straight line
     * across the tail.
     */
    /*
     * Function: Constructor
     *
     * Parameters:
     *
     * 	length - distance in pixels from head to tail baseline. default 20.
     * 	width - width in pixels of the tail baseline. default 20.
     * 	fillStyle - style to use when filling the arrow.  defaults to "black".
     * 	strokeStyle - style to use when stroking the arrow. defaults to null, which means the arrow is not stroked.
     * 	lineWidth - line width to use when stroking the arrow. defaults to 1, but only used if strokeStyle is not null.
     * 	foldback - distance (as a decimal from 0 to 1 inclusive) along the length of the arrow marking the point the tail points should fold back to.  defaults to 0.623.
     * 	location - distance (as a decimal from 0 to 1 inclusive) marking where the arrow should sit on the connector. defaults to 0.5.
     * 	direction - indicates the direction the arrow points in. valid values are -1 and 1; 1 is default.
     */
    global.jsPlumb.Overlays.Arrow = function(params) {
        this.type = "Arrow";
        AbstractOverlay.apply(this, arguments);
        this.isAppendedAtTopLevel = false;
        params = params || {};
        var _ju = global.jsPlumbUtil,
            _jg = Biltong;

        this.length = params.length || 20;
        this.width = params.width || 20;
        this.id = params.id;
        var direction = (params.direction || 1) < 0 ? -1 : 1,
            paintStyle = params.paintStyle || {
                lineWidth: 1
            },
            // how far along the arrow the lines folding back in come to. default is 62.3%.
            foldback = params.foldback || 0.623;

        this.computeMaxSize = function() {
            return self.width * 1.5;
        };
        this.draw = function(component, currentConnectionPaintStyle) {

            var hxy, mid, txy, tail, cxy;
            if (component.pointAlongPathFrom) {

                if (_ju.isString(this.loc) || this.loc > 1 || this.loc < 0) {
                    var l = parseInt(this.loc, 10),
                        fromLoc = this.loc < 0 ? 1 : 0;
                    hxy = component.pointAlongPathFrom(fromLoc, l, false);
                    mid = component.pointAlongPathFrom(fromLoc, l - (direction * this.length / 2), false);
                    txy = _jg.pointOnLine(hxy, mid, this.length);
                } else if (this.loc == 1) {
                    hxy = component.pointOnPath(this.loc);
                    mid = component.pointAlongPathFrom(this.loc, -(this.length));
                    txy = _jg.pointOnLine(hxy, mid, this.length);

                    if (direction == -1) {
                        var _ = txy;
                        txy = hxy;
                        hxy = _;
                    }
                } else if (this.loc === 0) {
                    txy = component.pointOnPath(this.loc);
                    mid = component.pointAlongPathFrom(this.loc, this.length);
                    hxy = _jg.pointOnLine(txy, mid, this.length);
                    if (direction == -1) {
                        var __ = txy;
                        txy = hxy;
                        hxy = __;
                    }
                } else {
                    hxy = component.pointAlongPathFrom(this.loc, direction * this.length / 2);
                    mid = component.pointOnPath(this.loc);
                    txy = _jg.pointOnLine(hxy, mid, this.length);
                }

                tail = _jg.perpendicularLineTo(hxy, txy, this.width);
                cxy = _jg.pointOnLine(hxy, txy, foldback * this.length);

                var d = {
                        hxy: hxy,
                        tail: tail,
                        cxy: cxy
                    },
                    strokeStyle = paintStyle.strokeStyle || currentConnectionPaintStyle.strokeStyle,
                    fillStyle = paintStyle.fillStyle || currentConnectionPaintStyle.strokeStyle,
                    lineWidth = paintStyle.lineWidth || currentConnectionPaintStyle.lineWidth;

                return {
                    component: component,
                    d: d,
                    lineWidth: lineWidth,
                    strokeStyle: strokeStyle,
                    fillStyle: fillStyle,
                    minX: Math.min(hxy.x, tail[0].x, tail[1].x),
                    maxX: Math.max(hxy.x, tail[0].x, tail[1].x),
                    minY: Math.min(hxy.y, tail[0].y, tail[1].y),
                    maxY: Math.max(hxy.y, tail[0].y, tail[1].y)
                };
            } else return {
                component: component,
                minX: 0,
                maxX: 0,
                minY: 0,
                maxY: 0
            };
        };
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Overlays.Arrow, AbstractOverlay);

    /*
     * Class: Overlays.PlainArrow
     *
     * A basic arrow.  This is in fact just one instance of the more generic case in which the tail folds back on itself to some
     * point along the length of the arrow: in this case, that foldback point is the full length of the arrow.  so it just does
     * a 'call' to Arrow with foldback set appropriately.
     */
    /*
     * Function: Constructor
     * See <Overlays.Arrow> for allowed parameters for this overlay.
     */
    global.jsPlumb.Overlays.PlainArrow = function(params) {
        params = params || {};
        var p = global.jsPlumb.extend(params, {
            foldback: 1
        });
        global.jsPlumb.Overlays.Arrow.call(this, p);
        this.type = "PlainArrow";
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Overlays.PlainArrow, global.jsPlumb.Overlays.Arrow);

    /*
     * Class: Overlays.Diamond
     *
     * A diamond. Like PlainArrow, this is a concrete case of the more generic case of the tail points converging on some point...it just
     * happens that in this case, that point is greater than the length of the the arrow.
     *
     *      this could probably do with some help with positioning...due to the way it reuses the Arrow paint code, what Arrow thinks is the
     *      center is actually 1/4 of the way along for this guy.  but we don't have any knowledge of pixels at this point, so we're kind of
     *      stuck when it comes to helping out the Arrow class. possibly we could pass in a 'transpose' parameter or something. the value
     *      would be -l/4 in this case - move along one quarter of the total length.
     */
    /*
     * Function: Constructor
     * See <Overlays.Arrow> for allowed parameters for this overlay.
     */
    global.jsPlumb.Overlays.Diamond = function(params) {
        params = params || {};
        var l = params.length || 40,
            p = global.jsPlumb.extend(params, {
                length: l / 2,
                foldback: 2
            });
        global.jsPlumb.Overlays.Arrow.call(this, p);
        this.type = "Diamond";
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Overlays.Diamond, global.jsPlumb.Overlays.Arrow);

    var _getDimensions = function(component, forceRefresh) {
        if (component._jsPlumb.cachedDimensions === null || forceRefresh)
            component._jsPlumb.cachedDimensions = component.getDimensions();
        return component._jsPlumb.cachedDimensions;
    };

    // abstract superclass for overlays that add an element to the DOM.
    var AbstractDOMOverlay = function(params) {
        global.jsPlumb.jsPlumbUIComponent.apply(this, arguments);
        AbstractOverlay.apply(this, arguments);

        // hand off fired events to associated component.
        var _f = this.fire;
        this.fire = function() {
            _f.apply(this, arguments);
            if (this.component) this.component.fire.apply(this.component, arguments);
        };

        this.id = params.id;
        this._jsPlumb.div = null;
        this._jsPlumb.initialised = false;
        this._jsPlumb.component = params.component;
        this._jsPlumb.cachedDimensions = null;
        this._jsPlumb.create = params.create;
        this._jsPlumb.initiallyInvisible = params.visible === false;

        this.getElement = function() {
            if (this._jsPlumb.div === null) {
                var div = this._jsPlumb.div = global.jsPlumb.getDOMElement(this._jsPlumb.create(this._jsPlumb.component));
                div.style.position = "absolute";
                div.className = this._jsPlumb.instance.overlayClass + " " +
                    (this.cssClass ? this.cssClass :
                        params.cssClass ? params.cssClass : "");
                this._jsPlumb.instance.appendElement(div);
                this._jsPlumb.instance.getId(div);
                this.canvas = div;

                // in IE the top left corner is what it placed at the desired location.  This will not
                // be fixed. IE8 is not going to be supported for much longer.
                var ts = "translate(-50%, -50%)";
                div.style.webkitTransform = ts;
                div.style.mozTransform = ts;
                div.style.msTransform = ts;
                div.style.oTransform = ts;
                div.style.transform = ts;

                // write the related component into the created element
                div._jsPlumb = this;

                if (params.visible === false)
                    div.style.display = "none";
            }
            return this._jsPlumb.div;
        };

        this.draw = function(component, currentConnectionPaintStyle, absolutePosition) {
            var td = _getDimensions(this);
            if (td !== null && td.length == 2) {
                var cxy = {
                    x: 0,
                    y: 0
                };

                // absolutePosition would have been set by a call to connection.setAbsoluteOverlayPosition.
                if (absolutePosition) {
                    cxy = {
                        x: absolutePosition[0],
                        y: absolutePosition[1]
                    };
                } else if (component.pointOnPath) {
                    var loc = this.loc,
                        absolute = false;
                    if (global.jsPlumbUtil.isString(this.loc) || this.loc < 0 || this.loc > 1) {
                        loc = parseInt(this.loc, 10);
                        absolute = true;
                    }
                    cxy = component.pointOnPath(loc, absolute); // a connection
                } else {
                    var locToUse = this.loc.constructor == Array ? this.loc : this.endpointLoc;
                    cxy = {
                        x: locToUse[0] * component.w,
                        y: locToUse[1] * component.h
                    };
                }

                var minx = cxy.x - (td[0] / 2),
                    miny = cxy.y - (td[1] / 2);

                return {
                    component: component,
                    d: {
                        minx: minx,
                        miny: miny,
                        td: td,
                        cxy: cxy
                    },
                    minX: minx,
                    maxX: minx + td[0],
                    minY: miny,
                    maxY: miny + td[1]
                };
            } else return {
                minX: 0,
                maxX: 0,
                minY: 0,
                maxY: 0
            };
        };
    };
    global.jsPlumbUtil.extend(AbstractDOMOverlay, [global.jsPlumb.jsPlumbUIComponent, AbstractOverlay], {
        getDimensions: function() {
            // still support the old way, for now, for IE8. But from 2.0.0 this whole method will be gone. 
            return global.jsPlumbUtil.oldIE ? global.jsPlumb.getSize(this.getElement()) : [1, 1];
        },
        setVisible: function(state) {
            this._jsPlumb.div.style.display = state ? "block" : "none";
            // if initially invisible, dimensions are 0,0 and never get updated
            if (state && this._jsPlumb.initiallyInvisible) {
                _getDimensions(this, true);
                this.component.repaint();
                this._jsPlumb.initiallyInvisible = false;
            }
        },
        /*
         * Function: clearCachedDimensions
         * Clears the cached dimensions for the label. As a performance enhancement, label dimensions are
         * cached from 1.3.12 onwards. The cache is cleared when you change the label text, of course, but
         * there are other reasons why the text dimensions might change - if you make a change through CSS, for
         * example, you might change the font size.  in that case you should explicitly call this method.
         */
        clearCachedDimensions: function() {
            this._jsPlumb.cachedDimensions = null;
        },
        cleanup: function() {
            if (this._jsPlumb.div !== null) {
                this._jsPlumb.div._jsPlumb = null;
                this._jsPlumb.instance.removeElement(this._jsPlumb.div);
            }
        },
        computeMaxSize: function() {
            var td = _getDimensions(this);
            return Math.max(td[0], td[1]);
        },
        paint: function(p, containerExtents) {
            if (!this._jsPlumb.initialised) {
                this.getElement();
                p.component.appendDisplayElement(this._jsPlumb.div);
                this._jsPlumb.initialised = true;
            }
            this._jsPlumb.div.style.left = (p.component.x + p.d.minx) + "px";
            this._jsPlumb.div.style.top = (p.component.y + p.d.miny) + "px";
        }
    });

    /*
     * Class: Overlays.Custom
     * A Custom overlay. You supply a 'create' function which returns some DOM element, and jsPlumb positions it.
     * The 'create' function is passed a Connection or Endpoint.
     */
    /*
     * Function: Constructor
     *
     * Parameters:
     * 	create - function for jsPlumb to call that returns a DOM element.
     * 	location - distance (as a decimal from 0 to 1 inclusive) marking where the label should sit on the connector. defaults to 0.5.
     * 	id - optional id to use for later retrieval of this overlay.
     *
     */
    global.jsPlumb.Overlays.Custom = function(params) {
        this.type = "Custom";
        AbstractDOMOverlay.apply(this, arguments);
    };
    global.jsPlumbUtil.extend(global.jsPlumb.Overlays.Custom, AbstractDOMOverlay);

    global.jsPlumb.Overlays.GuideLines = function() {
        var self = this;
        self.length = 50;
        self.lineWidth = 5;
        this.type = "GuideLines";
        AbstractOverlay.apply(this, arguments);
        global.jsPlumb.jsPlumbUIComponent.apply(this, arguments);
        this.draw = function(connector, currentConnectionPaintStyle) {

            var head = connector.pointAlongPathFrom(self.loc, self.length / 2),
                mid = connector.pointOnPath(self.loc),
                tail = Biltong.pointOnLine(head, mid, self.length),
                tailLine = Biltong.perpendicularLineTo(head, tail, 40),
                headLine = Biltong.perpendicularLineTo(tail, head, 20);

            return {
                connector: connector,
                head: head,
                tail: tail,
                headLine: headLine,
                tailLine: tailLine,
                minX: Math.min(head.x, tail.x, headLine[0].x, headLine[1].x),
                minY: Math.min(head.y, tail.y, headLine[0].y, headLine[1].y),
                maxX: Math.max(head.x, tail.x, headLine[0].x, headLine[1].x),
                maxY: Math.max(head.y, tail.y, headLine[0].y, headLine[1].y)
            };
        };

        // this.cleanup = function() { };  // nothing to clean up for GuideLines
    };

    /*
     * Class: Overlays.Label
     
     */
    /*
     * Function: Constructor
     *
     * Parameters:
     * 	cssClass - optional css class string to append to css class. This string is appended "as-is", so you can of course have multiple classes
     *             defined.  This parameter is preferred to using labelStyle, borderWidth and borderStyle.
     * 	label - the label to paint.  May be a string or a function that returns a string.  Nothing will be painted if your label is null or your
     *         label function returns null.  empty strings _will_ be painted.
     * 	location - distance (as a decimal from 0 to 1 inclusive) marking where the label should sit on the connector. defaults to 0.5.
     * 	id - optional id to use for later retrieval of this overlay.
     *
     *
     */
    global.jsPlumb.Overlays.Label = function(params) {
        this.labelStyle = params.labelStyle;

        var labelWidth = null,
            labelHeight = null,
            labelText = null,
            labelPadding = null;
        this.cssClass = this.labelStyle !== null ? this.labelStyle.cssClass : null;
        var p = global.jsPlumb.extend({
            create: function() {
                return document.createElement("div");
            }
        }, params);
        global.jsPlumb.Overlays.Custom.call(this, p);
        this.type = "Label";
        this.label = params.label || "";
        this.labelText = null;
        if (this.labelStyle) {
            var el = this.getElement();
            this.labelStyle.font = this.labelStyle.font || "12px sans-serif";
            el.style.font = this.labelStyle.font;
            el.style.color = this.labelStyle.color || "black";
            if (this.labelStyle.fillStyle) el.style.background = this.labelStyle.fillStyle;
            if (this.labelStyle.borderWidth > 0) {
                var dStyle = this.labelStyle.borderStyle ? this.labelStyle.borderStyle : "black";
                el.style.border = this.labelStyle.borderWidth + "px solid " + dStyle;
            }
            if (this.labelStyle.padding) el.style.padding = this.labelStyle.padding;
        }

    };
    global.jsPlumbUtil.extend(global.jsPlumb.Overlays.Label, global.jsPlumb.Overlays.Custom, {
        cleanup: function() {
            this.div = null;
            this.label = null;
            this.labelText = null;
            this.cssClass = null;
            this.labelStyle = null;
        },
        getLabel: function() {
            return this.label;
        },
        /*
         * Function: setLabel
         * sets the label's, um, label.  you would think i'd call this function
         * 'setText', but you can pass either a Function or a String to this, so
         * it makes more sense as 'setLabel'. This uses innerHTML on the label div, so keep
         * that in mind if you need escaped HTML.
         */
        setLabel: function(l) {
            this.label = l;
            this.labelText = null;
            this.clearCachedDimensions();
            this.update();
            this.component.repaint();
        },
        getDimensions: function() {
            this.update();
            return AbstractDOMOverlay.prototype.getDimensions.apply(this, arguments);
        },
        update: function() {
            if (typeof this.label == "function") {
                var lt = this.label(this);
                this.getElement().innerHTML = lt.replace(/\r\n/g, "<br/>");
            } else {
                if (this.labelText === null) {
                    this.labelText = this.label;
                    this.getElement().innerHTML = this.labelText.replace(/\r\n/g, "<br/>");
                }
            }
        }
    });

    // ********************************* END OF OVERLAY DEFINITIONS ***********************************************************************

})(typeof exports !== undefined ? exports : this);
/*
 * jsPlumb
 *
 * Title:jsPlumb 1.7.2
 *
 * Provides a way to visually connect elements on an HTML page, using SVG or VML.
 *
 * This file contains the base class for library adapters. From 1.7.2 onwards all event management internal to jsPlumb is handled
 * through Mottle, regardless of the underlying library. Dragging - and the events associated with it - is still handled
 * by the library.
 *
 * Copyright (c) 2010 - 2014 Simon Porritt (simon@jsplumbtoolkit.com)
 *
 * http://jsplumbtoolkit.com
 * http://github.com/sporritt/jsplumb
 *
 * Dual licensed under the MIT and GPL2 licenses.
 */
;
(function(global) {
    "use strict";

    var _getEventManager = function(instance) {
        var e = instance._mottle;
        if (!e) {
            e = instance._mottle = new Mottle();
        }
        return e;
    };

    global.jsPlumb.extend(global.jsPlumbInstance.prototype, {
        getEventManager: function() {
            return _getEventManager(this);
        },
        //           EVENTS
        // e.originalEvent is for jQuery; in Vanilla jsPlumb we get the native event.

        on: function(el, event, callback) {
            // TODO: here we would like to map the tap event if we know its
            // an internal bind to a click. we have to know its internal because only
            // then can we be sure that the UP event wont be consumed (tap is a synthesized
            // event from a mousedown followed by a mouseup).
            //event = { "click":"tap", "dblclick":"dbltap"}[event] || event;
            this.getEventManager().on.apply(this, arguments);
        },
        off: function(el, event, callback) {
            this.getEventManager().off.apply(this, arguments);
        }
    });
})(typeof exports !== undefined ? exports : this);