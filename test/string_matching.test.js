const sm = require('../src/string_matching');

test('process valid match string', () => {
	var alias = "tom"
	var proto = 'sip'

	var matcher = sm.gen_matcher(`"${alias}" <${proto}:!{user}@!{ip}:!{port:num};tag=!{tag:str:30};phone=!{phone:str:10}>`)

	var user = 'tomjones'
	var ip = '10.20.30.40'
	var port = 88888
	var tag = '111222333444555666777888999000'
	var phone = '0312341234'

	var dict = {}

	var res = matcher(`"${alias}" <${proto}:${user}@${ip}:${port};tag=${tag};phone=${phone}>`, dict)

	expect(dict).toEqual({
		user: user,
		ip: ip,
		port: port,
		tag: tag,
		phone: phone,
	})		
})

test('invalid match string', () => {
	expect( () => { sm.gen_matcher(`!{`) } ).toThrow(/Invalid match expression/)
})

test('key already set in dict', () => {
	var matcher = sm.gen_matcher(`name=!{name}`)
	var dict = {
		name: 'spock',
	} 

	expect( () => { matcher(`name=sulu`, dict) }).toThrow(/already/)
})
