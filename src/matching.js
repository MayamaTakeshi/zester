
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

var isDict = (v) => {
    typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date)
}

var match = (expected, received, dict, strict) => {
	
}
