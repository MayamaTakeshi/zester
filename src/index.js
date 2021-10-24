require('magic-globals')

var util = require('util')
var matching = require('data-matching')
var zutil = require('./zutil')
var chalk = require('chalk')
var m = require('moment')

var deasync = require('deasync')

Object.defineProperty(global, '__caller_line', {
get: function() {
	var fileName = __stack[2].getFileName()
        var lineNumber = __stack[2].getLineNumber()
	return fileName + ":" + lineNumber
    }
});

function ts() { return m().format("HH:mm:ss.SSS") }

var print_white = function(s) {
	console.log(`${ts()} ${s}`)
}

var print_green = function(s) {
	console.log(chalk.green(`${ts()} ${s}`))
}

var print_red = function(s) {
	console.log(chalk.red(`${ts()} ${s}`))
}


class Zester {
    constructor() {
        this.expected_events = []

        this.queued_events = []

        this.dict = {}

        this.store = {}

        this.event_filters = []

        this.current_op_name = null
        this.current_op_line = null
    }

    match(expected, received, idx) {
        //print_white("match got:")
        //console.dir(expected)
        //console.dir(received)
        return expected(received, this.dict, true, 'expected_events[' + idx + ']')
    }

     set_store_vars(dict) {
        for(var key in dict) {
            if(key == '_') continue

            var val = dict[key]
            print_white("Trying to set " + key)
            if(this.store[key] == null) {
                print_white(zutil.prettyPrint(val, 1))
                this.store[key] = val
            } else {
                if(this.store[key] != val) {
                    print_red(`Cannot store['${key}'] to '${val}' as it is already set to '${this.store[key]}'`)
                    process.exit(1)
                }
            }
        }
    }

    process_event_during_wait(evt) {
        print_white("")
        print_white(`wait (line ${this.current_op_line}) got event:`)
        print_white(zutil.prettyPrint(evt, 1))

        var temp = this.expected_events.slice() // copy array
        var matching_errors = []

        for(var i=0 ; i<temp.length ; ++i) {
            try {
                print_white("")
                print_white(`Trying match against expected_events[${i}]:`)
                print_white(zutil.prettyPrint(temp[i], 1))

                if(this.match(temp[i], evt, i)) {
                    print_white(`Match successful`)

                    this.set_store_vars(this.dict)
                    print_white("")
                    print_green(`wait (line ${this.current_op_line}) got expected event:`)
                    print_white(zutil.prettyPrint(evt, 1))

                    this.expected_events.splice(i, 1)

                    return
                }
            } catch(e) {
                if(e instanceof matching.MatchingError) {
                    print_white(`No match: ${e.path}: ${e.reason}`)
                    matching_errors[i] = e
                } else {
                    print_red(e)
                    process.exit(1)
                }
            }
        }

        print_red("")
        print_red(`wait (line ${this.current_op_line}) got unexpected event:`)
        print_white(zutil.prettyPrint(evt, 1))
        print_red("")
        print_red('while waiting for expected_events:')
        print_white("[")
        this.expected_events.forEach(function(e, idx, arr) {
            var me = matching_errors[idx];
            var reason = `${me.path}: ${me.reason}`;
            reason = reason.replace( /^expected_events\[[0-9]+\]/, '');
            print_white(zutil.prettyPrint(e))
            print_red("  NO_MATCH_REASON: "  + reason + "\n")
        })
        print_white("]")
        process.exit(1)
    }

    process_event_during_sleep(evt) {
        print_red(`sleep (line ${this.current_op_line}) awakened by unexpected event:`)
        print_white(zutil.prettyPrint(evt, 1))
        process.exit(1)
    }

    should_ignore_event(evt) {
        for (var i=0 ; i<this.event_filters.length ; ++i) {
            try {
                if(this.match(this.event_filters[i][1], evt, i)) {
                    return true					
                }
            } catch(e) {
                //do nothing	
            }
        }
        return false
    }

