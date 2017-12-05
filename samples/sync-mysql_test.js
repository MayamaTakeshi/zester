var z = require('../src/index.js')
var m = require('data-matching')
const assert = require('assert')

var events = require('events')

class MyEmitter extends events {}

var em = new MyEmitter()

z.trap_events(em, 'my_emitter')

setTimeout(() => {
	em.emit("evt1", 'arg1', 'arg2', 'arg3', 4, true, new Date)
}, 100)

z.wait([
	{
		source: 'my_emitter',
		name: 'evt1',
		args: [
			'arg1',
			'arg2',
			'arg3',
			4,
			m.collect('bool'),
			undefined,
		],	
	}
], 500)

console.log(`bool: ${bool}`)


var MySql = require('sync-mysql')

var connection = new MySql({
	host: 'localhost',
	user: 'me',
	password: 'secret',
})

var res = connection.query("SELECT 1 AS val")
assert(res[0].val === 1)


setTimeout(() => {
	em.emit("evt2", 'arg1', 'arg2', 'arg3', 4, true, new Date)
}, 100)

z.wait([
	{
		source: 'my_emitter',
		name: 'evt2',
		args: [
			'arg1',
			'arg2',
			'arg3',
			4,
			m.collect('bool'),
			m.collect('date')
		],	
	}
], 500)

console.log(`bool: ${bool}`)


