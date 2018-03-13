/*
 * Usual usage sequence would be
 * var consumer = new lti.Consumer (consumer_key, consumer_secret, tool_provider_url);
 * var params = consumer.initialize_params();
 * params.resource_link_id = "<the tool consumer id for the LTI launch link placement>";
 * params.launch_presentation_return_url. = "<url to allow the Tool Provider to return to the tool consumer>";
 * etc.
 * consumer.sign_request (params, callback);
 * var html = consumer.build_form(params);
 * The HTML returned can be sent to a browser to auto-submit a form to perform the launch.
 */
(function() {
  var Consumer, exports;
    var HMAC_SHA1, Consumer, errors, exports, url, extensions, nonce,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    HMAC_SHA1 = require('./hmac-sha1');
    url = require('url');
    nonce = require('nonce')();
  
    Consumer = (function() {
    function Consumer(consumer_key, consumer_secret, provider_url, signature_method) {
      if (!signature_method) {
        signature_method = new HMAC_SHA1();
      }
      this.sign_request = bind(this.sign_request, this);
      this._valid_parameters = bind(this._valid_parameters, this);
      this.build_form = bind(this.build_form, this);
      if (typeof consumer_key === 'undefined' || consumer_key === null) {
        throw new errors.ConsumerError('Must specify consumer_key');
      }
      if (typeof consumer_secret === 'undefined' || consumer_secret === null) {
        throw new errors.ConsumerError('Must specify consumer_secret');
      }
      if (typeof provider_url === 'undefined' || provider_url === null) {
        throw new errors.ConsumerError('Must specify tool provider url');
      }
      this.consumer_key = consumer_key;
      this.consumer_secret = consumer_secret;
      this.provider_url = provider_url;
      this.signer = signature_method;
    }
    
    Consumer.prototype.initialize_params = function() {
      var params = [];
      params.lti_message_type = 'basic-lti-launch-request';
      params.lti_version = 'LTI-1p0';
      return params;
    };

    Consumer.prototype.sign_request = function(params, callback) {
      if (!this._valid_parameters(params)) {
        return callback(new errors.ParameterError('Invalid LTI parameters'), false);
      }
      params.oauth_callback = 'about:blank';
      params.oauth_consumer_key = this.consumer_key;
      params.oauth_nonce = nonce();
      params.oauth_signature_method = this.signer.toString();
      params.oauth_timestamp = Math.floor(new Date().getTime()/1000);
      params.oauth_version = "1.0";
      
      // Satisfy the contract required by build_signature
      var req = this.build_request_from_url(this.provider_url);
      params.oauth_signature = this.signer.build_signature(req, params, this.consumer_secret);
      return params;
    };
    
    // Build the request contract required by signer.build_signature
    Consumer.prototype.build_request_from_url = function(provider_url) {
        var tp_url = url.parse(provider_url);
        return {
          url: tp_url,
          protocol: tp_url.protocol.replace(/:/,''),
          headers: {
              host: tp_url.host
          },
          connection: {
              encrypted: (tp_url.protocol === 'https')
          },
          method: "post"
        };
    };
    
    Consumer.prototype._valid_parameters = function(body) {
      var correct_message_type, correct_version, has_resource_link_id;
      if (!body) {
        return false;
      }
      correct_message_type = body.lti_message_type === 'basic-lti-launch-request';
      correct_version = require('./ims-lti').supported_versions.indexOf(body.lti_version) !== -1;
      has_resource_link_id = body.resource_link_id !== null;
      return correct_message_type && correct_version && has_resource_link_id;
    };
    
    Consumer.prototype.build_form = function(params) {
        var page = `<html>
    <head>
        <script>
function launch() {
    var button = document.getElementById("launchButton");
    button.style.display = "none";
    var frm = document.getElementById("ltiLaunch");
    frm.submit();
}
        </script>
    </head>
    <body onload="launch();">
        <form action="${this.provider_url}" id="ltiLaunch" method="post" encType="application/x-www-form-urlencoded">`;
        for (var field in params) {
            var value = params[field];
            page += `<input type="hidden" name="${field}" value="${value}"/>`;
        }
        page += `
            <input type="submit" id="launchButton" value="Click to launch the learning tool"/>
        </form>
    </body>
</html>
`;
        return page;
    };

    return Consumer;

  })();

  exports = module.exports = Consumer;

}).call(this);