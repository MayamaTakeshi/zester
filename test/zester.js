var z = require('../src/index.js')

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
		em.emit("evt2", {a: 1, b: 2})
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
	},
	{
		source: 'bla',
		name: 'x',
	},
], 2000)

z.sleep('second', 1000)

z.sleep('third', 500)

z.sleep('fourth', 250)

z.run()
