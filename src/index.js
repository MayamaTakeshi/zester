var util = require('util')
var matching = require('data-matching')
var zutil = require('./zutil')
var chalk = require('chalk')

var deasync = require('deasync')

var _expected_events = []

var _queued_events = []

var _dict = {}

var _event_filters = []

var _current_op_name = null
var _current_op_line = null

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
	var fileName = __stack[2].getFileName()
        var lineNumber = __stack[2].getLineNumber()
	return fileName + ":" + lineNumber
    }
});

Object.defineProperty(global, '__function', {
get: function() {
        return __stack[1].getFunctionName();
    }
});

var _match = function(expected, received) {
	//print_white("_match got:")
	//console.dir(expected)
	//console.dir(received)
	return expected(received, _dict)
}

var print_white = function(s) {
	console.log(s)
}

var print_green = function(s) {
	console.log(chalk.green(s))
}

var print_red = function(s) {
	console.log(chalk.red(s))
}

var _set_global_vars = (dict) => {
	for(var key in dict) {
		print_white("Trying to set " + key)
		var val_type = eval('typeof ' + key)
		var is_null = eval(key + ' == null')
		var val = dict[key]
		if(val_type == 'undefined' || is_null) {
			print_white(zutil.prettyPrint(val, 1))
			eval(key + ' = ' + (typeof val == 'string' ? util.inspect(val) : 'val'))
		} else {
			print_white("key to evaluate: ", key)
			print_white("val : ", val)
			if(util.inspect(eval(key)) != util.inspect(val)) {
				print_red(`Cannot set global var '${key}' to '${val}' as it is already set to '${eval(key)}'`)
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
					print_green(`wait (line ${_current_op_line}) got expected event:`)
					print_white(zutil.prettyPrint(evt, 1))

					_expected_events.splice(i, 1)

					return
				}
			} catch(e) {
				last_error = e
				print_red(last_error)
			}
		}

		print_red(`wait (line ${_current_op_line}) got unexpected event:`)
		print_white(zutil.prettyPrint(evt, 1))
		print_red('while waiting for:')
		print_white(zutil.prettyPrint(_expected_events))
		process.exit(1)
	}
}

var _process_event_during_sleep = function(evt) {
	print_red(`sleep (line ${_current_op_line}) awakened by unexpected event:`)
	print_white(zutil.prettyPrint(evt, 1))
	process.exit(1)
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
		print_white("Ignoring event:")
		print_white(zutil.prettyPrint(evt, 1))
		return
	}

	if(_current_op_name == 'wait') {
		_process_event_during_wait(evt)
	} else if(_current_op_name == 'sleep') {
		_process_event_during_sleep(evt)
	} else {
		_queued_events.push(evt)
	}
}

var _check_op = (type, caller_line, params, spec) => {
	if(params.length != spec.length) {
		print_red(`${type} (line ${caller_line}): invalid number of params. Expected ${spec.length}. Got ${params.length}`)
		process.exit(1)
	}

	for(var i=0 ; i<spec.length ; ++i) {
		if(typeof params[i] != spec[i]) {
			print_red(`${type} (line ${caller_line}): invalid type for param ${i+1}. Expected '${spec[i]}'. Got '${typeof params[i]}'`)
			process.exit(1)
		}
	}
}

module.exports = {
	// IMPORTANT: do not change this to '() => {...}' as arguments is not available on arrow functions
	trap_events: function(emitter, name, preprocessor) {
		var orig_emit = emitter.emit
		emitter.emit = function() {
			var args = Array.from(arguments)
			var event_name = args.shift()
			var evt = {
				source: name,
				name: event_name,
				args: args, 
			}
			if(preprocessor) {
				evt = preprocessor(evt)
			}
			_handle_event(evt)
			orig_emit.apply(emitter, arguments)
		}
	},

	// IMPORTANT: do not change this to '() => {...}' as arguments is not available on arrow functions
	callback_trap: function(name, preprocessor) {
		return function() {
			var evt = {
				source: 'callback',
				name: name,
				args: Array.from(arguments),
			}
			if(preprocessor) {
				evt = preprocessor(evt)
			}
			_handle_event(evt)
		}
	},

	push_event: function(evt) {
		_handle_event(evt)
	},

	wait: (events, timeout) => {
		_check_op('wait', __caller_line, [events, timeout], ['object', 'number']) 
		var events2 = []
		for(var i=0 ; i<events.length ; i++) {
			var evt = events[i]
			if(typeof evt == 'function') {
				events2.push(evt)
			} else if (typeof evt == 'array' || typeof evt == 'object') {
				events2.push(matching.partial_match(evt))
			} else {
				print_red(`wait (line ${__line}): invalid event definition ` + evt)
				process.exit(1)
			}
		}

		print_green(`wait (line ${__caller_line}) started`)
		_current_op_name = 'wait'
		_current_op_line = __caller_line
		_dict = {}
		_expected_events = events2
		while(_queued_events.length > 0) {
			var evt = _queued_events.shift()
			_process_event_during_wait(evt)
		}

		var timed_out = false;
		var timer_id = setTimeout(() => {
			timed_out = true;
		}, timeout);

		while(!timed_out) {	
			if(_expected_events.length == 0) {
				print_white("All expected events received")
				clearTimeout(timer_id)
				print_green(`wait (line ${__caller_line}) finished`)
				_current_op_name = null
				return
			}

			deasync.sleep(100);
		}

		print_red(`wait timed out while waiting for:`)
		print_white(zutil.prettyPrint(_expected_events))
		process.exit(1)
	},

	sleep: (timeout) => {
		_check_op('sleep', __caller_line, [timeout], ['number']) 

		print_green(`sleep (line ${__caller_line}) started`)
		_current_op_name = 'sleep'
		_current_op_line = __caller_line
		if(_queued_events.length > 0) {
			_process_event_during_sleep(_queued_events[0]);
		}

		var timed_out = false;
		var timer_id = setTimeout(() => {
			timed_out = true;
		}, timeout);

		while(!timed_out) {	
			deasync.sleep(100);
		}
		print_green(`sleep (line ${__caller_line}) finished`)
		_current_op_name = null
	},

	add_event_filter: (ef) => {
		var mf
		if(typeof ef == 'function') {
			mf = ef
		} else if (typeof ef == 'array' || typeof ef == 'object') {
			mf = matching.partial_match(ef)
		} else {
			print_red("Invalid event filter definition for " + __function)
			console.dir(ef)
			process.exit(1)
		}
		_event_filters.push([ef, mf])
	},

	remove_event_filter: (ef) => {
		_check_op(__function, __caller_line, [ef], ['object']) 

		var len = _event_filters.length

		_event_filters = _event_filters.filter(f => {
			return f[0] != ef;
		})

		if(len == _event_filters.length) {
			print_red(`remove_event_filter failed: filter not found`)
			process.exit(1)
		}
	},

	matching: matching,
}

