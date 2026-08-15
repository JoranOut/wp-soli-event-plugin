<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

/**
 * Orchestras are communicated through the category taxonomy, but only the
 * categories nested under the parent category with slug 'orkesten' count.
 * Categories outside that parent (news, generic tags, ...) must never be
 * presented as an orchestra. When the 'orkesten' parent does not exist on a
 * site, no category qualifies at all.
 */
class OrkestenCategories {

  const PARENT_SLUG = 'orkesten';

  // Term ids of every category under the 'orkesten' parent (all depths).
  // Empty array when the parent category does not exist.
  public static function ids() {
    $parent = get_term_by('slug', self::PARENT_SLUG, 'category');
    if (!$parent || is_wp_error($parent)) {
      return array();
    }
    $children = get_term_children($parent->term_id, 'category');
    if (is_wp_error($children)) {
      return array();
    }
    return array_map('intval', $children);
  }

  // Keep only the orchestra categories from a list of WP_Term objects.
  public static function filterTerms($terms) {
    if (empty($terms) || !is_array($terms)) {
      return array();
    }
    $ids = self::ids();
    return array_values(array_filter($terms, function ($term) use ($ids) {
      return in_array((int) $term->term_id, $ids, true);
    }));
  }
}
