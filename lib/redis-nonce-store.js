import NonceStore from './nonce-store';

// Five minutes
let EXPIRE_IN_SEC = 5*60;

class RedisNonceStore extends NonceStore {

  constructor(redisClient) {
    if (typeof redisClient === 'string' && arguments.length === 2) {
      redisClient = arguments[1];
    }
    this.redis = redisClient;
  }

  isNew(nonce, timestamp, next=function(){}){

    if (typeof nonce === 'undefined' || nonce === null || typeof nonce === 'function' || typeof timestamp === 'function' || typeof timestamp === 'undefined') {
      return next(new Error('Invalid parameters'), false);
    }

    if (typeof timestamp === 'undefined' || timestamp === null) {
      return next(new Error('Timestamp required'), false);
    }


    // Generate unix time in seconds
    let currentTime = Math.round(Date.now()/1000);
    // Make sure this request is fresh (within the grace period)
    let freshTimestamp = (currentTime - parseInt(timestamp,10)) <= EXPIRE_IN_SEC;

    if (!freshTimestamp) {
      return next(new Error('Expired timestamp'), false);
    }

    // Pass all the parameter checks, now check to see if used
    return this.redis.get(nonce, (err, seen) => {
      if (seen) {
        return next(new Error('Nonce already seen'), false);
      }
      // Dont have to wait for callback b/c it's a sync op
      this.setUsed(nonce, timestamp);
      return next(null, true);
    });
  }


  setUsed(nonce, timestamp, next=function(){}){
    this.redis.set(nonce, timestamp);
    this.redis.expire(nonce, EXPIRE_IN_SEC);
    return next(null);
  }
}


let exports = module.exports = RedisNonceStore;
