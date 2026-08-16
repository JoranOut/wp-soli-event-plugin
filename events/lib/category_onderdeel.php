<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

/**
 * Links event categories to "onderdelen" (orchestras/groups) in the Soli
 * administration (laravel-soli-administration).
 *
 * At SSO login the wp-soli-oidc-client-plugin stores the user's group memberships in the
 * 'soli_oidc_assignments' user meta; each entry carries the numeric
 * onderdeel_id plus the group's name and slug. Categories resolve two ways,
 * merged: automatically when the category slug equals the assignment's
 * onderdeel_slug, or via an explicit per-category mapping on the category
 * add/edit screens (term meta 'soli_event_onderdeel_id') for categories whose
 * slug differs from the administration's.
 */
class CategoryOnderdeel {

  const TERM_META_KEY = 'soli_event_onderdeel_id';

  // Written by wp-soli-oidc-client-plugin (Assignments_Sync::META_KEY); read
  // by key so this plugin works without a hard dependency on that class.
  const ASSIGNMENTS_META_KEY = 'soli_oidc_assignments';

  function __construct() {
    add_action('init', array($this, 'registerTermMeta'));
    add_action('category_add_form_fields', array($this, 'renderAddField'));
    add_action('category_edit_form_fields', array($this, 'renderEditField'));
    add_action('created_category', array($this, 'saveField'));
    add_action('edited_category', array($this, 'saveField'));
  }

  function registerTermMeta() {
    register_term_meta('category', self::TERM_META_KEY, array(
      'type'              => 'integer',
      'single'            => true,
      'sanitize_callback' => 'absint',
      'show_in_rest'      => false,
    ));
  }

  function renderAddField() {
    ?>
    <div class="form-field">
      <label for="soli_event_onderdeel_id"><?php esc_html_e('Soli administration group ID', 'soli-event'); ?></label>
      <input name="soli_event_onderdeel_id" id="soli_event_onderdeel_id" type="number" min="1" step="1" value="" />
      <p><?php esc_html_e('The onderdeel-ID of this orchestra/group in the Soli administration. Links SSO group memberships to this category, e.g. for the "My orchestras" block. Leave empty for categories that are not a group.', 'soli-event'); ?></p>
    </div>
    <?php
  }

  function renderEditField($term) {
    $value = absint(get_term_meta($term->term_id, self::TERM_META_KEY, true));
    ?>
    <tr class="form-field">
      <th scope="row"><label for="soli_event_onderdeel_id"><?php esc_html_e('Soli administration group ID', 'soli-event'); ?></label></th>
      <td>
        <input name="soli_event_onderdeel_id" id="soli_event_onderdeel_id" type="number" min="1" step="1" value="<?php echo $value ? esc_attr($value) : ''; ?>" />
        <p class="description"><?php esc_html_e('The onderdeel-ID of this orchestra/group in the Soli administration. Links SSO group memberships to this category, e.g. for the "My orchestras" block. Leave empty for categories that are not a group.', 'soli-event'); ?></p>
      </td>
    </tr>
    <?php
  }

  /**
   * Persist the field from the category add/edit screens. The hooks also fire
   * for programmatic term writes, so only act when the field was submitted.
   * Core already verified the term-management nonce before these hooks run.
   *
   * @param int $term_id The created/edited term id.
   */
  function saveField($term_id) {
    // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified by core on edit-tags.php
    if (!isset($_POST['soli_event_onderdeel_id']) || !current_user_can('manage_categories')) {
      return;
    }

    // phpcs:ignore WordPress.Security.NonceVerification.Missing
    $value = absint(wp_unslash($_POST['soli_event_onderdeel_id']));
    if ($value > 0) {
      update_term_meta($term_id, self::TERM_META_KEY, $value);
    } else {
      delete_term_meta($term_id, self::TERM_META_KEY);
    }
  }

  /**
   * The onderdeel ids of the groups a user belongs to, from the assignments
   * synced at SSO login. Empty for users who never logged in through SSO.
   *
   * @param int $user_id WordPress user id.
   * @return int[] Unique onderdeel ids.
   */
  static function getUserOnderdeelIds($user_id) {
    $assignments = get_user_meta($user_id, self::ASSIGNMENTS_META_KEY, true);

    $ids = array();
    if (is_array($assignments)) {
      foreach ($assignments as $assignment) {
        if (is_array($assignment) && !empty($assignment['onderdeel_id'])) {
          $ids[] = absint($assignment['onderdeel_id']);
        }
      }
    }
    $ids = array_values(array_unique(array_filter($ids)));

    /**
     * Filter the onderdeel ids resolved for a user, e.g. to source memberships
     * from something other than the OIDC assignments meta.
     *
     * @param int[] $ids     Unique onderdeel ids.
     * @param int   $user_id WordPress user id.
     */
    return apply_filters('soli_event_user_onderdeel_ids', $ids, $user_id);
  }

  /**
   * The onderdeel slugs of the groups a user belongs to, from the assignments
   * synced at SSO login. Empty for users who never logged in through SSO or
   * whose assignments predate the provider sending 'onderdeel_slug'.
   *
   * @param int $user_id WordPress user id.
   * @return string[] Unique onderdeel slugs.
   */
  static function getUserOnderdeelSlugs($user_id) {
    $assignments = get_user_meta($user_id, self::ASSIGNMENTS_META_KEY, true);

    $slugs = array();
    if (is_array($assignments)) {
      foreach ($assignments as $assignment) {
        if (is_array($assignment) && !empty($assignment['onderdeel_slug'])) {
          $slugs[] = sanitize_title($assignment['onderdeel_slug']);
        }
      }
    }
    $slugs = array_values(array_unique(array_filter($slugs)));

    /**
     * Filter the onderdeel slugs resolved for a user.
     *
     * @param string[] $slugs   Unique onderdeel slugs.
     * @param int      $user_id WordPress user id.
     */
    return apply_filters('soli_event_user_onderdeel_slugs', $slugs, $user_id);
  }

  /**
   * The categories for a user's groups: categories whose slug matches an
   * assignment's onderdeel_slug, merged with categories explicitly mapped by
   * onderdeel id via term meta.
   *
   * @param int $user_id WordPress user id.
   * @return \WP_Term[] Unique terms, or empty when the user has no assignments.
   */
  static function getCategoriesForUser($user_id) {
    $terms = self::getCategoriesForOnderdeelIds(self::getUserOnderdeelIds($user_id));

    foreach (self::getUserOnderdeelSlugs($user_id) as $slug) {
      $term = get_term_by('slug', $slug, 'category');
      if ($term instanceof \WP_Term) {
        $terms[] = $term;
      }
    }

    $unique = array();
    foreach ($terms as $term) {
      $unique[$term->term_id] = $term;
    }
    return array_values($unique);
  }

  /**
   * The categories mapped to the given onderdeel ids.
   *
   * @param int[] $onderdeel_ids Onderdeel ids from the administration.
   * @return \WP_Term[]
   */
  static function getCategoriesForOnderdeelIds(array $onderdeel_ids) {
    $onderdeel_ids = array_values(array_filter(array_map('absint', $onderdeel_ids)));
    if (empty($onderdeel_ids)) {
      return array();
    }

    $terms = get_terms(array(
      'taxonomy'   => 'category',
      'hide_empty' => false,
      'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
        array(
          'key'     => self::TERM_META_KEY,
          'value'   => $onderdeel_ids,
          'compare' => 'IN',
        ),
      ),
    ));

    return is_wp_error($terms) ? array() : $terms;
  }
}

$soli_event_category_onderdeel = new CategoryOnderdeel();
