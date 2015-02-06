/*
 * Several jQuery plugins for help in dealing with objects
 */

+function ($) {
  'use strict';

  /*
   * Copyright (c) 2013 Wil Moore III
   * Licensed under the MIT license.
   * https://github.com/wilmoore/selectn
   *
   * Adapted to allow property access.
   */
  $.fn.selectn = function (query, object) {
    var parts

    // normalize query to `.property` access (i.e. `a.b[0]` becomes `a.b.0`)
    // allow access to indices[1] and key[properties]
    query = query.replace(/\[([-_\w]+)\]/g, '.$1')
    parts = query.split('.')

    var ref = object || (1, eval)('this'),
        len = parts.length,
        idx = 0

    // iteratively save each segment's reference
    for (; idx < len; idx += 1) {
      if (ref) ref = ref[parts[idx]]
    }

    return ref
  }


  /*
   * jQuery serializeObject - v0.2 - 1/20/2010
   * http://benalman.com/projects/jquery-misc-plugins/
   *
   * Copyright (c) 2010 "Cowboy" Ben Alman
   * Dual licensed under the MIT and GPL licenses.
   * http://benalman.com/about/license/
   */
  $.fn.serializeObject = function () {
    var obj = {}

    $.each( this.serializeArray(), function(i,o){
      var n = o.name,
        v = o.value

        obj[n] = obj[n] === undefined ? v
          : $.isArray( obj[n] ) ? obj[n].concat( v )
          : [ obj[n], v ]
    })

    return obj
  }

}(jQuery);
