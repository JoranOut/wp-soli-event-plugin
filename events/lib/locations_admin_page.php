<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit;

/**
 * Events > Locations: full CRUD on the external venues in wp_event_location.
 *
 * The create-event block only searches and creates locations; editing and
 * deleting happen here, because a location is shared by every event date that
 * points at it. Gated on SOLI_EVENT_LOCATIONS_CAP (edit_others_posts), see
 * event_capability.php.
 */

const SOLI_EVENT_LOCATIONS_PAGE = 'soli_event_locations';

function soli_events_locations_page_url($args = array()) {
  return add_query_arg(
    array_merge(array('post_type' => 'soli_event', 'page' => SOLI_EVENT_LOCATIONS_PAGE), $args),
    admin_url('edit.php')
  );
}

add_action('admin_menu', 'Soli\Events\soli_events_add_locations_page');
function soli_events_add_locations_page() {
  add_submenu_page(
    'edit.php?post_type=soli_event',
    __('Locations', 'soli-event'),
    __('Locations', 'soli-event'),
    SOLI_EVENT_LOCATIONS_CAP,
    SOLI_EVENT_LOCATIONS_PAGE,
    'Soli\Events\soli_events_render_locations_page',
    3
  );
}

function soli_events_render_locations_page() {
  if (!current_user_can(SOLI_EVENT_LOCATIONS_CAP)) {
    wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'soli-event'));
  }

  $handler = new LocationTableHandler();
  $action = isset($_GET['action']) ? sanitize_key($_GET['action']) : '';
  $editing = null;
  if ($action === 'edit' && isset($_GET['id'])) {
    $editing = $handler->getLocationById(absint($_GET['id']));
  }

  echo '<div class="wrap">';
  echo '<h1 class="wp-heading-inline">' . esc_html__('Locations', 'soli-event') . '</h1>';
  if ($editing) {
    echo ' <a href="' . esc_url(soli_events_locations_page_url()) . '" class="page-title-action">'
      . esc_html__('Add New Location', 'soli-event') . '</a>';
  }
  echo '<hr class="wp-header-end">';
  echo '<p>' . esc_html__('External venues for event dates. A location is shared: changing it changes every event date it is assigned to, and a location that is still in use cannot be deleted.', 'soli-event') . '</p>';

  soli_events_render_locations_notice();

  echo '<div id="col-container" class="wp-clearfix">';
  echo '<div id="col-left"><div class="col-wrap">';
  soli_events_render_location_form($editing);
  echo '</div></div>';
  echo '<div id="col-right"><div class="col-wrap">';
  soli_events_render_locations_table($handler->getAllLocationsWithUsage(), $editing ? (int) $editing['id'] : 0);
  echo '</div></div>';
  echo '</div>';
  echo '</div>';
}

function soli_events_render_locations_notice() {
  if (!isset($_GET['message'])) {
    return;
  }
  $messages = array(
    'created' => array('success', __('Location added.', 'soli-event')),
    'updated' => array('success', __('Location updated.', 'soli-event')),
    'deleted' => array('success', __('Location deleted.', 'soli-event')),
    'in_use'  => array('error', __('This location is still assigned to one or more event dates and cannot be deleted.', 'soli-event')),
    'invalid' => array('error', __('Name and address are both required.', 'soli-event')),
    'missing' => array('error', __('That location no longer exists.', 'soli-event')),
  );
  $key = sanitize_key($_GET['message']);
  if (!isset($messages[$key])) {
    return;
  }
  list($type, $text) = $messages[$key];
  echo '<div class="notice notice-' . esc_attr($type) . ' is-dismissible soli-locations-notice"><p>' . esc_html($text) . '</p></div>';
}

function soli_events_render_location_form($editing) {
  $is_edit = !empty($editing);
  ?>
  <div class="form-wrap">
    <h2><?php echo $is_edit ? esc_html__('Edit Location', 'soli-event') : esc_html__('Add New Location', 'soli-event'); ?></h2>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="soli-location-form">
      <input type="hidden" name="action" value="soli_event_save_location">
      <input type="hidden" name="id" value="<?php echo $is_edit ? esc_attr($editing['id']) : ''; ?>">
      <?php wp_nonce_field('soli_event_save_location'); ?>
      <div class="form-field form-required">
        <label for="soli-location-name"><?php esc_html_e('Name', 'soli-event'); ?></label>
        <input type="text" id="soli-location-name" name="name" required
               value="<?php echo $is_edit ? esc_attr($editing['name']) : ''; ?>">
      </div>
      <div class="form-field form-required">
        <label for="soli-location-address"><?php esc_html_e('Address', 'soli-event'); ?></label>
        <textarea id="soli-location-address" name="address" rows="3" required><?php echo $is_edit ? esc_textarea($editing['address']) : ''; ?></textarea>
        <p><?php esc_html_e('Used to place the venue on the event map, so keep it complete: street, number, postal code and town.', 'soli-event'); ?></p>
      </div>
      <p class="submit">
        <?php submit_button($is_edit ? __('Update Location', 'soli-event') : __('Add New Location', 'soli-event'), 'primary', 'submit', false); ?>
        <?php if ($is_edit) : ?>
          <a href="<?php echo esc_url(soli_events_locations_page_url()); ?>" class="button"><?php esc_html_e('Cancel', 'soli-event'); ?></a>
        <?php endif; ?>
      </p>
    </form>
  </div>
  <?php
}

