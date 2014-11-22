/*
Packrat - a package to provide for compressed data storage with the ability to add data in a backwards compatible manner

Design:
    Data is stored by type:
    An array of Bits/flags
    An array of Integers
    An array of Strings or other types of objects

    The Integers and Bits arrays are compressed into US64 strings.
    All strings are then concatonated into a single descriptive 
    string which is then compressed and converted into a US64 string.

    A mapping is created given an object with default data.  The mapping
    should then be saved for decompression.

    Backwards compatiblilty is achieved by adding items to the end of the mapping object.

Compression code derived from:--------------------------------------------------
Copyright (c) 2010 Nuwa Information Co., Ltd, and individual contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  1. Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.

  2. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in the
     documentation and/or other materials provided with the distribution.

  3. Neither the name of Nuwa Information nor the names of its contributors
     may be used to endorse or promote products derived from this software
     without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
--------------------------------------------------------------------------------
*/
var packRat = {};

packRat.util = {};

// rendering function to show a string with its length
packRat.util.showLength = function(sIn) { 
    return sIn.length + ": " + sIn;
};

// creates an array with binary strings '100101...' that equate to 
// the index of that array in value.  The array is of length 'length'.
// fUniformBits: 
//   true means to make all the binary strings the same length which is calculated based on length.
//   false uses the minimum bits needed to represent each binary number.
packRat.util.buildBinaryMap = function(length, fUniformBits) {
    var aBinMap = [];
    var cBits = packRat.util.calcBitsFromNumber(length);
    for (var n = 0; n < length; n++) {
        var sBin = "";
        var p = n;
        while (p) {
            sBin += (p % 2);
            p >>= 1;
        }
        if (fUniformBits) { // prepad with 0s to uniform length
            while (sBin.length < cBits) {
                sBin = '0' + sBin;
            }
        }
        aBinMap.push(sBin);
    }
    return aBinMap;
};

// returns a string that contains all the unique characters of sIn in descending order of appearance in sIn.
packRat.util.getHistogram = function(sIn) {
    var oHist = {};
    for (var i = 0; i < sIn.length; i++) {
        var ch = sIn.charAt(i);
        oHist[ch] = oHist[ch] ? oHist[ch] + 1 : 1;
    }
    var aHist = [];
    for (var ch in oHist) {
        aHist.push([ch, oHist[ch]]);
    }
    aHist.sort(function(x, y) {
        if (x[1] > y[1]) return -1;
        if (x[1] < y[1]) return 1;
        return 0;
    });
    var sHist = "";
    for (var i in aHist) {
        sHist += aHist[i][0];
    }
    return sHist;
};

// returns a string that contains all the unique characters of sIn in a random order derived from the input.
packRat.util.getUniqCharString = function(sIn) {
    var aUniqueChars = [];
    for (var i = 0; i < sIn.length; i++) {
        aUniqueChars[sIn.charAt(i)] = 1;
    }
    var aUniqueChars = [];
    for (var ch in aUniqueChars) {
        aUniqueChars.push(ch);
    }
    return aUniqueChars.sort().join("");
};

// Gets the number of binary digits needed to expreess the number n
packRat.util.calcBitsFromNumber = function(n) {
     var cBits = 0;
     while (n) {
         cBits++;
         n >>= 1;
     }
     return cBits;
};

// using the optional sUniqueChars array, this function calculates how many bits
// will be needed to identify all the characters in sIn.
packRat.util.calcBitsPerCharNeeded = function(sIn) {
    sUniqueChars = this.getUniqCharString(sIn);
    return this.calcBitsFromNumber(sUniqueChars.length);
};

// ---------------------------------------------------- Byte Array -----------------------------------------------------
// a Byte Array is an array of integers that each are 0-255 in value
packRat.byteArray = {};

// Note that this should NOT be used for encrypted byte arrays as they will not follow the rules used in 
// string/Utf8.toByteArray().
packRat.byteArray.toString = function(abIn) {  
    // TESTED
    var sOut = "";
    if (abIn.length == 0) {
        return "";
    }
    var fMultiByte = (abIn[0] == 0);
    if (fMultiByte) for (var i = 1, n = 0, c = 0; i < abIn.length; i++) {
        if (abIn[i]) {
            n = n + (abIn[i] << (8 * c));
            c++;
        } else {
            sOut += String.fromCharCode(n);
            n = 0;
            c = 0;
        }
    } else for (var i = 0; i < abIn.length; i++) {  // single-byte character string
        if (abIn[i] == 0) {
            alert("Error: an attempt to convert a byte array with a 0 at position " + i + " of " + abIn.length + " into a string was made.  This indicates improper input."); // we don't expect this
            sOut = '';
            break;
        }
        sOut += String.fromCharCode(abIn[i]);
    }
    return sOut;
};

