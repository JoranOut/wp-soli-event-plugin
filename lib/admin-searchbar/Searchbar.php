<?php
namespace Soli\Searchbar;

class Searchbar {
  public $placeholder;

  public function __construct() {
    $this->placeholder = "Search...";
  }

  public function show(){
    return '
        <div class="searchbar">
            <input placeholder="'.$this->placeholder.'">
        </div>
    ';
  }
}
