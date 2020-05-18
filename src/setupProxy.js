const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(proxy('/auth', { target: 'https://light.oknosoft.ru/' }));
  //app.use(proxy('/couchdb', { target: 'http://localhost:3016/' }));
};
