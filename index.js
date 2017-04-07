var util = require('util')

var _steps = []
var _current_step = null

var _expected_events = []

var _queued_events = []

var _interval_id;

var _match = function(expected, received) {
	return true
}

var _process_event_during_wait = function(evt) {
	var i = _expected_events.length
	if(i > 0) {
		while(i--) {
			if(_match(_expected_events[i], evt)) {
				console.log(`Step wait '${_current_step.name}' got expected event ${util.inspect(evt)} while waiting for ${util.inspect(_expected_events)}`)
				_expected_events.splice(i, 1)
				return
			} else {
				console.error(`Step wait '${_current_step.name}' got unexpected event ${util.inspect(evt)} while waiting for ${util.inspect(_expected_events)}`)
				process.exit(1)
			}
		}

		if(_expected_events.length == 0) {
			// all events received
			_current_step = null; // this will signal to function 'run' command to proceed with next step
		}
	}
}

var _process_event_during_sleep = function(evt) {
	console.error(`Step sleep '${_current_step.name}' awakened by unexpected event ${util.inspect(evt)}`)
	process.exit(1)
}

var _do_exec = (step) => {
	try {
		step.fn()
		console.log('Step exec finished')
		_current_step = null
	} catch(e) {
		console.error("$tep exec '${step.name}' failed")
		console.error(e)
	}
}

var _do_wait = (step) => {
	_expected_events = step.events
	while(_queued_events.length > 0) {
		var evt = _queued_events.shift()
		_process_event_during_wait(evt)
	}

	setTimeout(() => {
		if(_expected_events.length > 0) {
			console.error(`Step wait '${step.name}' timeout while waiting for ${util.inspect(_expected_events)}`)
			process.exit(1)
		}
		console.log("All expected events received")
		_current_step = null;
	}, step.timeout)
}

var _do_sleep = (step) => {
	if(_queued_events.length > 0) {
		_process_event_during_sleep(_queued_events[0]);
	}

	setTimeout(() => {
		console.log("sleep timeout. Awakening")
		_current_step = null;
	}, step.timeout)
} 

var _run = () => {
	//console.log("run")
	//console.dir(_steps)
	if(_steps.length == 0) {
		console.log("success")
		process.exit(0)
	}

	if(!_current_step) {
		_queued_events = [];
		_current_step = _steps.shift()
		console.log(`Starting step ${_current_step.type} '${_current_step.name}'`)

		switch(_current_step.type) {	
		case 'exec':
			_do_exec(_current_step)
			break
		case 'wait':
			_do_wait(_current_step)
			break
		case 'sleep':
			_do_sleep(_current_step)
			break
		default:
			console.error(`Unsupported step ${_current_step.type}`)	
			process.exit(1)
		}
	}

	setTimeout(_run, 1)
}

module.exports = {
	trap_events: function(emitter, name) {
		var orig_emit = emitter.emit
		emitter.emit = function() {
			var args = Array.from(arguments)
			var event_name = args.shift()
			var evt = {
				source: name,
				name: event_name,
				args: args, 
			}
			if(_current_step && _current_step.type == 'wait') {
				_process_event_during_wait(evt)
			} else if(_current_step && _current_step.type == 'sleep') {
				_process_event_during_sleep(evt)
			}	else {
				_queued_events.push(evt)
			}
			orig_emit.apply(emitter, arguments)
		}
	},

	exec: (name, fn) => {
		_steps.push({
			type: 'exec',
			name: name,
			fn: fn,
		})
	},

	wait: (name, events, timeout) => {
		_steps.push({
			type: 'wait',
			name: name,
			events: events,
			timeout: timeout,
		});
	},

	sleep: (name, timeout) => {
		_steps.push({
			type: 'sleep',
			name: name,
			timeout: timeout,
		})
	},

	run: _run,
}

