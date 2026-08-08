<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

/**
 * Links event categories to "onderdelen" (orchestras/groups) in the Soli
 * administration (laravel-soli-administration).
 *
 * At SSO login the passport plugin stores the user's group memberships in the
 * 'soli_passport_assignments' user meta; each entry only carries the numeric
 * onderdeel_id of a group, never its name. That id is opaque to WordPress, so
 * an editor maps it once per category via a field on the category add/edit
 * screens (term meta 'soli_event_onderdeel_id'). The my-groups block resolves
 * user -> onderdeel ids -> categories through this class.
 */
class CategoryOnderdeel {

  const TERM_META_KEY = 'soli_event_onderdeel_id';

  // Written by wp-soli-passport-plugin (Role_Sync::ASSIGNMENTS_META_KEY); read
  // by key so this plugin works without a hard dependency on the passport class.
  const ASSIGNMENTS_META_KEY = 'soli_passport_assignments';

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
     * from something other than the passport assignments meta.
     *
     * @param int[] $ids     Unique onderdeel ids.
     * @param int   $user_id WordPress user id.
     */
    return apply_filters('soli_event_user_onderdeel_ids', $ids, $user_id);
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
