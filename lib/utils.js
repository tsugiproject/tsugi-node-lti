// Special encode is our encoding method that implements
//  the encoding of characters not defaulted by encodeURI
//
//  Specifically ' and !
//
// Returns the encoded string
export function special_encode(string) {
  return encodeURIComponent(string).replace(/[!'()]/g, escape).replace(/\*/g, '%2A');
}
