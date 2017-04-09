// Here we will define zester util functions.

var util = require('util')
var _ = require('lodash')

var chalk = require('chalk')

var _i = (depth) => {
	return "  ".repeat(depth)
}

var _isSimpleType = (x) => {
	var t = typeof(x)
	if(t == 'string' || t == 'bool' || t == 'number' || t == 'undefined' || t == 'null') {
		return true
	} else if(t == 'function') {
		if(x.__original_data__) return false
		else return true
	} else {
		return false
	}
}

var _prettyPrintDictElements = (dict, depth) => {
	return _.join(_.map(dict, 
		(val, key) => { 
			return _i(depth+1) + key + ": " + (_isSimpleType(val) ? util.inspect(val) : _prettyPrint(val, depth+1, true))  
		}
	), ',\n')
}

var _prettyPrintArrayElements = (array, depth) => {
	return _.join(_.map(array, (e) => { 
		return _prettyPrint(e, depth+1)
	}),',\n')
}

var _prettyPrint = (x, depth=0, same_line) => {
	var front_indent = same_line ? '' : _i(depth)
	if(Array.isArray(x)) {
		return front_indent + "[\n" + _prettyPrintArrayElements(x, depth+1) + "\n" + _i(depth) + "]"
	} else if(typeof x == 'function' && x.__original_data__) {
		return front_indent + x.__name__ + "(\n" + _prettyPrintDictElements(x.__original_data__, depth+1) + "\n" + _i(depth) + ")"
	} else if(typeof x == 'object') {
		return front_indent + "{\n" + _prettyPrintDictElements(x, depth+1) + "\n" + _i(depth) + "}"
	} else {
		return _i(depth) + util.inspect(x)
	}
}

module.exports = {
	prettyPrint: _prettyPrint,
}

