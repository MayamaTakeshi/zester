const sm = require('../src/string_matching');

test('process valid match string', () => {
	var proto = 'sip'

	var res = sm.parse(`"jim" <${proto}:!{user}@!{ip}:!{port};tag=!{tag:str:26};phone=!{phone:str:9}>`)

	expect(res).toEqual([
		{ op: 'consume', str: '"jim" <sip:' },
		{ op: 'collect', name: 'user' },
		{ op: 'consume', str: '@' },
		{ op: 'collect', name: 'ip' },
		{ op: 'consume', str: ':' },
		{ op: 'collect', name: 'port' },
		{ op: 'consume', str: ';tag=' },
		{ op: 'collect', name: 'tag', type: 'str', length: 26 },
		{ op: 'consume', str: ';phone=' },
		{ op: 'collect', name: 'phone', type: 'str', length: 9 },
		{ op: 'consume', str: '>' }
	])

})

test('unclosed ${}', () => {
	expect( () => { sm.parse('abc!{') } ).toThrow()
})

test('bang', () => {
	expect(sm.parse('abc!!def')).toEqual([
		{ op: 'consume', str: 'abc!def' },
	])
})
