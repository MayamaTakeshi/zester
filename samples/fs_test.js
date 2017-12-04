var z = require('../src/index.js')
var m = require('data-matching')
const assert = require('assert')

fs = require('fs')

for(var i=0; i<10; ++i) {
	(() => {
		var x = i;
		z.exec(() => {
			var path = "./" + x + ".txt";
			console.log(path)
			fs.readFile(path, 'utf8', z.callback_trap('cb'));
		})
	})()
	// the above clojure is necessary to save the value of i into x so that it can be used when the function in exec is actually executed.

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

z.run()
