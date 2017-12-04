var util = require('util')
var matching = require('data-matching')
var zutil = require('./zutil')
var chalk = require('chalk')

var _steps = []
var _current_step = null

var _expected_events = []

var _queued_events = []

var _interval_id;

var _dict = {}

var _timerId = null

var _event_filters = []

Object.defineProperty(global, '__stack', {
get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__caller_line', {
get: function() {
        return __stack[2].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
get: function() {
        return __stack[1].getFunctionName();
    }
});

var _match = function(expected, received) {
	//console.log("_match got:")
	//console.dir(expected)
	//console.dir(received)
	return expected(received, _dict)
}

var _set_global_vars = (dict) => {
	for(var key in dict) {
		console.log("trying to set " + key)
		var val_type = eval('typeof ' + key)
		var val = dict[key]
		if(val_type == 'undefined') {
			console.log(util.inspect(val))
			eval(key + ' = ' + (typeof val == 'string' ? util.inspect(val) : 'val'))
		} else {
			console.log("key to evaluate: ", key)
			console.log("val : ", val)
			if(util.inspect(eval(key)) != util.inspect(val)) {
				console.error(chalk.red(`Cannot set global var '${key}' to '${val}' as it is already set to '` + eval(key)))
				process.exit(1)
			}
		}
	}
}

var _process_event_during_wait = function(evt) {
	var i = _expected_events.length
	if(i > 0) {
		var last_error
		while(i--) {
			try {
				if(_match(_expected_events[i], evt)) {
					_set_global_vars(_dict)
					console.log(chalk.green(`wait (line ${_current_step.line}) got expected event:`))
					console.log(zutil.prettyPrint(evt, 1))
					//console.log(chalk.green("while waiting for:"))
					//console.log(zutil.prettyPrint(_expected_events))

					// TODO: need to set variables according to data store.
					_expected_events.splice(i, 1)

					if(_expected_events.length == 0) {
						// all events received
						if(_timerId) {
							clearTimeout(_timerId)
						}
						_current_step = null; // this will signal to function 'run' command to proceed with next step
					}
					return
				}
			} catch(e) {	
				last_error = e
				console.error(last_error)
			}
		}

		console.error(chalk.red(`wait (line ${_current_step.line}) got unexpected event:`))
		console.error(zutil.prettyPrint(evt, 1))
		console.error(chalk.red('while waiting for:'))
		console.error(zutil.prettyPrint(_expected_events))
		process.exit(1)
	}
}

var _process_event_during_sleep = function(evt) {
	console.error(chalk.red(`sleep (line ${_current_step.line}) awakened by unexpected event:`))
	console.error(zutil.prettyPrint(evt, 1))
	process.exit(1)
}

var _do_exec = (step) => {
	try {
		step.fn()
		console.log(chalk.green("exec finished"))
		_current_step = null
	} catch(e) {
		console.error(chalk.red(`exec (line ${step.line}) failed`))
		console.error(chalk.red(e))
		process.exit(1)
	}
}

var _do_wait = (step) => {
	_dict = {}
	_expected_events = step.events
	while(_queued_events.length > 0) {
		var evt = _queued_events.shift()
		_process_event_during_wait(evt)
	}

	_timerId = setTimeout(() => {
		if(_expected_events.length > 0) {
			console.error(chalk.red(`wait (line ${step.line}) timed out while waiting for:`))
			console.error(zutil.prettyPrint(_expected_events))
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
		console.log(chalk.green(`sleep (line ${step.line}) timeout. Awakening`))
		_current_step = null
	}, step.timeout)
} 

var _do_add_event_filter = step => {
	_event_filters.push(step.event_filter)
	_current_step = null
}

var _do_remove_event_filter = step => {
	var len = _event_filters.length

	_event_filters = _event_filters.filter(f => {
		return f[0] != step.event_filter;
	})

	if(len == _event_filters.length) {
		console.error(chalk.red(`remove_event_filter (line ${step.line}) failed: filter not found`))
		process.exit(1)
	}
	_current_step = null
}

var _run = () => {
	//console.log("run")
	//console.dir(_steps)
	if(_steps.length == 0 && !_current_step) {
		console.log(chalk.green("Success"))
		process.exit(0)
	}

	if(!_current_step) {
		_current_step = _steps.shift()
		console.log(chalk.green(`Starting ${_current_step.type} (line ${_current_step.line})`))

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
		case 'add_event_filter':
			_do_add_event_filter(_current_step)
			break
		case 'remove_event_filter':
			_do_remove_event_filter(_current_step)
			break
		default:
			console.error(`Unsupported step ${_current_step.type}`)	
			process.exit(1)
		}
	}

	setTimeout(_run, 1)
}

var _should_ignore_event = evt => {
	for (var i=0 ; i<_event_filters.length ; ++i) {
		try {
			if(_match(_event_filters[i][1], evt)) {
				return true					
			}
		} catch(e) {
			//do nothing	
		}
	}
	return false
}

var _handle_event = evt => {
	if(_should_ignore_event(evt)) {
		console.log("Ignoring event:")
		console.log(zutil.prettyPrint(evt, 1))
		return
	}

	if(_current_step && _current_step.type == 'wait') {
		_process_event_during_wait(evt)
	} else if(_current_step && _current_step.type == 'sleep') {
		_process_event_during_sleep(evt)
	} else {
		_queued_events.push(evt)
	}
}

var _check_step = (type, caller_line, params, spec) => {
	if(params.length != spec.length) {
		console.error(chalk.red(`${type} (line ${caller_line}): invalid number of params. Expected ${spec.length}. Got ${params.length}`))
		process.exit(1)
	}

	for(var i=0 ; i<spec.length ; ++i) {
		if(typeof params[i] != spec[i]) {
			console.error(chalk.red(`${type} (line ${caller_line}): invalid type for param ${i+1}. Expected '${spec[i]}'. Got '${typeof params[i]}'`))
			process.exit(1)
		}
	}
}

module.exports = {
	// IMPORTANT: do not change this to '() => {...}' as arguments is not available on arrow functions
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
			_handle_event(evt)
			orig_emit.apply(emitter, arguments)
		}
	},

	// IMPORTANT: do not change this to '() => {...}' as arguments is not available on arrow functions
	callback_trap: function(name) {
		return function() {
			var evt = {
				source: 'callback',
				name: name,
				args: Array.from(arguments),
			}
			_handle_event(evt)
		}
	},

	push_event: function(evt) {
		_handle_event(evt)
	},

	exec: (fn) => {
		_check_step(__function, __caller_line, [fn], ['function']) 
		_steps.push({
			type: __function,
			fn: fn,
			line: __caller_line,
		})
	},

	wait: (events, timeout) => {
		_check_step(__function, __caller_line, [events, timeout], ['object', 'number']) 
		var events2 = []
		for(var i=0 ; i<events.length ; i++) {
			var evt = events[i]
			if(typeof evt == 'function') {
				events2.push(evt)
			} else if (typeof evt == 'array' || typeof evt == 'object') {
				events2.push(matching.partial_match(evt))
			} else {
				console.error(chalk.red(`wait (line ${__line}): invalid event definition ` + evt))
				process.exit(1)
			}
		}

		_steps.push({
			type: __function,
			events: events2,
			timeout: timeout,
			line: __caller_line,
		});
	},

	sleep: (timeout) => {
		_check_step(__function, __caller_line, [timeout], ['number']) 
		_steps.push({
			type: __function,
			timeout: timeout,
			line: __caller_line,
		})
	},

	add_event_filter: (ef) => {
		_check_step(__function, __caller_line, [ef], ['object']) 

		var mf
		if(typeof ef == 'function') {
			mf = ef
		} else if (typeof ef == 'array' || typeof ef == 'object') {
			mf = matching.partial_match(ef)
		} else {
			console.error("Invalid event filter definition for " + __function)
			console.dir(ef)
			process.exit(1)
		}

		_steps.push({
			type: __function,
			event_filter: [ef, mf],
			line: __caller_line,	
		});
	},

	remove_event_filter: (ef) => {
		_check_step(__function, __caller_line, [ef], ['object']) 
		_steps.push({
			type: __function,
			event_filter: ef,
			line: __caller_line,	
		})
	},

	run: _run,

	matching: matching,
}

