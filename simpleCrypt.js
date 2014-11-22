// SimpleCrypt.jsn
/* Assumes preincluded are:
  <script type="text/javascript" src="packrat.js"></script>
  <script type="text/javascript" src="jsaes.js"></script>
  <script type="text/javascript" src="sha1.js"></script>

String Encrypt/Decrypt

A simple set of functions on top of jsaes that encrypts plainText (no 0s in the stream) to cypherText (US64 encoded text)
*/
var simpleCrypt = {
    _prepKey:function(keyText) {
        AES_Init();
        var sha1hash = Sha1.hash(keyText, true);  // encoded to UTF8
        debugOut("Key Sha1 Hash:" + packRat.utf8.toDisplayString(sha1hash) + '<br>');
        var key = new Array(32);
        for (var i = 0; i < 32; i++) {
            key[i] = sha1hash.charCodeAt(i);
            if (key[i] > 255 || key[1] < 0) {
                alert("Unexpected charCode value found in sha1 hash.");
            }
        }
        AES_ExpandKey(key);   // in-place expansion of key for encryption
        debugOut("Expanded Key:" + packRat.byteArray.toDisplayString(key) + '<br>');
        return key;
    },
    Encrypt:function(plainText, keyText) {
        var abCypher = [];
        var key = simpleCrypt._prepKey(keyText);
        var block = new Array(16);
        var abPlain = packRat.string.toByteArray(plainText);
        debugOut("Plain text bytes (" + abPlain.length + "bytes long) to Encrypt:" + packRat.byteArray.toDisplayString(abPlain) + '<br>');
        for (var pti = 0; pti < abPlain.length; pti += 16) {
            block = abPlain.slice(pti, pti + Math.min(16, abPlain.length - pti));
            if (!block.length) {
                break;
            }
            debugOut("Block to Encrypt before padding:" + packRat.byteArray.toDisplayString(block) + '<br>');
            while (block.length < 16) {
                block.push(0);
            }
            debugOut("Block to Encrypt after padding:" + packRat.byteArray.toDisplayString(block) + '<br>');
            AES_Encrypt(block, key); // in-place encryption of block
            debugOut("Encrypted Block:" + packRat.byteArray.toDisplayString(block) + '<br>');
            for (var bi = 0; bi < 16; bi++) {
                if (block[bi] > 255 || block[bi] < -1) {
                    alert('unexpected encrypted block item value found.');
                }
                abCypher.push(block[bi]);
            }
        }
        AES_Done();
        debugOut("Encrypted cypher byte array(" + abCypher.length + " bytes long):" + packRat.byteArray.toDisplayString(abCypher) + '<br>');
        return packRat.byteArray.toUS64(abCypher);
    },
    Decrypt:function(sUS64CypherText, keyText) {
        var abPlain = [];
        var key = simpleCrypt._prepKey(keyText);
        var abCypher = packRat.US64.toByteArray(sUS64CypherText);
        debugOut("Cypher byte array(" + abCypher.length + " bytes long) to decrypt:" + packRat.byteArray.toDisplayString(abCypher) + '<br>');
        var block = new Array(16);
        for (var pti = 0; pti < abCypher.length; pti += 16) {
            if (abCypher.length < 16) {
                alert("Expected the cypher byte array to be of length % 16.");
                return "";
            }
            var block = abCypher.slice(pti, pti + 16);
            if (!block.length) {
                break;
            }
            debugOut("Block to decrypt:" + packRat.byteArray.toDisplayString(block) + '<br>');
            AES_Decrypt(block, key); // in-place encryption of block
            debugOut("Decrypted Block:" + packRat.byteArray.toDisplayString(block) + '<br>');
            abPlain = abPlain.concat(block);
        }
        AES_Done();
        debugOut("Decrypted bytes (" + abPlain.length + " bytes long) before stripping padding:" + packRat.byteArray.toDisplayString(abPlain) + '<br>');
        while (abPlain[abPlain.length - 1] == 0) {
            // strip off trailing 0s which were used to buffer the cleartext for encryption
            abPlain.splice(abPlain.length - 1, 1);
        }
        debugOut("Decrypted bytes (" + abPlain.length + " bytes long) after stripping padding:" + packRat.byteArray.toDisplayString(abPlain) + '<br>');
        return packRat.byteArray.toString(abPlain);
    }
}
function debugOut(sIn) {
    //ge('debug').innerHTML += sIn;
}
function ge(id) {
    return document.getElementById(id);
}
