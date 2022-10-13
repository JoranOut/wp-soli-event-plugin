<?php
namespace Soli\Sidebar;

require_once SOLI_ADMIN__PLUGIN_DIR_PATH.'/lib/buttons/IconLink.php';
use Soli\Buttons;

class MenuItem {
  private $title;
  private $link;
  private $active;
  private $icon;
  private $subMenuItems = array();

  public function __construct($title, $link, $icon) {
    $this->title = $title;
    $this->link = $link;
    $this->icon = $icon;
    $this->active = $this->isActive();
  }

  public function addSubMenuItem(SubMenuItem $subMenuItem){
    $this->subMenuItems[] = $subMenuItem;
  }

  public function show(){
    global $wp_query;
    $url = $wp_query->virtual_page->getUrl();

    $active = $url === $this->link
              || (sizeof(explode("/",$url)) >= 3
                  && sizeof(explode("/",$this->link)) >= 3
                  && explode("/",$url)[2]
                      === explode("/",$this->link)[2])
              ? "active" : "";
    echo '<ul class="sidebar-menu-item '.$active.'">';
    (new Buttons\IconLink($this->title,$this->link,$this->icon))->show();
    foreach ($this->subMenuItems as $subMenuItem){
      $subMenuItem->show();
    }
    echo '</ul>';
  }

  private function isActive(){
    // TODO add function to determine if page is currently shown
    return false;
  }
}
