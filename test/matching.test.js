const m = require('../src/matching');

test('arrays matched', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7]];

	var dict = {}
	var res = m.match(expected, received, dict)

	expect(res).toEqual(true)
})


test('arrays differ in length', () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,7,8]];

	var dict = {}
	expect( () => m.match(expected, received, dict) ).toThrow(/Arrays length don't match/)
})


test("no array match", () => {
	var expected = [1,2,3,4,[5,6,7]];
	var received = [1,2,3,4,[5,6,77]];

	var dict = {}
	expect( () => m.match(expected, received, dict) ).toThrow(/Elements don't match/)
})


test('dicts matched', () => {
	var expected = {
		a: 1,
		b: 2,
		c: ['zero',1,true,undefined]
	}
	var received = {
		a: 1,
		b: 2,
		c: ['zero',1,true,undefined]
	}
	
	var dict = {}
	var res = m.match(expected, received, dict)

	expect(res).toEqual(true)
})
