import NonceStore from './nonce-store';

// Five minutes
let EXPIRE_IN_SEC = 5 * 60;

class MemoryNonceStore extends NonceStore {

  constructor() {
    this.used = Object.create(null);
  }

  isNew(nonce, timestamp, next=function(){}){

    if (typeof nonce === 'undefined' || nonce === null || typeof nonce === 'function' || typeof timestamp === 'function' || typeof timestamp === 'undefined') {
      return next(new Error('Invalid parameters'), false);
    }

    this._clearNonces();

    let firstTimeSeen = this.used[nonce] === undefined;

    if (!firstTimeSeen) {
      return next(new Error('Nonce already seen'), false);
    }

    return this.setUsed(nonce, timestamp, function(err) {
      if (typeof timestamp !== 'undefined' && timestamp !== null) {
        timestamp = parseInt(timestamp, 10);
        let currentTime = Math.round(Date.now() / 1000);

        let timestampIsFresh = (currentTime - timestamp) <= EXPIRE_IN_SEC;

        if (timestampIsFresh) {
          return next(null, true);
        } else {
          return next(new Error('Expired timestamp'), false);
        }
      } else {
        return next(new Error('Timestamp required'), false);
      }
    });
  }

  setUsed(nonce, timestamp, next=function(){}){
    this.used[nonce] = timestamp + EXPIRE_IN_SEC;
    return next(null);
  }

  _clearNonces() {
    let now = Math.round(Date.now() / 1000);

    for (let nonce in this.used) {
      let expiry = this.used[nonce];
      if (expiry <= now) { delete this.used[nonce]; }
    }

    return;
  }
}


let exports = module.exports = MemoryNonceStore;
