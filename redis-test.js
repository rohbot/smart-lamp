const asyncRedis = require("async-redis");
const r = asyncRedis.createClient();

var state;

r.on("error", function(err) {
	console.log("Error " + err);
});



async function getTest() {
	//await r.set("string key", "string val");
	const value = await r.get("test");
	console.log("here", value);
		
}

let a = getTest();
console.log('got ', a);