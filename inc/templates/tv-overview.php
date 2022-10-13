<?php

require_once __DIR__ . '/../../lib/table/Table.php';
require_once __DIR__ . '/../../lib/admin-header/Header.php';
require_once __DIR__ . '/../../lib/buttons/IconLink.php';
use Soli\Table;
use Soli\Header;
use Soli\Buttons;

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
                SELECT ID, post_title, post_author, post_date 
                FROM $tablename 
                where post_type = 'tv' and id > %d
                and (post_status = 'draft' or post_status = 'publish')
                order by post_date asc", 0);
            $posts = $wpdb->get_results($query, ARRAY_A);

            for ($i = 0; $i < sizeof($posts); $i++){
              $posts[$i]["access"]="Klein orkest | Funband | Stil Orkest";
            }

            $columns = ["#","Titel","Auteur", "Datum", "Access"];
            $data_items = ["ID", "post_title", "post_author", "post_date", "access"];

            $table = new Table\Table($columns, $data_items, $posts);

            echo '<h2>' . sizeof($posts) . ' TV-berichten</h2>';

            echo '<div class="table-options">'. (new Buttons\IconLink(
              "nieuw tv bericht",
              "/wp-admin/post-new.php?post_type=tv",
              SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/add%20circle.svg"
            ))->toString().'</div>';
            $table->show();
          ?>
      </section>
  </>
<div>

<?php
  wp_footer();
?>
