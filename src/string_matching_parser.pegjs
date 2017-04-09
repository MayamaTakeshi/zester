{
	function flattenArr(a, r){
		if(!r){ r = []}
		for(var i=0; i<a.length; i++){
			if(a[i].constructor == Array){
				r.concat(flattenArr(a[i], r));
			}else{
				r.push(a[i]);
			}
		}
		return r;
	}
		
	function flattenStr(s) {
		return [].concat.apply([], s).join("")
	}
}


main
	= arr:(intercalator? (collectTil ordinaryString)* collectTil) { return flattenArr(arr) }
	/ arr:(intercalator? (collectTil ordinaryString / intercalator)+) { return flattenArr(arr) }
	/ arr:intercalator+ { return flattenArr(arr) }
		
collectTil
	= "!{" _* vn:varName _* optional:(":" _* t:type _*)? "}" { 
		var data = {op: 'collect', name: vn}
		if(optional) {
			data.type = optional[2]
		}
		return data
	}
		
collect 
	= "!{" _* vn:varName _* ":" _* t:type _* ":" _* l:length _* "}" { 
		return {
		op: 'collect',
		name: vn,
		type: t,
		length: l
		}
	}

intercalator 
	= collect
	/ ordinaryString

ordinaryString = strs:ordinaryStr+ { return {op: 'consume', str: flattenStr(strs)} }

ordinaryStr
	= escapedBang 
	/ string 
		
escapedBang = "!!" { return "!" }

string 
	= s:([^!])+ { return flattenStr(s) }
	/ s:([!][^{])+ { return flattenStr(s) }

length
	= s:([1-9][0-9]*) { return parseInt(flattenStr(s)) }
		
type
	= "str"
	/ "num"
	/ "dec"
	/ "hex"
	/ "bin"
	/ "oct"
		
elementSpec = s:[^:}]+ { return flattenStr(s) }

blank =
	""

_ "space" = " "

varName = s:([_a-zA-Z][_a-zA-Z0-9]*) { return flattenStr(s) }

