<?php
function soli_events_register_post_type() {
  $labels = array(
    'name' => 'Events', // Plural name
    'singular_name' => 'Event'   // Singular name
  );

  $supports = array(
    'title',
    'editor',
    'excerpt',
    'author',
    'thumbnail',
    'revisions'
  );

  /*
   * The $args parameter holds important parameters for the custom post type
   */
  $args = array(
    'labels' => $labels,
    'description' => 'Events', // Description
    'supports' => $supports,
    'taxonomies' => array('category', 'post_tag'), // Allowed taxonomies
    'hierarchical' => false, // Allows hierarchical categorization, if set to false, the Custom Post Type will behave like Post, else it will behave like Page
    'public' => true,  // Makes the post type public
    'show_ui' => true,  // Displays an interface for this post type
    'show_in_menu' => true,  // Displays in the Admin Menu (the left panel)
    'show_in_nav_menus' => true,  // Displays in Appearance -> Menus
    'show_in_admin_bar' => true,  // Displays in the black admin bar
    'menu_position' => 5,     // The position number in the left menu
    'menu_icon' => 'dashicons-calendar',  // The URL for the icon used for this post type
    'can_export' => true,  // Allows content export using Tools -> Export
    'has_archive' => true,  // Enables post type archive (by month, date, or year)
    'exclude_from_search' => false, // Excludes posts of this type in the front-end search result page if set to true, include them if set to false
    'publicly_queryable' => true,  // Allows queries to be performed on the front-end part if set to true
    'capability_type' => 'post', // Allows read, edit, delete like “Post”
    'rewrite' => array('slug' => 'evenement'),
    'show_in_rest' => true,
    'template' => [
      [
        'core/group', [],
        [
          ['soli/featured-image', [],],
          ['soli/create-event', [],],
        ],
      ],
    ]
  );

  register_post_type('soli_event', $args); //Create a post type with the slug is ‘product’ and arguments in $args.
}

add_action('init', 'soli_events_register_post_type', 0);

