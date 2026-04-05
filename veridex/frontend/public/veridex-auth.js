(function (global) {
  var AUTH_SOURCE = 'veridex-auth';

  function randomString() {
    var bytes = new Uint8Array(32);
    global.crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }

  function base64Url(input) {
    var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return global.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function createCodeChallenge(verifier) {
    var encoder = new TextEncoder();
    return global.crypto.subtle.digest('SHA-256', encoder.encode(verifier)).then(function (digest) {
      return base64Url(digest);
    });
  }

  function openPopup(url) {
    var width = 540;
    var height = 760;
    var left = global.screenX + Math.max(0, (global.outerWidth - width) / 2);
    var top = global.screenY + Math.max(0, (global.outerHeight - height) / 2);
    return global.open(
      url,
      'veridex-auth',
      'popup=yes,width=' + width + ',height=' + height + ',left=' + left + ',top=' + top
    );
  }

  function login(options) {
    if (!options || !options.clientId || !options.redirectUri) {
      return Promise.reject(new Error('clientId and redirectUri are required'));
    }

    var baseUrl = options.baseUrl || global.location.origin;
    var authOrigin = new URL(baseUrl).origin;
    var responseMode = options.responseMode || 'web_message';
    var scope = options.scope || 'openid profile';
    var state = options.state || randomString();
    var codeVerifier = randomString();

    return createCodeChallenge(codeVerifier).then(function (codeChallenge) {
      return new Promise(function (resolve, reject) {
        var authorizeUrl = new URL('/auth/authorize', baseUrl);
        authorizeUrl.searchParams.set('client_id', options.clientId);
        authorizeUrl.searchParams.set('redirect_uri', options.redirectUri);
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set('scope', scope);
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('code_challenge', codeChallenge);
        authorizeUrl.searchParams.set('code_challenge_method', 'S256');
        authorizeUrl.searchParams.set('response_mode', responseMode);

        var popup = openPopup(authorizeUrl.toString());
        if (!popup) {
          reject(new Error('Popup blocked'));
          return;
        }

        var timer = null;

        function cleanup() {
          global.removeEventListener('message', handleMessage);
          if (timer) {
            global.clearInterval(timer);
          }
        }

        function handleMessage(event) {
          if (event.origin !== authOrigin) {
            return;
          }

          var data = event.data || {};
          if (data.source !== AUTH_SOURCE || data.type !== 'authorization_response') {
            return;
          }

          if (data.state !== state) {
            cleanup();
            reject(new Error('OAuth state mismatch'));
            return;
          }

          cleanup();
          resolve({
            code: data.code,
            state: state,
            codeVerifier: codeVerifier,
            redirectUri: options.redirectUri,
          });
        }

        global.addEventListener('message', handleMessage);

        timer = global.setInterval(function () {
          if (popup.closed) {
            cleanup();
            reject(new Error('Authentication window closed'));
          }
        }, 500);
      });
    });
  }

  global.VeridexAuth = {
    login: login,
  };
})(window);
