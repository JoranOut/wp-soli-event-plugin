<?php

namespace Soli\Events;

require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
require_once ABSPATH . 'wp-admin/includes/class-wp-posts-list-table.php';

function soli_events_add_admin_log_page() {
  // Add submenu under the 'soli_event' post type menu
  add_submenu_page(
    'edit.php?post_type=soli_event', // Parent slug (links to Events menu)
    'Log View',                   // Page title
    'Log View',                   // Menu title
    'manage_options',               // Capability required to access
    'soli_event_admin_log',        // Menu slug
    'Soli\Events\soli_events_add_admin_log_page_content', // Callback function to render the page
    2
  );
}
add_action('admin_menu', 'Soli\Events\soli_events_add_admin_log_page');

function soli_events_add_admin_log_page_content() {?>
    <div class="wrap">
        <h1><?php echo esc_html__('Log View', 'soli_events'); ?></h1>
        <p><?php echo esc_html__('This page displays all last updated event posts.'); ?></p>

        <?php
        myplugin_logs_page_callback();
        ?>
    </div>
<?php
}

function myplugin_logs_page_callback() {
    if (!current_user_can('manage_options')) {
        wp_die('You do not have sufficient permissions to access this page.');
    }

    // Query posts (example: latest 20 posts)
    $args = [
        'posts_per_page' => 20,
        'post_type' => 'soli_event', // or your CPT slug
        'orderby' => 'modified', // Order by last modified date
        'order' => 'DESC',
    ];
    $posts = get_posts($args);

    echo '<div class="wrap">';
    echo '<table class="wp-list-table widefat fixed striped">';
    echo '<thead><tr>';
    echo '<th>Title</th>';
    echo '<th>Author</th>';
    echo '<th>Updated Date</th>';
    echo '<th>Created Date</th>';
    echo '</tr></thead>';
    echo '<tbody>';

    foreach ($posts as $post) {
        // Get author display name
        $author_id = $post->post_author;
        $author_name = get_the_author_meta('display_name', $author_id);

        // Created date
        $created_date = get_the_date('Y-m-d H:i', $post);

        // Updated date
        $updated_date = get_the_modified_date('Y-m-d H:i', $post);

        echo '<tr>';
        echo '<td><a href="' . get_edit_post_link($post->ID) . '">' . esc_html($post->post_title) . '</a></td>';
        echo '<td>' . esc_html($author_name) . '</td>';
        echo '<td>' . esc_html($updated_date) . '</td>';
        echo '<td>' . esc_html($created_date) . '</td>';
        echo '</tr>';
    }

    echo '</tbody></table>';
    echo '</div>';
}
