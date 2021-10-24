// This shows how we should implement it with async await
// The user will be required to provide function with the code to be executed and use async when calling z.wait or z.sleep

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Zester {
    async wait(ms) {
        console.log("p1")
        await sleep(2000);
        console.log("p2")
        await sleep(2000);
        return 'bla'
    }
}

async function work () {
    var z = new Zester()

    console.log("a1")
    var res = await z.wait(3000)
    console.dir(res)
    console.log("a2")
}

console.log("A")
work()
console.log("B")
work()
console.log("C")
