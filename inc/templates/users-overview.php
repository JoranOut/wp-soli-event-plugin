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
            $tablename = $wpdb->prefix . 'users';
            $query = $wpdb->prepare("SELECT id, user_login, display_name, user_email FROM $tablename where id > %d", 0);
            $users = $wpdb->get_results($query, ARRAY_A);

            for ($i = 0; $i < sizeof($users); $i++){
                $users[$i]["ID"]=$users[$i]["id"];
                $users[$i]["type"]="lid";
                $users[$i]["groups"]="Klein orkest | Funband | Stil Orkest";
            }

            $columns = ["#","username","name", "email", "rol", "groepen"];
            $data_items = ["id", "user_login", "display_name", "user_email", "type", "groups"];

            $table = new Table\Table($columns, $data_items, $users);

            echo '<h2>' . sizeof($users) . ' Leden</h2>';

            $table->show();
          ?>
      </section>
  </main>
<div>

<?php
  wp_footer();
?>
