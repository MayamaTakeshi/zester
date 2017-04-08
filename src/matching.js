
var _absent = () => {}

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

var _match_arrays = (expected, received, dict) => {
	if(expected.length != received.length) throw "Arrays length don't match"

	for(var i=0 ; i<expected.length ; i++) {
		if(!match(expected[i], received[i], dict)) {
			return false
		}	
	}
	return true;
}

var _match_dicts = (expected, received, dict) => {
	var keys_e = new Set(Object.keys(expected))
	var keys_r = new Set(Object.keys(received))

	if(keys_e.length != keys_r.length) throw "Dicts length don't match"

	for(var e of keys_e) {
		if(!keys_r.has(e)) throw "Expected element " + e + " not found"

		if(!match(expected[e], received[e], dict)) throw "No match for element " + e
	}

	return true
}


var match = (expected, received, dict) => {
	var type_e = _typeof(expected)
	var type_r = _typeof(received)

	if(type_e == type_r) {
		if(type_e == 'array') {
			return _match_arrays(expected, received, dict)
		} else if(type_e == 'dict') {
			return _match_dicts(expected, received, dict)
		}
		if(expected != received) throw "Elements don't match"

		return true
	}

	if(type_e == 'function') {
		return expected(received, dict)
	}

	return false
}

module.exports = {
	match: match,
}
