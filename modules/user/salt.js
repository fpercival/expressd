
var _saltVals = "1234567890abcdefghujklmnopqrstuvwxyz$%&#=?()[]{}ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var genSalt = function genSalt(saltLength, saltBase){
	var l = saltLength || 20;
	var base = saltBase || _saltVals;
	var svl = base.length;
	var s = "";
	while(s.length<l){
		s += base.charAt(Math.floor(Math.random()*svl));
	}
	return s;
};

var mangle = function(s, salt){
	var _ms = salt;
	var rt = '', i, j= 0, c;
	for(i=0; i< s.length; i++){
		c = s.charCodeAt(i)^_ms.charCodeAt(j);
		rt += String.fromCharCode(c);
		j++;
		if(j>=_ms.length) j=0;
	}
	i=0
	for(; j>0 && j<_ms.length; j++){
		c = i^_ms.charCodeAt(j);
		rt += String.fromCharCode(c);
		i++;
	}
	return rt;
};

var unmangle = function(s, salt){
	var _ms = salt;
	var rt = '', i, j= 0, c=1;
	for(i=0; i< s.length && c!=0; i++){
		c = s.charCodeAt(i)^_ms.charCodeAt(j);
		if(c!=0) rt += String.fromCharCode(c);
		j++;
		if(j>=_ms.length) j=0;
	}
	return rt;
};


module.exports = {
    new: genSalt,
    salt: mangle,
    unsalt: unmangle
};

