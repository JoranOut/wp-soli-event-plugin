[![version](https://img.shields.io/github/package-json/v/JoranOut/wp-soli-event-plugin?label=version&color=3858e9)](https://github.com/JoranOut/wp-soli-event-plugin/releases)
[![nightly](https://img.shields.io/github/v/release/JoranOut/wp-soli-event-plugin?include_prereleases&label=nightly&color=fb8817)](https://github.com/JoranOut/wp-soli-event-plugin/releases)
[![tested up to](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.wordpress.org%2Fcore%2Fversion-check%2F1.7%2F&query=%24.offers%5B0%5D.current&label=tested%20up%20to&prefix=WP%20&color=40a8af)](https://wordpress.org/download/releases/)
[![requires](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FJoranOut%2Fwp-soli-event-plugin%2Fmain%2Fpackage.json&query=%24.wordpress.requiresAtLeast&label=requires&prefix=WP%20&color=40a8af)](https://wordpress.org/download/releases/)
[![wp-env](https://img.shields.io/github/package-json/dependency-version/JoranOut/wp-soli-event-plugin/dev/@wordpress/env?label=wp-env&color=40a8af)](https://www.npmjs.com/package/@wordpress/env)
[![node](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FJoranOut%2Fwp-soli-event-plugin%2Fmain%2Fpackage.json&query=%24.engines.node&label=node&color=43853d)](https://nodejs.org)

# WP Soli event plugin
Plugin for wordpress dedicated to displaying events on [soli.nl](https://www.soli.nl)

<!-- Machine-readable markers. publish.js reads the plugin name to name the zip,
     and the release workflows rewrite the version here when packaging a build.
     Kept in a comment because a single tilde renders as strikethrough on GitHub;
     the badges above are the human-readable version. Do not reformat.
~Plugin Name: wp-soli-event-plugin~
~Current Version:1.1.3~
-->


Contains:
- Custom event post-type
- Default template for event post
- Gutenberg Block for registering event
- Gutenberg Block for displaying events in calendar-view
- Gutenberg Block for displaying events in list view

# Development

## WP-ENV
### Install
```cmd
 npm -g install @wordpress/env 
```

### Start
```cmd
 wp-env start [--debug] 
``` 

### Stop
```cmd 
wp-env stop 
```

### WordPress version
`.wp-env.json` pins `core` to an explicit wordpress.org zip rather than a
`WordPress/WordPress` git ref: the git mirror is not guaranteed to carry a tag
for a fresh release (on 2026-08-12 WordPress shipped 7.0.4 without pushing one),
and the zips are published with the release. The pin governs local development
only. CI sets `WP_ENV_CORE` per matrix leg, which wp-env merges last and so
supersedes this pin - that is how the suite runs against both the newest release
and the oldest supported branch (`wordpress.requiresAtLeast` in `package.json`).

To reproduce a CI leg locally, destroy the environment first - downgrading core
under an existing database leaves WordPress demanding a database update and most
admin tests fail on that screen:

```cmd
wp-env destroy
WP_ENV_CORE=https://wordpress.org/wordpress-6.9.7.zip wp-env start
```

## Mysql container
### Login 
```cmd 
mariadb -U -ppassword wordpress 
```

## Localhost
### Front-end
[front-end]( http://localhost:8888/)
### Back-end
[back-end]( http://localhost:8888/wp-admin/) \
username: admin \
password: password

## Configuration
```json
 {
    "env": {
        "site": {
            "plugins": [
                "./wp-soli-admin-plugin",
                "./wp-soli-menu-plugin"
            ]
        },
        "winkel": {
            "plugins": [
                "./event-tickets",
                "./woocommerce",
                "./wp-soli-wc-events",
                "./wp-soli-wc-kindermuziekweek",
                "./mollie-payments-for-woocommerce"
            ]
        }
    }
}
```