packRat.byteArray.toUtf8 = function(abIn) {    // reverse of utf8.toString
    return packRat.byteArray.toString(abIn);
};

// This is used for debuging to see the contents of the abIn, not to decode it.
packRat.byteArray.toDisplayString = function(abIn) {
    // TESTED
     var sOut = '[';
     var fFirst = true;
     for (var i = 0; i < abIn.length; i++) {
         if (fFirst) {
             fFirst = false;
         } else {
             sOut += ', ';
         }
         sOut += String(abIn[i]);
     }
     return sOut + ']';
};

packRat.byteArray.to64 = function(abIn, mapString) {
    var sOut = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    while (i < abIn.length) {
        chr1 = abIn[i++];
        chr2 = abIn[i++];
        chr3 = abIn[i++];
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        sOut += mapString.charAt(enc1) + mapString.charAt(enc2) + mapString.charAt(enc3) + mapString.charAt(enc4);
    }
    return sOut;
};

packRat.byteArray.toUS64 = function(abIn) {
    return packRat.byteArray.to64(abIn, packRat.US64.mapString);
};

packRat.byteArray.toBase64 = function(abIn) {
    return packRat.byteArray.to64(abIn, packRat.Base64.mapString);
};

// ---------------------------------------------------- string -----------------------------------------------------
// A string is a simple javascript Unicode string.  Each character may have more than one byte to describe it.
packRat.string = {};

// Note that any javascript string can come in and the byteArray derived from this must be able to be turned
// back into that same javascript string.
// To do this, if sIn has any multi-byte characters then the byteArray will start with a 0 (the only value
// we are assured will not be found in a javascript string) and each character code-set will be delimeted by
// a closing 0 with the lowest-order bytes comming first in the array.
packRat.string.toByteArray = function(sIn) {
    // TESTED
    return packRat.utf8.toByteArray(sIn);   // identical algorithm for UTF8 strings
};

packRat.string.toTrinary = function(sIn) {
    var sHist = packRat.util.getHistogram(sIn);
    var aBinMap = packRat.util.buildBinaryMap(sHist.length, false);
    var sTri = "";
    for (var i = 0; i < sIn.length; i++) {
        sTri += aBinMap[sHist.indexOf(sIn.charAt(i))] + ",";
    }
    document.getElementById("tri").innerHTML = conv.toDispStr(sTri);
    return sTri;
};

packRat.string.to64 = function(sIn, Map) {
    //sIn = US64._utf8_encode(sIn);
    var sOut = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    while (i < sIn.length) {
        chr1 = sIn.charCodeAt(i++);
        chr2 = sIn.charCodeAt(i++);
        chr3 = sIn.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        sOut = sOut +
        Map.charAt(enc1) + Map.charAt(enc2) +
        Map.charAt(enc3) + Map.charAt(enc4);
    }
    return sOut;
};


packRat.string.toUS64 = function(sIn) {
    return this.to64(sIn, packRat.US64.mapString);
};

packRat.string.toBase64 = function(sIn) {
    return this.to64(sIn, packRat.Base64.mapString);
};