    handle_event(evt) {
        if(this.should_ignore_event(evt)) {
            print_white("Ignoring event:")
            print_white(zutil.prettyPrint(evt, 1))
            return
        }

        if(this.current_op_name == 'wait') {
            this.process_event_during_wait(evt)

            if(this.expected_events.length == 0) {
                print_white("All expected events received")
                print_green(`wait (line ${__caller_line}) finished`)
                this.current_op_name = null
            }
        } else if(this.current_op_name == 'sleep') {
            this.process_event_during_sleep(evt)
        } else {
            this.queued_events.push(evt)
        }
    }

    check_op(type, caller_line, params, spec) {
        if(['wait', 'sleep'].includes(type)) {
            if(this.current_op_name) {
                print_red(`${type} (line ${caller_line}): cannot start because ${this.current_op_name} (line ${this.current_op_line}) is in progress`)
                process.exit(1)
            }
        }

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

	// IMPORTANT: do not change this to '() => {...}' as arguments is not available on arrow functions
	trap_events(emitter, name, preprocessor) {
		var orig_emit = emitter.emit
        var self = this
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
			self.handle_event(evt)
			orig_emit.apply(emitter, arguments)
		}
	}

	// IMPORTANT: do not change this to '() => {...}' as arguments is not available on arrow functions
	callback_trap(name, preprocessor) {
        var self = this
		return function() {
			var evt = {
				source: 'callback',
				name: name,
				args: Array.from(arguments),
			}
			if(preprocessor) {
				evt = preprocessor(evt)
			}
			self.handle_event(evt)
		}
	}

	push_event(evt) {
		this.handle_event(evt)
	}

	wait(events, timeout) {
		this.check_op('wait', __caller_line, [events, timeout], ['object', 'number']) 
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

		print_green(`wait (line ${__caller_line}) started. Waiting for expected_events:`)

		this.current_op_name = 'wait'
	    this.current_op_line = __caller_line
		this.dict = {}
		this.expected_events = events2

		print_white(zutil.prettyPrint(this.expected_events))

		while(this.queued_events.length > 0) {
			var evt = this.queued_events.shift()
			this.process_event_during_wait(evt)
		}

		if(this.expected_events.length == 0) {
			print_white("All expected events received")
			print_green(`wait (line ${__caller_line}) finished`)
			this.current_op_name = null
			return
		}

		var timed_out = false;
		var timer_id = setTimeout(() => {
			timed_out = true;
		}, timeout);

		while(!timed_out) {	
			if(this.expected_events.length == 0) {
				print_white("All expected events received")
				clearTimeout(timer_id)
				print_green(`wait (line ${__caller_line}) finished`)
				this.current_op_name = null
				return
			}

			deasync.sleep(100);
		}

		if(this.expected_events.length == 0) {
			print_white("All expected events received")
			clearTimeout(timer_id)
			print_green(`wait (line ${__caller_line}) finished`)
			this.current_op_name = null
			return
		}

		print_white("")
		print_red(`wait timed out while waiting for:`)
		print_white(zutil.prettyPrint(this.expected_events))
		process.exit(1)
	}

	sleep(timeout) {
		this.check_op('sleep', __caller_line, [timeout], ['number']) 

		print_green(`sleep (line ${__caller_line}) started`)
		this.current_op_name = 'sleep'
		this.current_op_line = __caller_line
		if(this.queued_events.length > 0) {
			this.process_event_during_sleep(this.queued_events[0]);
		}

		var timed_out = false;
		var timer_id = setTimeout(() => {
			timed_out = true;
		}, timeout);

		while(!timed_out) {	
			deasync.sleep(100);
		}
		print_green(`sleep (line ${__caller_line}) finished`)
		this.current_op_name = null
	}

	add_event_filter(ef) {
		var mf
		if(typeof ef == 'function') {
			mf = ef
		} else if (typeof ef == 'array' || typeof ef == 'object') {
			mf = matching.partial_match(ef)
		} else {
			print_red("Invalid event filter definition for " + __func)
			console.dir(ef)
			process.exit(1)
		}
		this.event_filters.push([ef, mf])
	}

	remove_event_filter(ef) {
		this.check_op(__func, __caller_line, [ef], ['object'])

		var len = this.event_filters.length

		this.event_filters = this.event_filters.filter(f => {
			return f[0] != ef;
		})

		if(len == this.event_filters.length) {
			print_red(`remove_event_filter failed: filter not found`)
			process.exit(1)
		}
	}
}

module.exports = Zester
