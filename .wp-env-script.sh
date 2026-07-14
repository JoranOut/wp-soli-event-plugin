#!/usr/bin/env bash
set -euo pipefail

# Site options
wp option update timezone_string Europe/Amsterdam
wp option delete gmt_offset
wp option update time_format H:i
wp option update date_format "F j, Y"
wp rewrite structure /%postname%/ --hard
wp rewrite flush --hard

# Disable welcome guide for user 1
wp user meta update 1 wp_persistent_preferences \
  '{"core/edit-post":{"welcomeGuide":false}}'

# Disable the periodic "administration email verification" interstitial, which
# otherwise interrupts the post-login redirect and has no admin bar.
wp option update admin_email_lifespan 99999999999
