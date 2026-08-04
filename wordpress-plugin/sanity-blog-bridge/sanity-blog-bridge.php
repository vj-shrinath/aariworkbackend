<?php
/**
 * Plugin Name: Sanity Blog Bridge
 * Description: Reads published Sanity posts and renders them in WordPress with shortcodes.
 * Version: 0.1.3
 * Author: Aari Work Designs
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Aari_Sanity_Blog_Bridge {
	const OPTION = 'aari_sanity_blog_bridge_settings';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_shortcode( 'sanity_posts', array( $this, 'posts_shortcode' ) );
		add_shortcode( 'sanity_post', array( $this, 'post_shortcode' ) );
	}

	public function defaults() {
		return array(
			'project_id' => 'lx1zrwct',
			'dataset'    => 'production',
			'api_version'=> '2024-05-16',
			'per_page'   => 10,
		);
	}

	private function settings() {
		return wp_parse_args( get_option( self::OPTION, array() ), $this->defaults() );
	}

	public function admin_menu() {
		add_options_page( 'Sanity Blog Bridge', 'Sanity Blog', 'manage_options', 'aari-sanity-blog', array( $this, 'settings_page' ) );
	}

	public function register_settings() {
		register_setting( 'aari_sanity_blog_bridge', self::OPTION, array( $this, 'sanitize_settings' ) );
	}

	public function sanitize_settings( $input ) {
		return array(
			'project_id'  => sanitize_text_field( $input['project_id'] ?? '' ),
			'dataset'     => sanitize_text_field( $input['dataset'] ?? 'production' ),
			'api_version' => sanitize_text_field( $input['api_version'] ?? '2024-05-16' ),
			'per_page'    => max( 1, min( 50, absint( $input['per_page'] ?? 10 ) ) ),
		);
	}

	public function settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s = $this->settings();
		?>
		<div class="wrap">
			<h1>Sanity Blog Bridge</h1>
			<p>This test plugin reads published posts from Sanity. Create and publish posts in Sanity Studio, then render them with the shortcodes below.</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'aari_sanity_blog_bridge' ); ?>
				<table class="form-table" role="presentation">
					<tr><th><label for="sanity-project-id">Project ID</label></th><td><input id="sanity-project-id" name="<?php echo esc_attr( self::OPTION ); ?>[project_id]" value="<?php echo esc_attr( $s['project_id'] ); ?>" class="regular-text" /></td></tr>
					<tr><th><label for="sanity-dataset">Dataset</label></th><td><input id="sanity-dataset" name="<?php echo esc_attr( self::OPTION ); ?>[dataset]" value="<?php echo esc_attr( $s['dataset'] ); ?>" class="regular-text" /></td></tr>
					<tr><th><label for="sanity-api-version">API version</label></th><td><input id="sanity-api-version" name="<?php echo esc_attr( self::OPTION ); ?>[api_version]" value="<?php echo esc_attr( $s['api_version'] ); ?>" class="regular-text" /></td></tr>
					<tr><th><label for="sanity-per-page">Posts per page</label></th><td><input id="sanity-per-page" type="number" min="1" max="50" name="<?php echo esc_attr( self::OPTION ); ?>[per_page]" value="<?php echo esc_attr( $s['per_page'] ); ?>" /></td></tr>
				</table>
				<?php submit_button(); ?>
			</form>
			<h2>Shortcodes</h2>
			<code>[sanity_posts]</code>
			<p>Optional attributes: <code>count="5" category="news"</code></p>
			<code>[sanity_post slug="your-post-slug"]</code>
		</div>
		<?php
	}

	private function query( $groq, $params = array(), $cache_key = '' ) {
		$s = $this->settings();
		if ( empty( $s['project_id'] ) || empty( $s['dataset'] ) ) {
			return new WP_Error( 'sanity_config', 'Sanity Project ID and Dataset are required.' );
		}

		$cache_key = 'aari_sanity_' . md5( $cache_key . $groq . wp_json_encode( $params ) );
		$cached = get_transient( $cache_key );
		if ( false !== $cached ) {
			return $cached;
		}

		$api_version = ltrim( trim( $s['api_version'] ), '/' );
		if ( 0 !== strpos( $api_version, 'v' ) ) {
			$api_version = 'v' . $api_version;
		}
		$url = sprintf( 'https://%s.api.sanity.io/%s/data/query/%s', rawurlencode( $s['project_id'] ), rawurlencode( $api_version ), rawurlencode( $s['dataset'] ) );
		// Encode the complete GROQ query. In particular, GROQ uses &&, which
		// must not be treated as URL parameter separators by WordPress/PHP.
		$url .= '?' . http_build_query( array( 'query' => $groq ) + $params, '', '&', PHP_QUERY_RFC3986 );
		$response = wp_safe_remote_get( $url, array( 'timeout' => 10, 'headers' => array( 'Accept' => 'application/json' ) ) );
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'sanity_http', 'Sanity connection failed: ' . $response->get_error_message() );
		}
		$code = wp_remote_retrieve_response_code( $response );
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $code < 200 || $code >= 300 || ! is_array( $data ) || isset( $data['error'] ) ) {
			$body = wp_strip_all_tags( wp_remote_retrieve_body( $response ) );
			$body = function_exists( 'mb_substr' ) ? mb_substr( $body, 0, 300 ) : substr( $body, 0, 300 );
			return new WP_Error( 'sanity_api', sprintf( 'Sanity API request failed (HTTP %d): %s', absint( $code ), $body ) );
		}
		$result = $data['result'] ?? array();
		set_transient( $cache_key, $result, 5 * MINUTE_IN_SECONDS );
		return $result;
	}

	public function posts_shortcode( $atts ) {
		if ( ! empty( $_GET['sanity_post'] ) ) {
			return $this->post_shortcode( array( 'slug' => sanitize_title( wp_unslash( $_GET['sanity_post'] ) ) ) );
		}
		$s = $this->settings();
		$atts = shortcode_atts( array( 'count' => $s['per_page'], 'category' => '' ), $atts, 'sanity_posts' );
		$count = max( 1, min( 50, absint( $atts['count'] ) ) );
		$filter = '(_type == "post" && defined(publishedAt))';
		$params = array( 'limit' => (string) $count );
		if ( '' !== trim( $atts['category'] ) ) {
			$filter .= ' && $category in categories[]->slug.current';
			$params['category'] = sanitize_title( $atts['category'] );
		}
		$query = '*[' . $filter . '] | order(publishedAt desc)[0...$limit]{_id,title,excerpt,"slug": slug.current,publishedAt,mainImage,author->{name}}';
		$posts = $this->query( $query, $params, 'posts' );
		if ( is_wp_error( $posts ) ) {
			return current_user_can( 'manage_options' ) ? '<p>' . esc_html( $posts->get_error_message() ) . '</p>' : '';
		}
		if ( empty( $posts ) ) {
			return '<p>No published posts found.</p>';
		}
		$out = '<div class="sanity-posts">';
		foreach ( $posts as $post ) {
			$out .= '<article class="sanity-post-card">';
			if ( ! empty( $post['mainImage'] ) ) {
				$out .= '<img loading="lazy" src="' . esc_url( $this->image_url( $post['mainImage'], 900 ) ) . '" alt="' . esc_attr( $post['title'] ?? '' ) . '" />';
			}
			$out .= '<h2>' . esc_html( $post['title'] ?? '' ) . '</h2>';
			$out .= '<p>' . esc_html( wp_trim_words( $post['excerpt'] ?? '', 35 ) ) . '</p>';
			$out .= '<p><a href="' . esc_url( add_query_arg( 'sanity_post', rawurlencode( $post['slug'] ?? '' ) ) ) . '">Read more</a></p>';
			$out .= '</article>';
		}
		return $out . '</div>';
	}

	public function post_shortcode( $atts ) {
		$atts = shortcode_atts( array( 'slug' => '' ), $atts, 'sanity_post' );
		$slug = sanitize_title( $atts['slug'] );
		if ( ! $slug ) {
			return '<p>Provide a Sanity post slug.</p>';
		}
		$query = '*[_type == "post" && slug.current == $slug && defined(publishedAt)][0]{title,excerpt,body,mainImage,publishedAt,author->{name}}';
		$post = $this->query( $query, array( 'slug' => $slug ), 'post_' . $slug );
		if ( is_wp_error( $post ) || empty( $post ) ) {
			return is_wp_error( $post ) && current_user_can( 'manage_options' ) ? '<p>' . esc_html( $post->get_error_message() ) . '</p>' : '<p>Post not found.</p>';
		}
		$out = '<article class="sanity-post">';
		$out .= '<h1>' . esc_html( $post['title'] ?? '' ) . '</h1>';
		if ( ! empty( $post['mainImage'] ) ) {
			$out .= '<img src="' . esc_url( $this->image_url( $post['mainImage'], 1400 ) ) . '" alt="' . esc_attr( $post['title'] ?? '' ) . '" />';
		}
		$out .= $this->portable_text( $post['body'] ?? array() );
		return $out . '</article>';
	}

	private function image_url( $image, $width ) {
		$ref = is_array( $image ) ? ( $image['asset']['_ref'] ?? '' ) : '';
		if ( ! preg_match( '/^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/i', $ref, $m ) ) {
			return '';
		}
		$s = $this->settings();
		return sprintf( 'https://cdn.sanity.io/images/%s/%s/%s.%s?w=%d&auto=format', rawurlencode( $s['project_id'] ), rawurlencode( $s['dataset'] ), $m[1] . '-' . $m[2], $m[3], absint( $width ) );
	}

	private function portable_text( $blocks ) {
		$out = '';
		if ( ! is_array( $blocks ) ) return $out;
		foreach ( $blocks as $block ) {
			if ( ( $block['_type'] ?? '' ) !== 'block' ) continue;
			$text = '';
			foreach ( ( $block['children'] ?? array() ) as $child ) {
				$text .= esc_html( $child['text'] ?? '' );
			}
			$style = $block['style'] ?? 'normal';
			$tag = in_array( $style, array( 'h2', 'h3', 'h4', 'blockquote' ), true ) ? $style : 'p';
			$out .= '<' . $tag . '>' . nl2br( $text ) . '</' . $tag . '>';
		}
		return $out;
	}
}

new Aari_Sanity_Blog_Bridge();
