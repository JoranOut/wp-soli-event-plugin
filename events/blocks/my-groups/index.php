<?php

/*
  Description: "My orchestras" panel: the logged-in member's groups (from the SSO assignments) with each group's next upcoming event
*/
if( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SoliBlockMyGroups {
  function __construct() {
    add_action('init', array($this, 'registerBlock'));
  }

  function registerBlock() {
    $asset = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

    wp_register_style('block-my-groups-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_EVENT__PLUGIN_VERSION);
    wp_register_script('block-my-groups-js', plugin_dir_url(__FILE__) . 'build/index.js', $asset['dependencies'], $asset['version'], true);

    register_block_type('soli/my-groups', array(
      'editor_script'   => 'block-my-groups-js',
      'editor_style'    => 'block-my-groups-css',
      'render_callback' => array($this, 'theHTML'),
      'supports'        => array(
        'html' => false,
      ),
      'attributes'      => array(
        'title' => array('type' => 'string', 'default' => __('My orchestras', 'soli-event')),
      ),
    ));

    wp_set_script_translations('block-my-groups-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages');
  }

  // Editor-only note; the front end renders nothing when there is no content.
  private function editorNote($title, $message) {
    if (!current_user_can('edit_posts')) {
      return '';
    }
    return sprintf(
      '<div class="soli-my-groups soli-flat-panel soli-my-groups--empty"><h2 class="soli-flat-panel-title soli-my-groups__title">%s</h2><p>%s</p></div>',
      esc_html($title),
      esc_html($message)
    );
  }

  function theHTML($attributes) {
    wp_enqueue_style('block-my-groups-css');

    $title = isset($attributes['title']) ? $attributes['title'] : __('My orchestras', 'soli-event');

    $user_id = get_current_user_id();
    if (!$user_id) {
      return $this->editorNote($title, __('Shown to logged-in members only: this panel lists the groups from their Soli account.', 'soli-event'));
    }

    $onderdeel_ids   = \Soli\Events\CategoryOnderdeel::getUserOnderdeelIds($user_id);
    $onderdeel_slugs = \Soli\Events\CategoryOnderdeel::getUserOnderdeelSlugs($user_id);
    if (empty($onderdeel_ids) && empty($onderdeel_slugs)) {
      // The preview renders with YOUR account; a member logging in through SSO gets their own groups.
      return $this->editorNote($title, __('Your account has no group assignments from the Soli administration (they sync at SSO login). Members see their own groups here.', 'soli-event'));
    }

    $terms = \Soli\Events\CategoryOnderdeel::getCategoriesForUser($user_id);
    if (empty($terms)) {
      return $this->editorNote($title, __('None of your groups are linked to a category yet. Give the category the same slug as the group in the Soli administration, or set the group ID on the category.', 'soli-event'));
    }

    // One row per group: the category plus its next upcoming visible date.
    // A row links to that event; without an upcoming event it stays unlinked.
    $handler = new \Soli\Events\EventsDatesTableHandler();
    $rows    = array();
    foreach ($terms as $term) {
      $next   = $handler->getNextConcert(array(
        'only_concerts' => false,
        'category_id'   => $term->term_id,
      ));
      $rows[] = array(
        'term' => $term,
        'ts'   => $next ? strtotime($next['start_date']) : null,
        'url'  => $next ? (get_permalink($next['post_id']) ?: '') : '',
      );
    }

    // Soonest event first; groups without an upcoming event last, then by name.
    usort($rows, function ($a, $b) {
      if ($a['ts'] !== $b['ts']) {
        if (null === $a['ts']) return 1;
        if (null === $b['ts']) return -1;
        return $a['ts'] <=> $b['ts'];
      }
      return strcasecmp($a['term']->name, $b['term']->name);
    });

    $wrapper = get_block_wrapper_attributes(array('class' => 'soli-my-groups soli-flat-panel'));

    ob_start(); ?>
    <div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped output ?>>
      <h2 class="soli-flat-panel-title soli-my-groups__title"><?php echo esc_html($title); ?></h2>
      <ul class="soli-orkesten-list soli-my-groups__list">
        <?php foreach ($rows as $row) :
          $term = $row['term'];
          $url  = $row['url'];
          $name = '<span class="soli-ork-name">' . esc_html($term->name) . '</span>';
          $meet = null === $row['ts']
            ? '<span class="soli-ork-meet soli-ork-meet--none">' . esc_html__('no upcoming events', 'soli-event') . '</span>'
            : '<span class="soli-ork-meet soli-ic soli-ic-cal">' . esc_html(sprintf(
                /* translators: 1: date (e.g. "Tue 12 Aug"), 2: time (e.g. "19:30"). */
                _x('%1$s · %2$s', 'group next event: date · time', 'soli-event'),
                date_i18n('D j M', $row['ts']),
                date_i18n('H:i', $row['ts'])
              )) . '</span>';
        ?>
        <li>
          <?php if ($url) : ?>
            <a href="<?php echo esc_url($url); ?>"><?php echo $name . $meet; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above ?></a>
          <?php else : ?>
            <span class="soli-my-groups__row"><?php echo $name . $meet; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above ?></span>
          <?php endif; ?>
        </li>
        <?php endforeach; ?>
      </ul>
    </div>
    <?php return ob_get_clean();
  }
}

$soli_block_my_groups = new SoliBlockMyGroups();
