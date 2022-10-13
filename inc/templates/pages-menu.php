<?php

require_once __DIR__ . '/../../lib/table/Table.php';
require_once __DIR__ . '/../../lib/admin-header/Header.php';
use Soli\Table;
use Soli\Header;

wp_head();
(new Header\Header())->show();
?>

<div class="container">
  <?php include( plugin_dir_path( __FILE__ ) . 'sidebar.php'); ?>
  <main class="admin-page-content">
      <section>
          <?php
            global $wpdb;
            $tablename = $wpdb->prefix . 'posts';
            $query = $wpdb->prepare("
                SELECT ID, post_parent, post_title
                FROM $tablename 
                where post_type = 'page' and id > %d
                and (post_status = 'draft' or post_status = 'publish')
                order by post_date asc", 0);
            $pages = $wpdb->get_results($query, ARRAY_A);

            $columns = ["#","Parent","Title"];
            $data_items = ["ID", "post_parent", "post_title"];

            $table = new Table\Table($columns, $data_items, $pages);

            echo '<h2>' . sizeof($pages) . ' Pagina\'s</h2>';

            $table->show();


          ?>
      </section>
  </main>
<div>

<?php
  wp_footer();
?>
