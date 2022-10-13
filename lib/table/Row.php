<?php

namespace Soli\Table;

class Row {
  private $data = array();
  private $data_names = array();
  private $edit_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/edit.svg";
  private $delete_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/delete.svg";
  private $edit_url = '';

  public function __construct($data_names, $data, $edit_url) {
    $this->data_names = $data_names;
    $this->edit_url = $edit_url;
    $this->data = $data;
  }

  public function show() {
    return '
      <tr data-id="'.$this->data["ID"].'">
        '.$this->cells().'       
        <td><div class="edit-tools">'.$this->edit().'</div></td>
      </tr>';
  }

  private function cells(){
    $cells = '';
    for ($i = 0; $i < sizeof($this->data_names); $i++) {
      $cells .= '<td>' . $this->data[$this->data_names[$i]] . '</td>';
    }
    return $cells;
  }

  private function edit() {
    return '
    <a class="edit-row" href="'.sprintf($this->edit_url, $this->data["ID"]).'">
        <img src="'.$this->edit_icon.'" class="grey-filter">        
    </a>
    <a class="delete-row">
        <img src="'.$this->delete_icon.'" class="grey-filter">        
    </a>
    ';
  }
}
