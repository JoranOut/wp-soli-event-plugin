<?php

namespace Soli\Table;

require_once SOLI_ADMIN__PLUGIN_DIR_PATH.'/lib/table/Row.php';

class Table {
  private $columns = array();
  private $data = array();
  private $data_names = array();
  public $edit_url = "/wp-admin/post.php?post=%d&action=edit";

  public function __construct($columns, $data_names, $data) {
    $this->columns = $columns;
    $this->data = $data;
    $this->data_names = $data_names;
  }

  public function show() {
    echo '
      <table>
          <thead>
            '.$this->headers().'
            <th></th>
          </thead>
          <tbody>
            '.$this->rows().'
          </tbody>
      </table>
    ';
  }

  private function headers(){
    $headers = '';
    foreach ($this->columns as $col) {
      $headers .= '<th>' . $col . '</th>';
    }
    return $headers;
  }
  private function rows(){
    if (sizeof($this->data) > 0) {
      $rows = '';
      foreach ($this->data as $row) {
        $rows .= (new Row($this->data_names, $row, $this->edit_url))->show();
      }
      return $rows;
    } else {
      return '<tr class="no-content"><td colspan="1000">Geen items gevonden!</td></tr>';
    }
  }
}
