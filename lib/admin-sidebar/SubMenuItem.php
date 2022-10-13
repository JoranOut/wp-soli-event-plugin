<?php
namespace Soli\Sidebar;

class SubMenuItem {
  private $title;
  private $link;
  private $active;

  public function __construct($title, $link) {
    $this->title = $title;
    $this->link = $link;
    $this->active = $this->isActive();
  }

  public function show(){
    global $wp_query;
    $url = $wp_query->virtual_page->getUrl();
    $active = $url === $this->link ? "active" : "";

    echo '
        <li class="sidebar-submenu-item '.$active.'">
            <a href="'.$this->link.'">'.$this->title.'</a>
        </li>
    ';
  }

  private function isActive(){
    // TODO add function to determine if page is currently shown
    return false;
  }
}