packRat.string.toUtf8 = function(sIn) {
	string = sIn.replace(/\r\n/g,"\n");
	var utftext = "";
	for (var n = 0; n < string.length; n++) {
		var c = string.charCodeAt(n);
		if (c < 128) {
			utftext += String.fromCharCode(c);
		}
		else if((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
	}
	return utftext;
};

packRat.string.toBits = function(sIn) {
    var sUniqueChars = packRat.util.getUniqCharString(sIn);
    var cBitsPerChar = packRat.util.calcBitsFromNumber(sUniqueChars.length);
    var sOut = "";
    for (var i = 0; i < sIn.length; i++) {
        var n = sUniqueChars.indexOf(sIn.charAt(i));
        var aChunk = [];
        while (n) {
            aChunk.push(n % 2);
            n >>= 1;
        }
        while (aChunk.length < cBitsPerChar) {
            aChunk.unshift('0');
        }
        sOut += aChunk.join("");
    }
    return sUniqueChars.length + ":" + sUniqueChars + sOut;
};

// ---------------------------------------------------- displayString -----------------------------------------------------
packRat.displayString = {};

packRat.displayString.toByteArray = function(sIn) {
    // TESTED
    var abOut = [];
    if (sIn.charAt(0) != '[') alert("expected display string to start with a [. " + sIn);
    for (var i = 1, sBuf = ''; i < sIn.length; i++) {
        var ch = sIn.charAt(i);
        if (ch == ']') {
            abOut.push(parseInt(sBuf));
            break;  // done
        }
        if (ch == '.') {
            abOut.push(parseInt(sBuf));
            sBuf = '';
        } else {
            sBuf += ch;
        }
    }
    return abOut;
};

// ---------------------------------------------------- utf8 -----------------------------------------------------
packRat.utf8 = {};

// Note that any javascript string can come in and the byteArray derived from this must be able to be turned
// back into that same javascript string.
// To do this, if sIn has any multi-byte characters then the byteArray will start with a 0 (the only value
// we are assured will not be found in a javascript string) and each character code-set will be delimeted by
// a closing 0 with the lowest-order bytes comming first in the array.
packRat.utf8.toByteArray = function(sUtf8In) {   
    // TESTED
    var aBytesOut = [];
    var fMultiByte = false;
    for (i = 0; i < sUtf8In.length; i++) {
        var n = sUtf8In.charCodeAt(i);
        while (n) {
            aBytesOut.push(n & 255);    // bytes to out low-high order
            n >>= 8;
            if (!fMultiByte && n > 0) {
                fMultiByte = true;
                aBytesOut = [];
                i = -1;    // restart outer loop
                break;
            }
        }
        if (fMultiByte) {
            aBytesOut.push(0);  // append a 0 to mark end of the char.
        }
    }
    return aBytesOut;
};

packRat.utf8.toString = function(sUtf8In) {
   	var string = "";
   	var i = c = c1 = c2 = 0;
   	while ( i < sUtf8In.length ) {
   		c = sUtf8In.charCodeAt(i);
   		if (c < 128) {
   			string += String.fromCharCode(c);
   			i++;
   		}
   		else if((c > 191) && (c < 224)) {
   			c2 = sUtf8In.charCodeAt(i+1);
   			string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
   			i += 2;
   		}
   		else {
   			c2 = sUtf8In.charCodeAt(i+1);
   			c3 = sUtf8In.charCodeAt(i+2);
   			string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
   			i += 3;
   		}
   	}
   	return string;
};

packRat.utf8.toDisplayString = function(sUtf8In) {
    // TESTED
    var ab = packRat.utf8.toByteArray(sUtf8In);
    return packRat.byteArray.toDisplayString(ab);
}

// ---------------------------------------------------- base2 -----------------------------------------------------
packRat.base2 = {};

packRat.base2.toUS64 = function(aBitsIn) {
  var aBits = aBitsIn;  // so we don't effect called value
  var sBits = "";
  while (aBits.length) {
      var n = 0;
      var chunk = aBits.slice(0, 6);
      while (chunk.length < 6) {
          chunk.push(0);
      }
      while (chunk.length) {
          n <<= 1;
          n += chunk.length ? (chunk[0] ? 1 : 0) : 0;
          chunk = chunk.slice(1);
      }
      aBits = aBits.slice(6);
      sBits += US64.mapString.charAt(n);
  }
  return sBits;
};

// ---------------------------------------------------- base3 -----------------------------------------------------
packRat.base3 = {};

packRat.base3.mapString = ",10";

packRat.base3.toBase81 = function(sTriIn) {
    var sTri = sTriIn;  // so we don't disturb the input
    var cPadding = 0;
    while (sTri.length % 4) {
        sTri += ',';    // pad to a multiple of 4
        cPadding++;
    }
    var s81 = String(cPadding); // first char indicates padding count
    while (sTri.length) {
        var chunk = sTri.slice(0, 4);
        sTri = sTri.slice(4);
        var x = 0;
        for (var i = 0; i < 4; i++) {
            x = x * 3 + this.mapString.indexOf(chunk.charAt(i));
        }
        if (x > 81) {
            alert("bad lookup on Base3.toBase81");
        }
        s81 += packRat.Base81.mapString.charAt(x);
    }
    document.getElementById("s81").innerHTML = packRat.conv.toDispStr(s81);
    return s81;
};

// ---------------------------------------------------- from64 -----------------------------------------------------
packRat.from64 = {};

packRat.from64.toString = function(sIn, mapString) {
    var ab = packRat.from64.toByteArray(sIn, mapString);
    return packRat.byteArray.toString(ab);
};

packRat.from64.toByteArray = function(s64In, mapString) {
    if (mapString.length != 65) {
        alert("packRat.from64.toString expected a mapString of 65 characters.");
        return "";
    }
    var abOut = [];
    var b1, b2, b3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    var escapedMapString = mapString.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    var rx = new RegExp(('[^' + escapedMapString + ']'), 'g');                                                
    if (rx.test(s64In)) {
        alert("packRat.from64.toString was given a string with unexpected characters: " + s64In + " all characters should be one of these: " + mapString);
        return "";
    }
    while (i < s64In.length) {
        enc1 = mapString.indexOf(s64In.charAt(i++));
        enc2 = mapString.indexOf(s64In.charAt(i++));
        enc3 = mapString.indexOf(s64In.charAt(i++));
        enc4 = mapString.indexOf(s64In.charAt(i++));
        b1 = (enc1 << 2) | (enc2 >> 4);
        b2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        b3 = ((enc3 & 3) << 6) | enc4;
        abOut.push(b1);
        if (enc3 != 64) {
            abOut.push(b2);
        }
        if (enc4 != 64) {
            abOut.push(b3);
        }
    }
    return abOut;
};

// ---------------------------------------------------- base64 -----------------------------------------------------
packRat.Base64 = {};

//                          1...-....10...-....20...-....30...-....40...-....50...-....60...-
packRat.Base64.mapString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

packRat.Base64.toString = function(sBase64) {
    return packRat.from64.toString(sBase64, packRat.Base64.mapString);
};

// ---------------------------------------------------- US64 -----------------------------------------------------
packRat.US64 = {};

//                        1...-....10...-....20...-....30...-....40...-....50...-....60...-
packRat.US64.mapString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789()-";

packRat.US64.toString = function(sUS64In) {
    return packRat.from64.toString(sUS64In, packRat.US64.mapString);
};

packRat.US64.toByteArray = function(sUS64In) {
    return packRat.from64.toByteArray(sUS64In, packRat.US64.mapString);
}

packRat.US64.toBitArray = function(sBitsIn) {
  var aBits = [];
  var sBits = sBitsIn; // so we don't effect called value
  while (sBits != "") {
      var n = US64.mapString.indexOf(sBits.charAt(0));
      if (n == 64) {
          break;    // hit end padding, skip it
      }
      for (var power = 32; power >= 1; power /= 2) {
          aBits.push(Math.floor(n / power));
          n %= power;
      }
      sBits = sBits.substr(1);
  }
  return aBits;
};

packRat.US64.toByteArray = function(sUS64) {
    return packRat.from64.toByteArray(sUS64, packRat.US64.mapString);
};

// ---------------------------------------------------- base81 -----------------------------------------------------
packRat.base81 = {};

//                          1...-....10..-....20..-....30..-....40..-....50..-....60..-....70..-....80..
packRat.base81.mapString = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!,[]:;*(){}';

// ---------------------------------------------------- compress -----------------------------------------------------
// Looks like these compression routines only work well with repetitous strings like normal word type text.
packRat.compress = {};

packRat.compress = function(sIn) {
    return conv.byteArrayToString(this.compressByteArray(conv.stringToByteArray(sIn)));
};

packRat.compress.ByteArray = function(abIn) {
    var abOut=[], cpy, copymap, mlen, offset, hp;
    copymask = 512;
    var aLempel = [];
    for(var i = 0; i < 256; i++) aLempel.push(3435973836);
    var slen = abIn.length;
    var iIn = 0;
    var iOut = 0;
    while (iIn < slen) {
        if ((copymask <<= 1) == 256) {
            if (iOut >= slen - 17) {
                for (iIn = 0, iOut = 0, mlen = slen; mlen; mlen--) abOut[iOut++] = abIn[iIn++];
                return abOut;
            }
            copymask = 1;
            copymap = iOut;
            abOut[iOut++] = 0;
        }
        if (iIn > slen - 66) {
            abOut[iOut++] = abIn[iIn++];
            continue;
        }
        hp = ((abIn[iIn] + 13) ^ (abIn[iIn + 1] - 13) ^ abIn[iIn + 2]) & 255;
        offset = (iIn - aLempel[hp]) & 1023;
        aLempel[hp] = iIn;
        cpy = iIn - offset;
        if (cpy >= 0 && cpy != iIn &&
            abIn[iIn] == abIn[cpy] &&
            abIn[iIn + 1] == abIn[cpy + 1] &&
            abIn[iIn + 2] == abIn[cpy + 2]) {
            abOut[copymap] |= copymask;
            for (mlen = 3; mlen < 66; mlen++)
                if (abIn[iIn + mlen] != abIn[cpy + mlen])
                    break;
            abOut[iOut++] = ((mlen - 3) << 2) | (offset >> 8);
            abOut[iOut++] = offset;
            iIn += mlen;
        } else {
            abOut[iOut++] = abIn[iIn++];
        }
    }
    return abOut;
};

packRat.decompress = {};

packRat.decompress.string = function(sIn) {
    conv.byteArrayToString(conv.decompressByteArray(conv.stringToByteArray(sIn)));
};

packRat.decompress.byteArray = function(abIn) {
    var slen = abIn.length;    
    var iIn = 0;
    var iOut = 0;
    var copymap;
    var copymask = 128;
	while (iIn < slen) {
		if ((copymask <<= 1) == 256) {
			copymask = 1;
			copymap = abIn[iIn++];
		}
		if (copymap & copymask) {
			var mlen = (abIn[iIn] >> 2) + 3;
			var offset = ((abIn[iIn] << 8) | abIn[iIn + 1]) & 1023;
			iIn += 2;
            var cpy;
			if ((cpy = iOut - offset) >= 0)
				while (--mlen >= 0)
					abIn[iOut++] = abIn[cpy++];
			else
                alert("corrupt source data.");
				return abIn;
		} else {
			abIn[iOut++] = abIn[iIn++];
		}
	}
	return abIn;
};

// ---------------------------------------------------- test -----------------------------------------------------
packRat.test = {};

packRat.test.init = function() {
    // Generate random input
    var sInOrg = "";
    var nChars = Math.floor(Math.random() * 100) + 1;
    while (nChars--) {
        sInOrg += String.fromCharCode((Math.floor(Math.random() * 256 - 20)) + 20);
    }
    document.getElementById("txtStringInChars").innerHTML = sInOrg.length;
    document.getElementById("txtStringIn").value = sInOrg;
};

packRat.test.toBinary = function() {
    var sIn = document.getElementById("txtStringIn").value;
    var sOut = packRat.string.toBits(sIn);
    document.getElementById("biChars").innerHTML = sOut.length;
    document.getElementById("bi").innerHTML = sOut;
};

packRat.test.toDedupedBinary = function() {
    var sIn = document.getElementById("txtStringIn").value;
    var sOut = packRat.string.to
};

packRat.test.me = function() {
    this.toBinary();
/*
    var sAllBytes = "";
    var i = 256;
    while (i) sAllBytes += String.fromCharCode(--i);
    document.getElementById("sAllBytes").innerHTML = conv.toDispStr(sAllBytes);
    document.getElementById("sAllBytesUS64").innerHTML = conv.toDispStr(US64.encode(sAllBytes));
    document.getElementById("sAllBytesBase64").innerHTML = conv.toDispStr(Base64.encode(sAllBytes));
    var sIn = sInOrg;
    var sPacked = packRat.compress(sInOrg);
    document.getElementById("packedString").innerHTML = conv.toDispStr(sPacked);
    if (sIn != sInOrg) {
        alert("packRat.getHistogram altered its input string.");
        sIn = sInOrg;
    }
    var aBits = packRat.unpackUS64ToaBits(sIn);
    if (sIn != sInOrg) {
        alert("packRat.unpackUS64ToBits altered its input string.");
        sIn = sInOrg;
    }
    document.getElementById("aBits").innerHTML = aBits.length + ': ' + aBits.join("");
    var sIn = packRat.packaBitsToBase64(aBits);
    if (sIn != sInOrg) {
        alert("packRat failed to produce the same Base64 string as was input.");
    }
    document.getElementById("stringOut").innerHTML = sIn.length + ': ' + sIn;

    n = Math.floor(Math.random() * 500);
    var aRndBits = [];
    while (n) {
        aRndBits.push(Math.floor((Math.random() * 2) >= 1 ? true : false));
        n--;
    }
    var aBitsIn = aRndBits;
    document.getElementById("bitsIn").innerHTML = aRndBits.length + ': ' + aRndBits.join("");
    var sOut = packRat.packaBitsToBase64(aBitsIn);
    if (aRndBits != aBitsIn) {
        alert("packRat.unpackUS64ToBits altered its input array.");
    }
    document.getElementById("sOut").innerHTML = sOut.length + ': ' + sOut;
    var sIn = sOut;
    var aBitsOut = packRat.unpackUS64ToaBits(sIn);
    if (sIn != sOut) {
        alert("packRat.unpackUS64ToBits altered its input.");
        sIn = sOut;
    }
    while (aBitsOut.length > aBitsIn.length) {
        aBitsOut.pop(); // remove any padding added by compression and decompression
    }
    if (aBitsOut.toString() != aBitsIn.toString()) {
        alert("packRat failed to produce that same bit array going in as going out.");
    }
    document.getElementById("bitsOut").innerHTML = aBitsOut.length + ': ' + aBitsOut.join("");
*/
};

