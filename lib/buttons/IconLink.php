<?php
namespace Soli\Buttons;

class IconLink {
  private $text;
  private $link;
  private $icon;

  public function __construct($text, $link, $icon) {
    $this->text = $text;
    $this->link = $link;
    $this->icon = $icon;
  }

  public function toString(){
    return '
        <a class="icon-link" href="'.$this->link.'">
            <img src="'.$this->icon.'" class="grey-filter">
            <p>'.$this->text.'</p>            
        </a>
    ';
  }

  public function show(){
    echo $this->toString();
  }
}
