var z = require('../src/index.js')
var m = require('../src/matching')
const assert = require('assert')

var EE = require('events')

class MyEmitter extends EE {}

var em = new MyEmitter()

z.trap_events(em, 'my_emitter')

z.exec('one', () => {
	setInterval(function() {
		console.log(new Date);
	}, 1000);
})

z.exec('two', () => {
	setTimeout(() => {
		em.emit("evt1", 'arg1', 'arg2', 'arg3', 4, true, new Date)
	}, 2000)
})

z.exec('three', () => {
	setTimeout(() => {
		em.emit(
			"evt2",
			{
				a: 1,
				b: 2,
				c: {
					AA: 1,
					BB: 2,
					CC: 3,
					DD: {
						AAA: 10,
						BBB: 20,
					},
					EE: 'eeee',
				},
				d: [11,22,33],
			}
		)
	}, 2100)
})

z.exec('three', () => {
	setTimeout(() => {
		em.emit("evt3")
	}, 2000 * 60)
})

z.sleep('first', 1000)

z.wait('some_event', [
	{
		source: 'my_emitter',
		name: 'evt1',
	},
	{
		source: 'my_emitter',
		name: 'evt2',
		args: [
			{
				a: 1,
				b: 2,
				c: {
					AA: 1,
					BB: 2,
					CC: m.collect('the_CC'),
					DD: {
						AAA: 10,
						BBB: 20,
					},
					EE: '!{name}',
				},
				d: m.full_match([11,22,33]),
			},
		],
	},
], 2000)

z.exec('check name', () => {
	console.log("name=" + name)
	assert.equal(name, 'eeee')
	console.log("the_CC=" + the_CC)
	assert.equal(the_CC, 3)
})

z.sleep('second', 250)

z.sleep('third', 500)

z.sleep('fourth', 1000)

z.sleep('fifth', 5000)

z.run()
