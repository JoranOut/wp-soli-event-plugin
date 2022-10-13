<?php
namespace Soli\Applications;

class Application {
  private $icon;
  private $link;
  private $text;

  public function __construct($icon, $text, $link) {
    $this->icon = $icon;
    $this->link = $link;
    $this->text = $text;
  }

  public function show(){
    return '
        <a href="'.$this->link.'">
            <img src="'.$this->icon.'" class="grey-filter"/>
            <p>'.$this->text.'</p>
        </a>
    ';
  }
}
