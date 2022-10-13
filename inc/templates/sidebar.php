<?php

require_once __DIR__ . '/../../lib/admin-sidebar/Sidebar.php';
require_once __DIR__ . '/../../lib/admin-sidebar/MenuItem.php';
require_once __DIR__ . '/../../lib/admin-sidebar/SubMenuItem.php';
require_once __DIR__ . '/../../lib/buttons/IconLink.php';

use Soli\Sidebar;
use Soli\Buttons;

$dashboard_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/profits.svg";
$users_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/group.svg";
$news_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/megaphone.svg";
$events_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/calendar.svg";
$pages_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/position%20left.svg";
$tv_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/tv.svg";
$thema_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/brush.svg";
$logout_icon = SOLI_ADMIN__PLUGIN_DIR_URL . "/inc/assets/img/icons/power.svg";

$sidebar = new Sidebar\Sidebar();

$dashboard = new Sidebar\MenuItem("Dashboard", '/admin', $dashboard_icon);
$sidebar->addMenuItem($dashboard);

$users = new Sidebar\MenuItem("Users", "/admin/users/overview", $users_icon);
$users->addSubMenuItem(new Sidebar\SubMenuItem("Overview", "/admin/users/overview"));
$users->addSubMenuItem(new Sidebar\SubMenuItem("Organisation", "/admin/users/organisation"));
$users->addSubMenuItem(new Sidebar\SubMenuItem("Email", "/admin/users/email"));
$sidebar->addMenuItem($users);

$news = new Sidebar\MenuItem("News", "/admin/news", $news_icon);
$sidebar->addMenuItem($news);

$news = new Sidebar\MenuItem("Events", "/admin/events", $events_icon);
$sidebar->addMenuItem($news);

$pages = new Sidebar\MenuItem("Pages", "/admin/pages/overview", $pages_icon);
$pages->addSubMenuItem(new Sidebar\SubMenuItem("Overview", "/admin/pages/overview"));
$pages->addSubMenuItem(new Sidebar\SubMenuItem("Menu", "/admin/pages/menu"));
$sidebar->addMenuItem($pages);

$tv = new Sidebar\MenuItem("TV", "/admin/tv/overview", $tv_icon);
$tv->addSubMenuItem(new Sidebar\SubMenuItem("Overview", "/admin/tv/overview"));
$tv->addSubMenuItem(new Sidebar\SubMenuItem("Settings", "/admin/tv/settings"));
$sidebar->addMenuItem($tv);

$theme = new Sidebar\MenuItem("Theme", "/admin/theme/front-page", $thema_icon);
$theme->addSubMenuItem(new Sidebar\SubMenuItem("Front-page", "/admin/theme/front-page"));
$theme->addSubMenuItem(new Sidebar\SubMenuItem("Standard photos", "/admin/theme/standard-photos"));
$sidebar->addMenuItem($theme);


?>

<div class="sidebar">
    <div class="toggle"></div>
    <?php $sidebar->show(); ?>
    <?php (new Buttons\IconLink("Log out", "", $logout_icon))->show(); ?>
</div>
