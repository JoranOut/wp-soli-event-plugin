<?php

/*
  Description: Featured-image block for the soli_event single-event template.
  Renders the event's post thumbnail with an optional caption overlay.
*/
if ( ! defined( 'ABSPATH' ) ) exit;

class SoliBlockFeaturedImage {
    function __construct() {
        add_action( 'init', array( $this, 'registerBlock' ) );
    }

    private function assetVersion( $file ) {
        $path = plugin_dir_path( __FILE__ ) . $file;
        return file_exists( $path ) ? filemtime( $path ) : SOLI_EVENT__PLUGIN_VERSION;
    }

    function registerBlock() {
        $asset_file = plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
        $asset      = file_exists( $asset_file ) ? include $asset_file : array(
            'dependencies' => array( 'wp-blocks', 'wp-element', 'wp-block-editor' ),
            'version'      => $this->assetVersion( 'build/index.js' ),
        );

        wp_register_style(
            'block-featured-image-css',
            plugin_dir_url( __FILE__ ) . 'build/index.css',
            array(),
            $this->assetVersion( 'build/index.css' )
        );
        wp_register_script(
            'block-featured-image-js',
            plugin_dir_url( __FILE__ ) . 'build/index.js',
            $asset['dependencies'],
            $asset['version'],
            true
        );

        register_block_type( 'soli/featured-image', array(
            'editor_script'   => 'block-featured-image-js',
            'editor_style'    => 'block-featured-image-css',
            'render_callback' => array( $this, 'theHTML' ),
            'supports'        => array(
                'align' => array( 'full', 'wide' ),
                'html'  => false,
            ),
            'attributes'      => array(
                'caption'    => array( 'type' => 'string', 'default' => '' ),
                'aspectRatio' => array( 'type' => 'string', 'default' => '16/9' ),
            ),
        ) );

        wp_set_script_translations( 'block-featured-image-js', 'soli-event', SOLI_EVENT__PLUGIN_DIR_PATH . 'languages' );
    }

    function theHTML( $attributes ) {
        $post_id = get_the_ID();
        if ( ! $post_id || ! has_post_thumbnail( $post_id ) ) {
            if ( current_user_can( 'edit_posts' ) ) {
                return sprintf(
                    '<div class="soli-featured-image soli-featured-image--empty"><p>%s</p></div>',
                    esc_html__( 'No featured image set for this event.', 'soli-event' )
                );
            }
            return '';
        }

        $caption     = isset( $attributes['caption'] ) ? $attributes['caption'] : '';
        $aspect      = isset( $attributes['aspectRatio'] ) ? $attributes['aspectRatio'] : '16/9';
        $wrapper     = get_block_wrapper_attributes( array( 'class' => 'soli-featured-image' ) );
        $img         = get_the_post_thumbnail( $post_id, 'full', array( 'class' => 'soli-featured-image__img' ) );

        ob_start(); ?>
        <figure <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> style="aspect-ratio:<?php echo esc_attr( $aspect ); ?>">
            <?php echo $img; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — get_the_post_thumbnail returns escaped output ?>
            <?php if ( $caption ) : ?>
                <figcaption class="soli-featured-image__caption"><?php echo esc_html( $caption ); ?></figcaption>
            <?php endif; ?>
        </figure>
        <?php return ob_get_clean();
    }
}

$soli_block_featured_image = new SoliBlockFeaturedImage();
