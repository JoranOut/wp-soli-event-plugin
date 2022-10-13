<?php
namespace Soli\VirtualPages;

class TemplateLoader implements TemplateLoaderInterface {
  private $template_dir;

  public function init( PageInterface $page ) {
    $this->template_dir = SOLI_ADMIN__PLUGIN_DIR_PATH.'/inc/templates/';
    $this->templates = wp_parse_args(
      array( 'page.php', 'index.php' ), (array) $page->getTemplate()
    );
  }

  private function locate_plugin_template( $template_names, $load = false, $require_once = true ) {
      $located = '';
      foreach ( (array) $template_names as $template_name ) {
        if ( ! $template_name ) {
          continue;
        }
        if ( file_exists( $this->template_dir . $template_name ) ) {
          $located = $this->template_dir . $template_name;
          break;
        }
      }

      if ( $load && '' != $located ) {
        load_template( $located, $require_once );
      }

      return $located;
    }

  public function load() {
    do_action( 'template_redirect' );
    $template = $this->locate_plugin_template( array_filter( $this->templates ), TRUE );
    $filtered = apply_filters( 'template_include',
      apply_filters( 'virtual_page_template', $template )
    );
    if ( empty( $filtered ) || file_exists( $filtered ) ) {
      $template = $filtered;
    }
    if ( ! empty( $template ) &&file_exists( $template ) ) {
      require_once $template;
    }
  }
}
