<?php

namespace Soli\Events;

const SOLI_EVENT_DATES_META_KEY = 'soli_event_dates';

/**
 * Transport meta for event dates.
 *
 * The block editor serializes its pending event dates into this post meta so
 * they travel inside the regular post save request (manual and programmatic
 * saves alike). After WordPress persists the post, the rest_after_insert hook
 * below moves the payload into the custom event_dates table and clears the
 * meta again. The meta is transport only — the event_dates table stays the
 * single source of truth, and Gutenberg's native dirty tracking (Update
 * button, leave-tab warning) now covers event edits for free.
 *
 * Autosaves never touch this: the editor only autosaves title/content/excerpt,
 * so half-edited event state can no longer reach the destructive prune in
 * setDatesAtEvent().
 */
add_action('init', 'Soli\Events\soli_event_register_dates_meta');
function soli_event_register_dates_meta() {
  register_post_meta('soli_event', SOLI_EVENT_DATES_META_KEY, array(
    'type' => 'string',
    'single' => true,
    'default' => '',
    'show_in_rest' => true,
    'revisions_enabled' => false,
    'sanitize_callback' => 'Soli\Events\soli_event_sanitize_dates_meta',
    'auth_callback' => function ($allowed, $meta_key, $post_id) {
      return current_user_can('edit_post', $post_id);
    },
  ));
}

function soli_event_sanitize_dates_meta($value) {
  if (!is_string($value) || $value === '') {
    return '';
  }
  // sanitize_meta receives the already-unslashed value; unslashing again here
  // would corrupt JSON escape sequences (\" or \n inside notes).
  $decoded = json_decode($value);
  return is_array($decoded) ? $value : '';
}

add_action('rest_after_insert_soli_event', 'Soli\Events\soli_event_apply_pending_dates', 10, 1);
function soli_event_apply_pending_dates($post) {
  $json = get_post_meta($post->ID, SOLI_EVENT_DATES_META_KEY, true);
  if (!is_string($json) || $json === '') {
    return;
  }
  // Always clear the transport meta, even when the payload turns out to be
  // invalid: a stale payload must never re-apply on a later, unrelated save.
  delete_post_meta($post->ID, SOLI_EVENT_DATES_META_KEY);

  $dates = json_decode($json);
  if (!is_array($dates)) {
    return;
  }
  soli_event_apply_dates($post->ID, $dates);
}

/**
 * Single write path for event dates: snapshot the stored rows, apply the new
 * set, and record the change in the session-aggregated log. Both the post-save
 * transport meta and the legacy REST endpoint go through here, so every event
 * change is logged no matter which client saved it.
 */
function soli_event_apply_dates($post_id, $dates) {
  $handler = new EventsDatesTableHandler();
  $before = $handler->loadEventDatesFromDb($post_id);
  $result = $handler->setDatesAtEvent($post_id, $dates);
  if ($result === false) {
    return false;
  }
  $after = $handler->loadEventDatesFromDb($post_id);
  (new EventsLogTableHandler())->logChange($post_id, get_current_user_id(), $before, $after);
  return $result;
}
