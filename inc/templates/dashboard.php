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
  <main>
      <section>
      </section>
  </main>
<div>

<?php
  wp_footer();
?>
