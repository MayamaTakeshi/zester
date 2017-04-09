
var _null = (x) => { return !x ? true : false }

var _nonZero = (x) => {
	if(typeof x != 'number') return false

	return x != 0 
}

var _nonBlankStr = (x) => {
	if(typeof x != 'string') return false

	return x != "" 
}

var _typeof = (v) => {
	var t = typeof v;
	if(t === 'object') {
		if(v instanceof Array)
			return 'array'
		else
			return 'dict'
	} else {
		return t
	}
}

var _match_arrays = (expected, received, dict, full_match) => {
	if(full_match) {
		if(expected.length != received.length) throw "Array lengths don't match"
	}
	for(var i=0 ; i<expected.length ; i++) {
		if(!_match(expected[i], received[i], dict, full_match)) {
			return false
		}	
	}
	return true;
}

var _match_dicts = (expected, received, dict, full_match) => {
	var keys_e = new Set(Object.keys(expected))
	var keys_r = new Set(Object.keys(received))

	for(var key of keys_e) {
		var val_e = expected[key]
		if(val_e == absent) {
			if(keys_r.has(key)) throw "Element " + key + " should be absent"
		} else {
			if(!keys_r.has(key)) throw "Expected element " + key + " not found"
			if(!_match(expected[key], received[key], dict, full_match)) throw "No match for element " + key
		}

		keys_r.delete(key)
	}

	if(full_match) {
		if(keys_r.length > 0) throw "Dict full match failed"
	}
	return true
}

var _match = (expected, received, dict, full_match) => {
	var type_e = _typeof(expected)
	var type_r = _typeof(received)

	if(type_e == undefined) {
		// this means to ignore received value
		return true
	}

	if(type_e == type_r) {
		if(type_e == 'array') {
			return _match_arrays(expected, received, dict, full_match)
		} else if(type_e == 'dict') {
			return _match_dicts(expected, received, dict, full_match)
		}
		if(expected != received) throw "Elements don't match"

		return true
	}

	if(type_e == 'function') {
		return expected(received, dict)
	}

	return false
}

var collect = (var_name, dict) => {
	return (val) => {
		eval(var_name + " = " + val)
		return true
	}
}

var absent = () => {}

var partial_match = (expected, received, dict) => {
	return _match(expected, received, dict, false);
}

var full_match = (expected, received, dict) => {
	return _match(expected, received, dict, true);
}

module.exports = {
	pm: partial_match,
	fm: full_match,

	partial_match: partial_match,
	full_match: full_match,
	collect: collect,
	absent: absent,
}
