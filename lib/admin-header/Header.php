<?php
namespace Soli\Header;

require_once __DIR__.'/../../lib/admin-searchbar/Searchbar.php';
require_once __DIR__ . '/../../lib/application-menu/Menu.php';
require_once __DIR__ . '/../../lib/application-menu/Application.php';
use Soli\Searchbar;
use Soli\Applications;

class Header {
  private $rocket_icon = SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/rocket.svg";
  private $notification_icon = SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/notifications.svg";

  public function __construct() {
  }

  public function show(){
    echo '
      <div class="header">
        <div class="user-box">
          <div class="avatar">A</div>
          <div class="info">
            <h4>Standard Account</h4>
            <p>email@email.nl</p>
          </div>
        </div>'.
        (new Searchbar\Searchbar())->show().'
        <div class="right">
          <div class="notification"><img src="'.$this->notification_icon.'" class="grey-filter"/></div>
          <div class="notification"><img src="'.$this->rocket_icon.'" class="grey-filter"/></div>'.
          (new Applications\Menu())->show().'
        </div>
      </div>
    ';
  }
}




?>


