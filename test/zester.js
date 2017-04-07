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
		em.emit("something_happened")
	}, 2000)
})

z.exec('three', () => {
	setTimeout(() => {
		em.emit("something_happened2")
	}, 2100)
})

z.exec('three', () => {
	setTimeout(() => {
		em.emit("something_happened3")
	}, 2000 * 60)
})




z.sleep('first', 1000)

z.wait('some_event', [
	{
		source: 'XXX',
		name: 'YYY',
	},
	{
		source: 'XXX',
		name: 'YYY',
	},
], 2000)

z.sleep('second', 1000)

z.sleep('third', 500)

z.sleep('fourth', 250)

z.run()
