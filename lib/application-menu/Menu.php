<?php
namespace Soli\Applications;

class Menu {
  private $applications = array();
  private $site_icon = SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/web.svg";
  private $webmail_icon = SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/inbox.svg";
  private $planner_icon = SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/add%20event.svg";
  private $QA_icon = SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/add%20event.svg";
  private $sponsorkliks_icon = SOLI_ADMIN__PLUGIN_DIR_URL."/inc/assets/img/icons/scan.svg";

  public function __construct() {
    $site = new Application($this->site_icon, 'Website', '/');
    $this->addApplication($site);
    $email = new Application($this->webmail_icon, 'Webmail', '/roundcube');
    $this->addApplication($email);
    $planner = new Application($this->planner_icon, 'Planner', '/planner');
    $this->addApplication($planner);
    $qa = new Application($this->QA_icon, 'Q&A', '/QA');
    $this->addApplication($qa);
    $sponsorkliks = new Application($this->sponsorkliks_icon, 'Sponsorkliks', '/sponsorkliks');
    $this->addApplication($sponsorkliks);
  }

  public function addApplication(Application $application){
    $this->applications[] = $application;
  }

  public function show(){
    return '
        <div class="applications-menu">
            <div class="wrapper">
              <div class="content">
                  '.$this->showApplications().'       
              </div>
            </div>
        </div>
    ';
  }

  private function showApplications(){
    $application_string = '';
    foreach ($this->applications as $application){
      $application_string .= $application->show();
    }
    return $application_string;
  }
}
