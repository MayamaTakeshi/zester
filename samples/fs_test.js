var z = require('../src/index.js')
var m = require('data-matching')
const assert = require('assert')

fs = require('fs')

for(var i=0; i<10; ++i) {
	var path = "./" + i + ".txt";
	console.log(path)
	fs.readFile(path, 'utf8', z.callback_trap('cb'));

	z.wait([
		{
			source: 'callback',
			name: 'cb',
			args: [
				undefined,
				undefined,
			],
		}	
	], 5000)
}

console.log("Success")
