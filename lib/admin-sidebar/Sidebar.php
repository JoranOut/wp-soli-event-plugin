<?php
namespace Soli\Sidebar;

class Sidebar {
  private $menuItems;

  public function addMenuItem(MenuItem $menuItem){
    $this->menuItems[] = &$menuItem;
  }

  public function show(){
    if (!is_array($this->menuItems)){
      return;
    }
    foreach ($this->menuItems as $menuItem){
      $menuItem->show();
    }
  }
}
