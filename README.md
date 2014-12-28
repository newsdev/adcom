# [Adcom](http://newsdev.github.io/adcom/)
[![Bower version](https://badge.fury.io/bo/adcom.svg)](http://badge.fury.io/bo/adcom)

Adcom is a package of jQuery plugins for making admin development easier, created by [Michael Strickland](https://twitter.com/moriogawa) and developed by the [Interactive News](https://github.com/newsdev) department at [The New York Times](https://github.com/nytimes).

The full user and development guide is available at <https://newsdev.github.io/adcom>.

## Table of contents

- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Versioning](#versioning)
- [Contact](#contact)
- [Special thanks](#special-thanks)
- [Copyright and license](#copyright-and-license)

## Quick start

Three quick start options are available:

- [Download the latest release](https://github.com/newsdev/adcom/archive/v0.1.0.zip).
- Clone the repo: `git clone https://github.com/newsdev/adcom.git`.
- Install with [Bower](http://bower.io): `bower install adcom`.

Read the [Getting started page](https://newsdev.github.io/adcom/getting-started/) for information on the contents and how to use.

### What's included

Within the download you'll find the following directories and files, logically grouping common assets and providing both compiled and minified variations. You'll see something like this:

```
adcom/
├── css/
│   ├── adcom.css
│   └── adcom.min.css
└── js/
    ├── adcom.js
    └── adcom.min.js
```

We provide compiled CSS and JS (`adcom.*`), as well as compiled and minified CSS and JS (`adcom.min.*`).



## Documentation

Adcom's documentation, included in this repo on the github-pages branch, is built with [Jekyll](http://jekyllrb.com) and publicly hosted on GitHub Pages at <https://newsdev.github.io/adcom>. The docs may also be run locally.

### Running documentation locally

1. If necessary, [install Jekyll](http://jekyllrb.com/docs/installation) (requires v2.3.x).
  - **Windows users:** Read [this unofficial guide](http://jekyll-windows.juthilo.com/) to get Jekyll up and running without problems.
2. Install the Ruby-based syntax highlighter, [Rouge](https://github.com/jneen/rouge), with `gem install rouge`.
3. From the root `/adcom` directory, run `jekyll serve` in the command line.
4. Open <http://localhost:9001> in your browser, and voilà.

Learn more about using Jekyll by reading its [documentation](http://jekyllrb.com/docs/home/).



## Versioning

For transparency into our release cycle and in striving to maintain backward compatibility, Adcom is maintained under [the Semantic Versioning guidelines](http://semver.org/).



## Contact

Our Github [issue tracker](https://github.com/newsdev/adcom/issues) is the preferred method for logging requests or bug reports.



## Special thanks

Tremendous thanks to the Bootstrap team and community for developing many of the patterns in Bootstrap that are used in Adcom's source code and organization. Thanks as well for creating the documentation that we used to bootstrap our own.



## Copyright and license

Code and documentation copyright 2014 The New York Times Company. Code released under [the MIT license](LICENSE). Docs released under [Creative Commons](docs/LICENSE). Adcom is not affiliated with Bootstrap or Twitter.

Code and documentation adapted from [Twitter Bootstrap](https://github.com/twbs/bootstrap), copyright 2011-2014 Twitter, Inc., and released under [the MIT license](LICENSE) and [Creative Commons](docs/LICENSE) respectively.