function soli_events_render_locations_table($locations, $editing_id) {
  echo '<table class="wp-list-table widefat fixed striped soli-locations-table">';
  echo '<thead><tr>';
  echo '<th style="width:30%">' . esc_html__('Name', 'soli-event') . '</th>';
  echo '<th>' . esc_html__('Address', 'soli-event') . '</th>';
  echo '<th style="width:12%">' . esc_html__('Event dates', 'soli-event') . '</th>';
  echo '</tr></thead><tbody>';

  if (empty($locations)) {
    echo '<tr><td colspan="3">' . esc_html__('No locations yet.', 'soli-event') . '</td></tr>';
  }

  foreach ($locations as $location) {
    $id = (int) $location['id'];
    $usage = (int) $location['usage_count'];
    $edit_url = soli_events_locations_page_url(array('action' => 'edit', 'id' => $id));
    $delete_url = wp_nonce_url(
      add_query_arg(array('action' => 'soli_event_delete_location', 'id' => $id), admin_url('admin-post.php')),
      'soli_event_delete_location_' . $id
    );

    echo '<tr' . ($id === $editing_id ? ' class="soli-location-editing"' : '') . ' data-location-id="' . esc_attr($id) . '">';
    echo '<td class="column-primary"><strong><a href="' . esc_url($edit_url) . '">' . esc_html($location['name']) . '</a></strong>';
    echo '<div class="row-actions">';
    echo '<span class="edit"><a href="' . esc_url($edit_url) . '">' . esc_html__('Edit', 'soli-event') . '</a></span>';
    if ($usage === 0) {
      echo ' | <span class="delete"><a href="' . esc_url($delete_url) . '" class="submitdelete" onclick="return confirm(\''
        . esc_js(__('Delete this location?', 'soli-event')) . '\');">' . esc_html__('Delete', 'soli-event') . '</a></span>';
    }
    echo '</div></td>';
    echo '<td>' . nl2br(esc_html((string) $location['address'])) . '</td>';
    echo '<td>' . esc_html($usage) . '</td>';
    echo '</tr>';
  }

  echo '</tbody></table>';
}

add_action('admin_post_soli_event_save_location', 'Soli\Events\soli_events_handle_save_location');
function soli_events_handle_save_location() {
  if (!current_user_can(SOLI_EVENT_LOCATIONS_CAP)) {
    wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'soli-event'), 403);
  }
  check_admin_referer('soli_event_save_location');

  $id = isset($_POST['id']) ? absint($_POST['id']) : 0;
  $name = isset($_POST['name']) ? sanitize_text_field(wp_unslash($_POST['name'])) : '';
  $address = isset($_POST['address']) ? sanitize_textarea_field(wp_unslash($_POST['address'])) : '';

  if ($name === '' || $address === '') {
    wp_safe_redirect(soli_events_locations_page_url(
      $id ? array('action' => 'edit', 'id' => $id, 'message' => 'invalid') : array('message' => 'invalid')
    ));
    exit;
  }

  $handler = new LocationTableHandler();
  if ($id && !$handler->getLocationById($id)) {
    wp_safe_redirect(soli_events_locations_page_url(array('message' => 'missing')));
    exit;
  }

  $handler->saveLocation((object) array('id' => $id, 'name' => $name, 'address' => $address));
  wp_safe_redirect(soli_events_locations_page_url(array('message' => $id ? 'updated' : 'created')));
  exit;
}

add_action('admin_post_soli_event_delete_location', 'Soli\Events\soli_events_handle_delete_location');
function soli_events_handle_delete_location() {
  if (!current_user_can(SOLI_EVENT_LOCATIONS_CAP)) {
    wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'soli-event'), 403);
  }
  $id = isset($_GET['id']) ? absint($_GET['id']) : 0;
  check_admin_referer('soli_event_delete_location_' . $id);

  $handler = new LocationTableHandler();
  if (!$handler->getLocationById($id)) {
    $message = 'missing';
  } elseif ($handler->countUsage($id) > 0) {
    $message = 'in_use';
  } else {
    $message = $handler->deleteLocation($id) ? 'deleted' : 'missing';
  }
  wp_safe_redirect(soli_events_locations_page_url(array('message' => $message)));
  exit;
}
