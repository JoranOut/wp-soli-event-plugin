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
                where post_type = 'page' and id > %d
                and (post_status = 'draft' or post_status = 'publish')
                order by post_date asc", 0);
            $pages = $wpdb->get_results($query, ARRAY_A);

            for ($i = 0; $i < sizeof($pages); $i++){
              $pages[$i]["access"]="Klein orkest | Funband | Stil Orkest";
            }

            $columns = ["#","Titel","Auteur", "Datum", "Access"];
            $data_items = ["ID", "post_title", "post_author", "post_date", "access"];

            $table = new Table\Table($columns, $data_items, $pages);

            echo '<h2>' . sizeof($pages) . ' Pagina\'s</h2>';
            echo '<div class="table-options">'. (new Buttons\IconLink(
                    "nieuwe pagina",
                    "/wp-admin/post-new.php?post_type=page",
                    SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/add%20circle.svg"
              ))->toString().'</div>';

            $table->show();
          ?>
      </section>
  </main>
<div>

<?php
  wp_footer();
?>
