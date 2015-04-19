+function (factory) {
  if (typeof define === 'function' && define.amd) {
    define('adcom', [
      'adcom/list',
      'adcom/form',
      'adcom/message',
      'adcom/persist',
      'adcom/session'
    ], factory)
  }
}(function ($) {
  'use strict';
});
